import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]/route"
import { db } from "@/db"
import { videos, userVideos, videoChunks, chats } from "@/db/schema"
import { extractYoutubeId } from "@/lib/utils"
import { workflowClient } from "@/lib/upstash"
import { eq, and, desc } from "drizzle-orm"
import { fetchYoutubeMetadata } from "@/lib/youtube"
import axios from "axios"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as any).id

    const userVideoList = await db
      .select({
        id: videos.id,
        title: videos.title,
        channelName: videos.channelName,
        durationSeconds: videos.durationSeconds,
        status: videos.status,
        errorMessage: videos.errorMessage,
        createdAt: videos.createdAt,
      })
      .from(userVideos)
      .innerJoin(videos, eq(userVideos.videoId, videos.id))
      .where(eq(userVideos.userId, userId))
      .orderBy(desc(videos.createdAt))

    // Auto-heal empty or placeholder metadata for existing records
    for (const item of userVideoList) {
      if (
        !item.title ||
        item.title === "Untitled Video" ||
        !item.channelName ||
        item.channelName === "Unknown Creator"
      ) {
        try {
          const meta = await fetchYoutubeMetadata(item.id)
          if (
            meta.title !== "Untitled Video" ||
            meta.channelName !== "Unknown Creator"
          ) {
            await db
              .update(videos)
              .set({
                title: meta.title,
                channelName: meta.channelName,
              })
              .where(eq(videos.id, item.id))
            item.title = meta.title
            item.channelName = meta.channelName
          }
        } catch (metaErr) {
          console.error(
            `Failed to auto-heal metadata for video ${item.id}:`,
            metaErr
          )
        }
      }
    }

    return NextResponse.json({ videos: userVideoList })
  } catch (error: any) {
    console.error("Error in GET /api/process-video:", error)
    return NextResponse.json(
      { error: error.message || "Failed to retrieve user videos" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    // 1. Authenticate user session
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as any).id

    // 2. Parse request payload
    const { url } = await request.json()
    if (!url) {
      return NextResponse.json(
        { error: "YouTube URL is required" },
        { status: 400 }
      )
    }

    const videoId = extractYoutubeId(url)
    if (!videoId) {
      return NextResponse.json(
        { error: "Invalid YouTube URL or Video ID" },
        { status: 400 }
      )
    }

    // Fetch metadata (title, creator) from YouTube oEmbed API
    const metadata = await fetchYoutubeMetadata(videoId)

    // 3. Check global cache for the video
    const existingVideo = await db
      .select()
      .from(videos)
      .where(eq(videos.id, videoId))
      .limit(1)

    let shouldTrigger = false

    if (existingVideo.length > 0) {
      const videoStatus = existingVideo[0].status

      // Link video to user's dashboard workspace if not already linked
      const existingUserVideo = await db
        .select()
        .from(userVideos)
        .where(
          and(eq(userVideos.userId, userId), eq(userVideos.videoId, videoId))
        )
        .limit(1)

      if (existingUserVideo.length === 0) {
        await db.insert(userVideos).values({
          userId,
          videoId,
        })
      }

      const isStale =
        videoStatus === "processing" &&
        Date.now() - new Date(existingVideo[0].createdAt).getTime() >
        60 * 60 * 1000

      if (videoStatus === "failed" || isStale) {
        // Reset status for retry, clear error message, and update metadata & createdAt to reset the stale timer
        await db
          .update(videos)
          .set({
            status: "processing",
            title: metadata.title,
            channelName: metadata.channelName,
            errorMessage: null,
            createdAt: new Date(),
          })
          .where(eq(videos.id, videoId))

        // Delete any potentially created chunks to avoid duplicate embedding errors
        await db.delete(videoChunks).where(eq(videoChunks.videoId, videoId))

        shouldTrigger = true
      } else {
        return NextResponse.json({
          videoId,
          status: videoStatus,
          message:
            videoStatus === "processing"
              ? "Video is currently being processed"
              : "Video found in cache",
        })
      }
    } else {
      // 4. If new: Insert record to global videos cache and user workspace with fetched metadata
      await db.insert(videos).values({
        id: videoId,
        title: metadata.title,
        channelName: metadata.channelName,
        status: "processing",
      })

      await db.insert(userVideos).values({
        userId,
        videoId,
      })

      shouldTrigger = true
    }

    if (shouldTrigger) {
      // 5. Trigger asynchronous transcript/vectorization workflow via Upstash Workflow client
      let baseUrl =
       process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.UPSTASH_WORKFLOW_URL
      if (!baseUrl) {
        let host = request.headers.get("host") || "127.0.0.1:3000"
        if (host.includes("localhost") || host.includes("::1")) {
          host = host
            .replace("localhost", "127.0.0.1")
            .replace("[::1]", "127.0.0.1")
            .replace("::1", "127.0.0.1")
        }
        const protocol = request.headers.get("x-forwarded-proto") || "http"
        baseUrl = `${protocol}://${host}`
      }
      const workflowUrl = `${baseUrl.replace(/\/$/, "")}/api/workflow`

      try {
        await workflowClient.trigger({
          url: workflowUrl,
          body: { videoId },
          retries: 3,
          retryDelay: "30",
        })
      } catch (triggerError) {
        console.error(
          "Failed to trigger Upstash workflow via SDK client:",
          triggerError
        )
        // Fallback for local development or sandbox if QStash credentials are incomplete/invalid
        // Trigger via async background HTTP post directly to the API endpoint
        axios.post(workflowUrl, { videoId }).catch((axiosError) => {
          console.error("Direct axios trigger fallback failed:", axiosError)
        })
      }
    }

    return NextResponse.json(
      {
        videoId,
        status: "processing",
        message: "Ingestion pipeline successfully triggered",
      },
      { status: 202 }
    )
  } catch (error: any) {
    console.error("Error in process-video route:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process video ingestion" },
      { status: 500 }
    )
  }
}

// DELETE handler: Unlink video from user's dashboard workspace
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as any).id

    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get("videoId")

    if (!videoId) {
      return NextResponse.json(
        { error: "Video ID is required" },
        { status: 400 }
      )
    }

    // 1. Delete the user's chats associated with this video (cascades to messages)
    await db
      .delete(chats)
      .where(and(eq(chats.userId, userId), eq(chats.videoId, videoId)))

    // 2. Delete the relationship link from user_videos
    await db
      .delete(userVideos)
      .where(
        and(eq(userVideos.userId, userId), eq(userVideos.videoId, videoId))
      )

    return NextResponse.json({
      success: true,
      message: "Video unlinked from user workspace successfully",
    })
  } catch (error: any) {
    console.error("Error in DELETE /api/process-video:", error)
    return NextResponse.json(
      { error: error.message || "Failed to unlink video" },
      { status: 500 }
    )
  }
}
