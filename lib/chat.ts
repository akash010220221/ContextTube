import { db } from "@/db"
import { chats, messages, videoChunks } from "@/db/schema"
import { getEmbedding, ai } from "./gemini"
import { eq, and, sql } from "drizzle-orm"
import { nanoid } from "nanoid"

/**
 * Retrieve the top relevant chunks from a video's transcript based on query similarity.
 */
export async function getRelevantVideoChunks(
  videoId: string,
  query: string,
  limit: number = 5
): Promise<{ textContent: string; startOffset: number }[]> {
  try {
    const embedding = await getEmbedding(query)
    const serializedEmbedding = `[${embedding.join(",")}]`

    const chunks = await db
      .select({
        textContent: videoChunks.textContent,
        startOffset: videoChunks.startOffset,
      })
      .from(videoChunks)
      .where(eq(videoChunks.videoId, videoId))
      .orderBy(sql`${videoChunks.embedding} <=> ${serializedEmbedding}::vector`)
      .limit(limit)

    return chunks
  } catch (error) {
    console.error(`RAG retrieval failed for video ${videoId}:`, error)
    return []
  }
}

/**
 * Fetch all chat messages for a session ordered chronologically, using a rolling window limit.
 */
export async function getChatHistory(chatId: string, limit: number = 20) {
  const recentMessages = await db
    .select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(sql`${messages.createdAt} desc`)
    .limit(limit)

  return recentMessages.reverse()
}

/**
 * Save a single chat message (user or assistant) to the database.
 */
export async function saveChatMessage(
  chatId: string,
  role: "user" | "assistant" | "system",
  content: string
) {
  const messageId = `msg_${nanoid(12)}`
  await db.insert(messages).values({
    id: messageId,
    chatId,
    role,
    content,
  })
  return messageId
}

/**
 * Initialize a new chat session for a user and a video.
 */
export async function createChatSession(
  userId: string,
  videoId: string,
  firstMessage: string
): Promise<string> {
  const chatId = `chat_${nanoid(12)}`
  const chatTitle =
    firstMessage.substring(0, 60) + (firstMessage.length > 60 ? "..." : "")

  await db.insert(chats).values({
    id: chatId,
    userId,
    videoId,
    title: chatTitle,
  })

  return chatId
}

/**
 * Verify if a chat session exists and belongs to the specified user and video.
 */
export async function verifyChatSession(
  chatId: string,
  userId: string,
  videoId: string
): Promise<boolean> {
  const existingChat = await db
    .select()
    .from(chats)
    .where(
      and(
        eq(chats.id, chatId),
        eq(chats.userId, userId),
        eq(chats.videoId, videoId)
      )
    )
    .limit(1)

  return existingChat.length > 0
}

/**
 * Generate a streaming response from Gemini for the video chat, integrating RAG context and full message history.
 */
export async function getChatResponseStream(
  chatId: string,
  videoId: string,
  message: string
) {
  // 1. Fetch relevant video chunks
  const contextChunks = await getRelevantVideoChunks(videoId, message)
  const contextText = contextChunks
    .map((c) => `[Offset: ${c.startOffset}s] ${c.textContent}`)
    .join("\n")

  // 2. Fetch full history (includes the current user message we just saved)
  const history = await getChatHistory(chatId)

  // 3. Format history for Gemini (excluding the last user query to supply it with system context)
  const chatHistory = history.slice(0, -1).map((msg) => ({
    role: msg.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: msg.content }],
  }))

  const systemPrompt = `You are a helpful, professional video-assistance AI chatbot. Your goal is to answer the user's questions about a YouTube video using the provided video transcript segments.
    
Here are the most relevant segments from the video transcript:
---
${contextText || "No matching transcript segments found."}
---

Rules:
1. Always base your answers on the transcript segments provided above.
2. For EVERY claim or piece of information you cite, you MUST include its citation formatted EXACTLY as "[Offset: Xs]" (where X is the start offset in seconds, e.g., "[Offset: 416s]"). Place this citation at the start of your bullet point or claim, e.g. "* [Offset: 416s] One interviewee emphasizes...". Do NOT use raw timestamps like "06:56" or "06:18" or "⏱️ 06:56" in your text.
3. Keep your response structure clean and readable. Use single-level bullet points rather than deeply nested bullet lists.
4. If the transcript segments do not contain the answer, answer as best as you can based on the video context, but state clearly that the transcript doesn't explicitly mention it.
5. Keep answers friendly, professional, formatted with standard markdown, and concise.`

  // 4. Request streaming generation from Gemini (using gemini-3.6-flash)
  return ai.models.generateContentStream({
    model: "gemini-3.6-flash",
    contents: [
      ...chatHistory,
      {
        role: "user",
        parts: [{ text: message }],
      },
    ],
    config: {
      systemInstruction: systemPrompt,
    },
  })
}
