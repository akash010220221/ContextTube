"use client"

import { useState, useEffect, useRef } from "react"
import axios from "axios"

export interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
}

interface UseVideoChatProps {
  videoId: string
}

export function useVideoChat({ videoId }: UseVideoChatProps) {
  const [chatId, setChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [streamingText, setStreamingText] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)

  const [clearing, setClearing] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)

  const handleClearChat = () => {
    setShowClearConfirm(true)
  }

  const executeClearChat = async () => {
    setClearing(true)
    try {
      await axios.delete(`/api/chat?videoId=${videoId}`)
      setChatId(null)
      setMessages([])
    } catch (err: any) {
      console.error("Failed to clear chat:", err)
      alert(err.response?.data?.error || "Failed to clear chat")
    } finally {
      setClearing(false)
    }
  }

  // 1. Fetch available chat session for this video (only one allowed)
  const fetchChatSession = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`/api/chat?videoId=${videoId}`)
      if (data.chats && data.chats.length > 0) {
        const activeChat = data.chats[0]
        setChatId(activeChat.id)

        // Fetch messages for this session
        const messagesRes = await axios.get(
          `/api/chat?chatId=${activeChat.id}&videoId=${videoId}`
        )
        if (messagesRes.data.messages) {
          setMessages(messagesRes.data.messages)
        }
      }
    } catch (err) {
      console.error("Failed to load chat session:", err)
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchChatSession()
  }, [videoId])

  // Scroll to bottom on new messages or stream chunks
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, streamingText])

  // Programmatic seeking control for YouTube Embed Player
  const seekToSeconds = (seconds: number) => {
    const iframe = document.getElementById("yt-player") as HTMLIFrameElement
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: "seekTo",
          args: [seconds, true],
        }),
        "*"
      )
    }
  }

  // Handle message submission (POST to chat streaming)
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isStreaming) return

    const userMessageText = input.trim()
    setInput("")

    // Add user message to local state immediately
    const tempUserMessage: Message = {
      id: `msg_temp_${Date.now()}`,
      role: "user",
      content: userMessageText,
    }
    setMessages((prev) => [...prev, tempUserMessage])
    setIsStreaming(true)
    setStreamingText("")

    try {
      let accumulatedResponse = ""
      const response = await axios.post(
        "/api/chat",
        {
          videoId,
          message: userMessageText,
          chatId: chatId || undefined,
        },
        {
          onDownloadProgress: (progressEvent) => {
            const xhr = (progressEvent as any).event?.target as XMLHttpRequest
            if (xhr) {
              accumulatedResponse = xhr.responseText
              setStreamingText(accumulatedResponse)
            }
          },
        }
      )

      // Check header for new or existing Chat Session ID
      const responseChatId = response.headers["x-chat-id"]
      if (responseChatId && responseChatId !== chatId) {
        setChatId(responseChatId)
      }

      // Add finalized assistant message to local state
      const assistantMessage: Message = {
        id: `msg_assistant_${Date.now()}`,
        role: "assistant",
        content: accumulatedResponse,
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (err: any) {
      console.error("Chat error:", err)
      const errorMessage: Message = {
        id: `msg_err_${Date.now()}`,
        role: "system",
        content: `Error: ${err.message || "Something went wrong. Please try again."}`,
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsStreaming(false)
      setStreamingText("")
    }
  }

  return {
    chatId,
    messages,
    input,
    setInput,
    loading,
    streamingText,
    isStreaming,
    clearing,
    showClearConfirm,
    setShowClearConfirm,
    scrollRef,
    handleClearChat,
    executeClearChat,
    seekToSeconds,
    handleSend,
  }
}
