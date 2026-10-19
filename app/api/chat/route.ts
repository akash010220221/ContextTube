import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]/route"
import { db } from "@/db"
import { chats } from "@/db/schema"
import {
  getChatHistory,
  saveChatMessage,
  createChatSession,
  verifyChatSession,
  getChatResponseStream,
} from "@/lib/chat"
import { eq, and, sql } from "drizzle-orm"

// GET handler: Retrieve chat sessions list OR message history for a specific chat
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as any).id

    const { searchParams } = new URL(request.url)
    const chatId = searchParams.get("chatId")
    const videoId = searchParams.get("videoId")

    // 1. Fetch message history for a specific chat
    if (chatId) {
      const isValid = await verifyChatSession(chatId, userId, videoId || "")

      // Fallback verification if videoId is not supplied in query param
      const hasChat =
        isValid ||
        (
          await db
            .select()
            .from(chats)
            .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
            .limit(1)
        ).length > 0

      if (!hasChat) {
        return NextResponse.json({ error: "Chat not found" }, { status: 404 })
      }

      const chatMessages = await getChatHistory(chatId)
      return NextResponse.json({ messages: chatMessages })
    }

    // 2. Fetch list of chat sessions for a specific video
    if (videoId) {
      const userChats = await db
        .select({
          id: chats.id,
          title: chats.title,
          createdAt: chats.createdAt,
        })
        .from(chats)
        .where(and(eq(chats.videoId, videoId), eq(chats.userId, userId)))
        .orderBy(sql`${chats.createdAt} desc`)

      return NextResponse.json({ chats: userChats })
    }

    return NextResponse.json(
      { error: "Must provide either chatId or videoId" },
      { status: 400 }
    )
  } catch (error: any) {
    console.error("Error in GET /api/chat:", error)
    return NextResponse.json(
      { error: error.message || "Failed to retrieve chat data" },
      { status: 500 }
    )
  }
}

// POST handler: Ask a question (RAG + Streaming Response)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as any).id

    const { videoId, message, chatId: clientChatId } = await request.json()
    if (!videoId || !message) {
      return NextResponse.json(
        { error: "videoId and message are required" },
        { status: 400 }
      )
    }

    // 1. Resolve or initialize chat session
    let chatId = clientChatId
    if (!chatId) {
      // Look for an existing chat session for this user and video to reuse
      const existingChat = await db
        .select()
        .from(chats)
        .where(and(eq(chats.videoId, videoId), eq(chats.userId, userId)))
        .orderBy(sql`${chats.createdAt} desc`)
        .limit(1)

      if (existingChat.length > 0) {
        chatId = existingChat[0].id
      } else {
        chatId = await createChatSession(userId, videoId, message)
      }
    } else {
      const isValid = await verifyChatSession(chatId, userId, videoId)
      if (!isValid) {
        return NextResponse.json(
          { error: "Chat session invalid" },
          { status: 404 }
        )
      }
    }

    // 2. Save the user message to history
    await saveChatMessage(chatId, "user", message)

    // 3. RAG + Request streaming generation from Gemini
    const responseStream = await getChatResponseStream(chatId, videoId, message)

    // 4. Stream response to client and auto-save completed message on finish
    let accumulatedText = ""
    let isSaved = false
    const responseEncoder = new TextEncoder()

    const saveAssistantMessage = async () => {
      if (isSaved) return
      isSaved = true
      if (accumulatedText.trim().length > 0) {
        try {
          await saveChatMessage(chatId, "assistant", accumulatedText)
        } catch (dbError) {
          console.error("Failed to auto-save assistant response:", dbError)
        }
      }
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of responseStream) {
            const text = chunk.text
            if (text) {
              accumulatedText += text
              controller.enqueue(responseEncoder.encode(text))
            }
          }

          await saveAssistantMessage()
          controller.close()
        } catch (streamError) {
          console.error("Error during response streaming:", streamError)
          await saveAssistantMessage()
          controller.error(streamError)
        }
      },
      async cancel(reason) {
        console.log("Stream connection cancelled by client. Reason:", reason)
        await saveAssistantMessage()
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Chat-Id": chatId,
      },
    })
  } catch (error: any) {
    console.error("Error in POST /api/chat:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process chat request" },
      { status: 500 }
    )
  }
}

// DELETE handler: Clear chat session history for a video
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as any).id

    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get("videoId")
    const chatId = searchParams.get("chatId")

    if (!videoId && !chatId) {
      return NextResponse.json(
        { error: "Must provide either videoId or chatId" },
        { status: 400 }
      )
    }

    if (chatId) {
      await db
        .delete(chats)
        .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    } else if (videoId) {
      await db
        .delete(chats)
        .where(and(eq(chats.videoId, videoId), eq(chats.userId, userId)))
    }

    return NextResponse.json({
      success: true,
      message: "Chat cleared successfully",
    })
  } catch (error: any) {
    console.error("Error in DELETE /api/chat:", error)
    return NextResponse.json(
      { error: error.message || "Failed to clear chat history" },
      { status: 500 }
    )
  }
}
