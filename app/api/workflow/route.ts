import { serve } from "@upstash/workflow/nextjs"
import {
  YoutubeTranscriptVideoUnavailableError,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
} from "youtube-transcript"
import { fetchEnglishTranscript } from "@/lib/youtube"
import { getBatchEmbeddings } from "@/lib/gemini"
import { db } from "@/db"
import { videos, videoChunks } from "@/db/schema"
import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"

interface WorkflowPayload {
  videoId: string
}

export const { POST } = serve<WorkflowPayload>(
  async (context) => {
    const { videoId } = context.requestPayload

    // Step 1: Download raw transcript
    const rawTranscript = await context.run("download-transcript", async () => {
      try {
        const transcript = await fetchEnglishTranscript(videoId)

        if (!transcript || transcript.length === 0) {
          throw new YoutubeTranscriptNotAvailableError(videoId)
        }

        // Check if durations are in milliseconds (usually > 100 for a subtitle block)
        const isMs = transcript.some((s: any) => s.duration > 100)

        // Convert the transcript to a serializable raw array of objects with seconds-based start times
        const data = []
        for (const snippet of transcript) {
          data.push({
            text: snippet.text,
            start: isMs ? snippet.offset / 1000 : snippet.offset,
            duration: isMs ? snippet.duration / 1000 : snippet.duration,
          })
        }

        return data
      } catch (error: any) {
        // Differentiate permanent/non-retryable errors from transient errors
        const isPermanent =
          error instanceof YoutubeTranscriptVideoUnavailableError ||
          error instanceof YoutubeTranscriptDisabledError ||
          error instanceof YoutubeTranscriptNotAvailableError ||
          error instanceof YoutubeTranscriptNotAvailableLanguageError ||
          error.message?.includes("No transcripts found") ||
          error.message?.includes("Disabled") ||
          error.message?.includes("Unavailable") ||
          error.message?.includes("not available")

        if (isPermanent) {
          console.warn(
            `Non-retryable transcript error for video ${videoId}:`,
            error.message
          )
          // Set video status to failed with the error message and abort the workflow early
          await db
            .update(videos)
            .set({
              status: "failed",
              errorMessage:
                error.message ||
                "Subtitles/transcripts are not available for this video",
            })
            .where(eq(videos.id, videoId))
          return null // Return null so we can exit early in subsequent steps
        }

        // Re-throw transient errors (e.g. rate limit, network timeout) to let QStash retry the step
        throw error
      }
    })

    // If step 1 returned null (permanent error occurred), terminate the workflow run cleanly
    if (rawTranscript === null) {
      console.log(
        `Aborting workflow run for video ${videoId} due to non-retryable error`
      )
      return
    }

    // Step 2: Slice transcript into chunks (in-memory, deterministic for replay safety)
    const chunks: { textContent: string; startOffset: number }[] = []
    let currentText = ""
    let currentStart = 0

    // Group transcript snippets into ~500 character chunks to preserve semantic context and limit token count
    for (let i = 0; i < rawTranscript.length; i++) {
      const snippet = rawTranscript[i]
      if (currentText.length === 0) {
        currentStart = Math.floor(snippet.start)
      }

      currentText += (currentText.length > 0 ? " " : "") + snippet.text

      if (currentText.length >= 500 || i === rawTranscript.length - 1) {
        chunks.push({
          textContent: currentText.trim(),
          startOffset: currentStart,
        })
        currentText = ""
      }
    }

    // Step 3: Embed and insert chunks in batches of 50 (prevents QStash message payload limit issues and respects Gemini RPM)
    const BATCH_SIZE = 50
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batchIndex = i / BATCH_SIZE
      const chunkBatch = chunks.slice(i, i + BATCH_SIZE)

      await context.run(`embed-and-insert-batch-${batchIndex}`, async () => {
        try {
          // Generate 768-dim embeddings using Gemini gemini-embedding-2
          const texts = chunkBatch.map((c) => c.textContent)
          const embeddings = await getBatchEmbeddings(texts)

          // Map to database schema
          const dbRecords = chunkBatch.map((chunk, index) => ({
            id: `${videoId}_chunk_${i + index}_${nanoid(6)}`,
            videoId,
            textContent: chunk.textContent,
            startOffset: chunk.startOffset,
            embedding: embeddings[index],
          }))

          // Bulk insert records in sub-batches of 50 to respect database driver payload limits
          const INSERT_BATCH_SIZE = 50
          for (let j = 0; j < dbRecords.length; j += INSERT_BATCH_SIZE) {
            const subBatch = dbRecords.slice(j, j + INSERT_BATCH_SIZE)
            await db.insert(videoChunks).values(subBatch)
          }
        } catch (error) {
          console.error(
            `Failed during chunk embedding/insertion batch ${batchIndex}:`,
            error
          )
          throw error
        }
      })

      // Sleep 30s to respect the free-tier embedding rate limit window (100 RPM)
      if (i + BATCH_SIZE < chunks.length) {
        await context.sleep(`sleep-after-batch-${batchIndex}`, 30)
      }
    }

    // Step 4: Finalize video status to completed
    await context.run("db-finalize-completed", async () => {
      try {
        let durationSeconds: number | null = null
        if (rawTranscript && rawTranscript.length > 0) {
          const lastItem = rawTranscript[rawTranscript.length - 1]
          durationSeconds = Math.ceil(lastItem.start + lastItem.duration)
        }

        await db
          .update(videos)
          .set({
            status: "completed",
            durationSeconds,
            errorMessage: null,
          })
          .where(eq(videos.id, videoId))
      } catch (error: any) {
        console.error(`Failed to finalize video status for ${videoId}:`, error)
        throw error
      }
    })
  },
  {
    // failureFunction runs when all retries are exhausted (permanent failures in Step 2 or 3)
    failureFunction: async ({ context, failResponse }) => {
      const { videoId } = context.requestPayload
      console.error(`Workflow failed for video ${videoId}:`, failResponse)
      try {
        await db
          .update(videos)
          .set({
            status: "failed",
            errorMessage:
              failResponse || "Workflow execution failed after maximum retries",
          })
          .where(eq(videos.id, videoId))
      } catch (error) {
        console.error(
          "Failed to mark video as failed in failureFunction:",
          error
        )
      }
    },
  }
)
