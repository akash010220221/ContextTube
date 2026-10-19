"use client"

import { Navbar } from "@/components/navbar"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  RiYoutubeLine,
  RiDownloadCloud2Line,
  RiCheckDoubleLine,
  RiAlertLine,
  RiArrowRightLine,
  RiTimeLine,
  RiSearchLine,
  RiLoader4Line,
  RiDeleteBin7Line,
} from "@remixicon/react"
import Link from "next/link"
import { useDashboardVideos } from "@/hooks/use-dashboard-videos"
import { formatDuration } from "@/lib/utils"

export default function DashboardPage() {
  const {
    status,
    videos,
    loading,
    submitting,
    submitError,
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
  } = useDashboardVideos()

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <RiLoader4Line className="h-8 w-8 animate-spin text-red-500" />
      </div>
    )
  }

  if (status === "unauthenticated") {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-red-500/25">
      <title>Dashboard | ContextTube</title>
      <Navbar />

      {/* Decorative Gradient */}
      <div className="pointer-events-none absolute top-16 right-0 left-0 -z-10 h-[400px] bg-gradient-to-b from-red-500/5 via-primary/5 to-transparent" />

      <main className="container mx-auto max-w-6xl flex-1 px-4 py-12">
        {/* Ingest Widget */}
        <section className="mx-auto mb-16 max-w-2xl space-y-4">
          <div className="mb-6 space-y-2 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight">
              Process a New Video
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Provide any public YouTube video URL to begin transcription and
              vector ingestion.
            </p>
          </div>

          <Card className="rounded-2xl border-border/60 bg-card/60 p-2 shadow-xl backdrop-blur-md sm:p-4">
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-2 sm:flex-row"
            >
              <div className="relative flex-1">
                <RiYoutubeLine className="absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="url"
                  placeholder="Paste YouTube link here... (e.g. https://www.youtube.com/watch?v=...)"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  disabled={submitting}
                  className="h-12 rounded-xl border-border bg-background/50 pl-11 focus-visible:ring-red-500/30"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-600 px-6 font-semibold text-white transition-transform hover:bg-red-700 active:scale-95"
              >
                {submitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Processing...
                  </>
                ) : (
                  <>
                    <RiDownloadCloud2Line className="h-5 w-5" />
                    Analyze Video
                  </>
                )}
              </Button>
            </form>
            {submitError && (
              <p className="mt-3 flex items-center gap-1 px-1 text-xs text-destructive">
                <RiAlertLine className="h-4 w-4 flex-none" />
                {submitError}
              </p>
            )}
          </Card>
        </section>

        {/* Video Library Dashboard */}
        <section className="space-y-6">
          <div className="flex flex-col justify-between gap-4 border-b border-border/50 pb-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Your Video Library
              </h2>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Manage, check status, and select files to open the RAG
                assistant.
              </p>
            </div>

            {/* Search filter */}
            <div className="relative w-full sm:w-72">
              <RiSearchLine className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search processed videos..."
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                className="h-10 rounded-xl border-border/80 bg-card/50 pl-9 text-sm"
              />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <Card key={n} className="overflow-hidden border-border/60">
                  <div className="aspect-video w-full animate-pulse bg-muted" />
                  <CardHeader className="space-y-2 p-5">
                    <Skeleton className="h-4 w-3/4 rounded-full" />
                    <Skeleton className="h-3 w-1/2 rounded-full" />
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <Skeleton className="h-8 w-24 rounded-lg" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-card/20 py-16 text-center">
              <RiYoutubeLine className="mx-auto mb-4 h-12 w-12 text-muted-foreground/60" />
              <h3 className="text-lg font-semibold">No videos found</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                {searchVal
                  ? "No matches found for your search query."
                  : "Paste a YouTube link above to start processing and indexing transcripts."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredVideos.map((video) => {
                const isProcessing = video.status === "processing"
                const isCompleted = video.status === "completed"
                const isFailed = video.status === "failed"

                return (
                  <Card
                    key={video.id}
                    className="group flex flex-col overflow-hidden rounded-2xl border-border/60 bg-card/40 shadow-md transition-all duration-300 hover:border-border hover:bg-card/80 hover:shadow-lg"
                  >
                    {/* Thumbnail area / Status indicator */}
                    <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden bg-zinc-950">
                      {isCompleted ? (
                        <img
                          src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`}
                          alt={video.title || "Video thumbnail"}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-zinc-500">
                          <RiYoutubeLine className="h-10 w-10 animate-pulse text-red-600" />
                        </div>
                      )}

                      {/* Duration Tag */}
                      {isCompleted && video.durationSeconds && (
                        <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-md bg-black/75 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                          <RiTimeLine className="h-3 w-3" />
                          {formatDuration(video.durationSeconds)}
                        </span>
                      )}
                    </div>

                    <CardHeader className="flex-1 space-y-1 p-5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-mono text-[10px] text-muted-foreground uppercase">
                          ID: {video.id}
                        </span>

                        {/* Status Badges */}
                        {isCompleted && (
                          <Badge
                            variant="outline"
                            className="gap-1 rounded-full border-emerald-500/20 bg-emerald-500/5 px-2 text-[10px] font-bold text-emerald-500"
                          >
                            <RiCheckDoubleLine className="h-3 w-3" />
                            Ready
                          </Badge>
                        )}
                        {isProcessing && (
                          <Badge
                            variant="outline"
                            className="animate-pulse gap-1 rounded-full border-amber-500/20 bg-amber-500/5 px-2 text-[10px] font-bold text-amber-500"
                          >
                            <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            Processing
                          </Badge>
                        )}
                        {isFailed && (
                          <Badge
                            variant="outline"
                            className="gap-1 rounded-full border-destructive/20 bg-destructive/5 px-2 text-[10px] font-bold text-destructive"
                          >
                            <RiAlertLine className="h-3 w-3" />
                            Failed
                          </Badge>
                        )}
                      </div>

                      <CardTitle className="line-clamp-2 text-base leading-snug font-bold transition-colors group-hover:text-red-500">
                        {video.title || "Untitled Video"}
                      </CardTitle>

                      <CardDescription className="truncate text-xs font-medium">
                        {video.channelName || "Unknown Creator"}
                      </CardDescription>

                      {isFailed && video.errorMessage && (
                        <p className="mt-2 line-clamp-2 rounded-lg border border-destructive/10 bg-destructive/5 p-2 text-[10px] text-destructive">
                          {video.errorMessage}
                        </p>
                      )}
                    </CardHeader>

                    <CardFooter className="mt-auto flex gap-2 px-5 pt-0 pb-5">
                      {isCompleted ? (
                        <>
                          <Link href={`/chat/${video.id}`} className="flex-1">
                            <Button className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-primary font-semibold text-primary-foreground hover:bg-primary/95">
                              Start Chatting
                              <RiArrowRightLine className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDeleteVideo(video.id)}
                            className="h-10 w-10 shrink-0 cursor-pointer rounded-xl border-border/80 transition-all hover:border-destructive/20 hover:bg-destructive/5 hover:text-destructive"
                            title="Remove video from library"
                          >
                            <RiDeleteBin7Line className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            disabled
                            className="flex-1 rounded-xl border border-border/80 bg-muted font-semibold text-muted-foreground"
                          >
                            {isProcessing
                              ? "Processing Transcript..."
                              : "Ingestion Failed"}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDeleteVideo(video.id)}
                            className="h-10 w-10 shrink-0 cursor-pointer rounded-xl border-border/80 transition-all hover:border-destructive/20 hover:bg-destructive/5 hover:text-destructive"
                            title="Remove video from library"
                          >
                            <RiDeleteBin7Line className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          )}
        </section>
      </main>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Remove Video"
        description="Are you sure you want to remove this video and its chat history from your library?"
        confirmText="Remove"
        isDanger
        onConfirm={() => {
          if (deleteTarget) {
            executeDeleteVideo(deleteTarget)
            setDeleteTarget(null)
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
