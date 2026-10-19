import { db } from "@/db"
import { videos } from "@/db/schema"
import { eq } from "drizzle-orm"
import { notFound } from "next/navigation"
import { ChatInterface } from "@/components/chat-interface"

import { Metadata } from "next"

interface PageProps {
  params: Promise<{ videoId: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { videoId } = await params
  const existingVideo = await db
    .select()
    .from(videos)
    .where(eq(videos.id, videoId))
    .limit(1)

  if (existingVideo.length > 0) {
    return {
      title: `${existingVideo[0].title || "Untitled Video"} - Chat | ContextTube`,
    }
  }
  return {
    title: "Chat - ContextTube",
  }
}

export default async function ChatPage({ params }: PageProps) {
  const { videoId } = await params

  // Fetch the video details from DB to show metadata in UI
  const existingVideo = await db
    .select()
    .from(videos)
    .where(eq(videos.id, videoId))
    .limit(1)

  if (existingVideo.length === 0) {
    return notFound()
  }

  const video = existingVideo[0]

  return (
    <ChatInterface
      videoId={video.id}
      videoTitle={video.title || "Untitled Video"}
      channelName={video.channelName || "Unknown Channel"}
    />
  )
}
