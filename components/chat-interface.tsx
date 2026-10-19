"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  RiSendPlane2Fill,
  RiArrowLeftLine,
  RiVideoLine,
  RiQuestionAnswerLine,
  RiLoader4Line,
  RiChatSmileLine,
  RiTimeLine,
  RiDeleteBin7Line,
} from "@remixicon/react"
import Link from "next/link"
import { parseMessageCitations } from "@/lib/utils"
import { Navbar } from "@/components/navbar"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { useVideoChat } from "@/hooks/use-video-chat"

interface ChatInterfaceProps {
  videoId: string
  videoTitle: string
  channelName: string
}

export function ChatInterface({
  videoId,
  videoTitle,
  channelName,
}: ChatInterfaceProps) {
  const {
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
  } = useVideoChat({ videoId })

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      <Navbar />
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        {/* 1. Left Section: Player & Details */}
        <div className="flex h-fit w-full flex-col border-r border-border/50 bg-card/20 lg:h-full lg:w-[55%]">
          {/* Header Action Nav */}
          <div className="flex h-14 items-center justify-between border-b border-border/50 bg-card/40 px-4 backdrop-blur-md">
            <Link href="/dashboard">
              <Button
                variant="ghost"
                size="sm"
                className="cursor-pointer gap-1 rounded-xl border border-border text-xs"
              >
                <RiArrowLeftLine className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>

            <Badge
              variant="outline"
              className="shrink-0 gap-1 rounded-full border-red-500/20 bg-red-500/5 text-xs text-red-500"
            >
              <RiVideoLine className="h-3.5 w-3.5" />
              Active Chat
            </Badge>
          </div>

          {/* Embedded Iframe Player container */}
          <div className="relative aspect-video w-full bg-zinc-950">
            <iframe
              id="yt-player"
              src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${typeof window !== "undefined" ? window.location.origin : ""}`}
              title={videoTitle}
              className="absolute inset-0 h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>

          {/* Video metadata Details - visible on both mobile and desktop under player */}
          <div className="space-y-3 border-b border-border/40 bg-card/40 p-5 lg:flex-1 lg:overflow-y-auto lg:border-b-0">
            <div className="space-y-2">
              <h1 className="text-base leading-snug font-bold tracking-tight sm:text-lg">
                {videoTitle}
              </h1>
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-semibold text-muted-foreground">
                  {channelName}
                </p>
                <span className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                  Video ID: {videoId}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Right Section: Chat Interface log feed */}
        <div className="flex h-full flex-1 flex-col overflow-hidden bg-background">
          {/* Chat Feed Header */}
          <div className="flex h-14 items-center justify-between border-b border-border/50 bg-card/20 px-5">
            <div className="flex items-center gap-2">
              <RiQuestionAnswerLine className="h-4.5 w-4.5 text-red-500" />
              <h2 className="text-sm font-bold">Context Tube AI Assistant</h2>
            </div>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                disabled={clearing}
                onClick={handleClearChat}
                className="h-8 cursor-pointer gap-1.5 rounded-xl border border-border/50 px-2.5 text-xs text-muted-foreground transition-all hover:border-destructive/20 hover:bg-destructive/5 hover:text-destructive"
              >
                {clearing ? (
                  <RiLoader4Line className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RiDeleteBin7Line className="h-3.5 w-3.5" />
                )}
                Clear Chat
              </Button>
            )}
          </div>

          {/* Scrollable chat body */}
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {loading ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <RiLoader4Line className="h-8 w-8 animate-spin text-red-500" />
                <p className="text-xs font-medium">Loading chat history...</p>
              </div>
            ) : messages.length === 0 && !isStreaming ? (
              <div className="mx-auto flex h-full max-w-sm flex-col items-center justify-center space-y-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/5 text-red-500">
                  <RiChatSmileLine className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-semibold">Chat with this video</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Ask a question about the video transcript. Clickable timeline
                  references will synchronize the video player automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => {
                  const isUser = msg.role === "user"
                  const isSystem = msg.role === "system"

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl border p-3.5 text-sm leading-relaxed shadow-sm ${isUser
                            ? "rounded-tr-none border-red-700 bg-red-600 text-white"
                            : isSystem
                              ? "rounded-tl-none border-destructive/20 bg-destructive/5 text-xs text-destructive"
                              : "rounded-tl-none border-border/80 bg-card whitespace-pre-wrap text-foreground"
                          }`}
                      >
                        {isUser ? (
                          msg.content
                        ) : (
                          <div className="space-y-1">
                            {parseMessageCitations(msg.content, seekToSeconds)}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Streaming placeholder */}
                {isStreaming && streamingText && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl rounded-tl-none border border-border/80 bg-card p-3.5 text-sm leading-relaxed text-foreground shadow-sm">
                      <div className="space-y-1">
                        {parseMessageCitations(streamingText, seekToSeconds)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Loading thinking indicator */}
                {isStreaming && !streamingText && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-2xl rounded-tl-none border border-border/80 bg-card p-3.5 text-muted-foreground shadow-sm">
                      <RiLoader4Line className="h-4 w-4 animate-spin text-red-500" />
                      <span className="text-xs font-medium">Thinking...</span>
                    </div>
                  </div>
                )}

                <div ref={scrollRef} />
              </div>
            )}
          </div>

          {/* Input box section */}
          <div className="border-t border-border/50 bg-card/40 p-4 backdrop-blur-md">
            <form onSubmit={handleSend} className="flex gap-2">
              <Input
                type="text"
                placeholder={
                  isStreaming
                    ? "Assistant is responding..."
                    : "Ask anything about the video..."
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isStreaming || loading}
                className="h-11 rounded-xl border-border/80 bg-background text-sm focus-visible:ring-red-500/30"
                required
              />
              <Button
                type="submit"
                size="icon"
                disabled={isStreaming || loading || !input.trim()}
                className="h-11 w-11 flex-none cursor-pointer rounded-xl bg-red-600 text-white transition-transform hover:bg-red-700 active:scale-95"
              >
                <RiSendPlane2Fill className="h-5 w-5" />
              </Button>
            </form>
          </div>
        </div>

        <ConfirmDialog
          isOpen={showClearConfirm}
          title="Clear Chat"
          description="Are you sure you want to clear the chat history for this video?"
          confirmText="Clear"
          isDanger
          onConfirm={() => {
            executeClearChat()
            setShowClearConfirm(false)
          }}
          onCancel={() => setShowClearConfirm(false)}
        />
      </div>
    </div>
  )
}
