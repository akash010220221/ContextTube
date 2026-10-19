"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import axios from "axios"

export interface VideoItem {
  id: string
  title: string | null
  channelName: string | null
  durationSeconds: number | null
  status: "processing" | "completed" | "failed"
  errorMessage: string | null
  createdAt: string
}

export function useDashboardVideos() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [urlInput, setUrlInput] = useState("")
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [searchVal, setSearchVal] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchVal)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchVal])

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Redirect to landing if unauthenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  // Fetch all videos for this user
  const fetchVideos = async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const { data } = await axios.get("/api/process-video")
      if (data.videos) {
        setVideos(data.videos)
      }
    } catch (err) {
      console.error("Failed to load user videos:", err)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    if (status === "authenticated") {
      fetchVideos(true)
    }
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [status])

  // Auto-polling when there are processing videos
  useEffect(() => {
    const hasProcessing = videos.some((v) => v.status === "processing")

    if (hasProcessing) {
      if (!pollTimerRef.current) {
        pollTimerRef.current = setInterval(() => {
          fetchVideos(false)
        }, 10000) // Poll every 10s
      }
    } else {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }
  }, [videos])

  // Handle new video submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!urlInput.trim()) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      await axios.post("/api/process-video", { url: urlInput })
      setUrlInput("")
      await fetchVideos(false) // Reload videos list immediately
    } catch (err: any) {
      setSubmitError(
        err.response?.data?.error ||
        err.message ||
        "An unexpected error occurred"
      )
    } finally {
      setSubmitting(false)
    }
  }

  // Trigger delete dialog
  const handleDeleteVideo = (videoId: string) => {
    setDeleteTarget(videoId)
  }

  // Execute actual video deletion (unlinking from user workspace)
  const executeDeleteVideo = async (videoId: string) => {
    try {
      await axios.delete(`/api/process-video?videoId=${videoId}`)

      // Remove from frontend state
      setVideos((prev) => prev.filter((v) => v.id !== videoId))
    } catch (err: any) {
      alert(
        err.response?.data?.error || err.message || "Failed to delete video"
      )
    }
  }

  const filteredVideos = videos.filter((v) => {
    const titleMatch = v.title
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase())
    const channelMatch = v.channelName
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase())
    const idMatch = v.id.toLowerCase().includes(searchQuery.toLowerCase())
    return titleMatch || channelMatch || idMatch
  })

  return {
    status,
    videos,
    loading,
    submitting,
    submitError,
    setSubmitError,
    searchVal,
    setSearchVal,
    deleteTarget,
    setDeleteTarget,
    urlInput,
    setUrlInput,
    handleSubmit,
    handleDeleteVideo,
    executeDeleteVideo,
    filteredVideos,
  }
}
