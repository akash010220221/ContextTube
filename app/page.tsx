"use client"

import { useSession, signIn } from "next-auth/react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  RiYoutubeFill,
  RiArrowRightLine,
  RiCompass3Line,
  RiHistoryLine,
  RiCpuLine,
  RiTimeLine,
} from "@remixicon/react"
import Link from "next/link"
import { useEffect, useState } from "react"

export default function LandingPage() {
  const { data: session, status } = useSession()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground selection:bg-red-500/25">
      <title>ContextTube - Query YouTube Videos with AI</title>
      <Navbar />

      {/* Hero Background Glows */}
      <div className="pointer-events-none absolute top-0 left-1/4 -z-10 h-[500px] w-[500px] animate-pulse rounded-full bg-red-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute right-1/4 bottom-0 -z-10 h-[600px] w-[600px] rounded-full bg-primary/5 blur-[150px]" />

      {/* Decorative Grid Pattern */}
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] bg-[size:14px_24px]" />

      <main className="z-10 container mx-auto flex max-w-5xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        {/* Banner Pill */}
        <div className="animate-fade-in mb-8">
          <Badge
            variant="outline"
            className="rounded-full border-red-500/20 bg-red-500/5 px-3.5 py-1 text-xs font-semibold tracking-wider text-red-500 uppercase"
          >
            Introducing ContextTube 1.0
          </Badge>
        </div>

        {/* Hero Copy */}
        <h1 className="mx-auto mb-6 max-w-4xl text-4xl leading-none font-extrabold tracking-tight sm:text-7xl">
          The Intelligent Way to{" "}
          <span className="bg-gradient-to-r from-red-600 via-amber-500 to-primary bg-clip-text text-transparent">
            Query YouTube
          </span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed font-normal text-muted-foreground sm:text-xl">
          Transform video viewing. Paste a link to index the transcript, perform
          semantic RAG search over captions, and navigate directly via
          timestamped citations.
        </p>

        {/* CTA Buttons */}
        {mounted && (
          <div className="mx-auto mb-20 flex w-full max-w-md flex-col items-center justify-center gap-4 sm:flex-row">
            {session ? (
              <Link href="/dashboard" className="w-full">
                <Button className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-red-600 px-8 font-bold text-white shadow-lg shadow-red-600/20 transition-all hover:bg-red-700 active:scale-95">
                  Go to Dashboard
                  <RiArrowRightLine className="h-5 w-5" />
                </Button>
              </Link>
            ) : (
              <Button
                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-red-600 px-8 font-bold text-white shadow-lg shadow-red-600/20 transition-all hover:bg-red-700 active:scale-95"
              >
                <RiYoutubeFill className="h-6 w-6" />
                Sign In with Google
              </Button>
            )}
            <a href="#features" className="w-full">
              <Button
                variant="outline"
                className="h-12 w-full cursor-pointer rounded-2xl border border-border bg-card/40 px-8 font-semibold backdrop-blur-sm"
              >
                Explore Features
              </Button>
            </a>
          </div>
        )}

        {/* Feature Highlights Grid */}
        <section
          id="features"
          className="w-full space-y-12 border-t border-border/40 py-12"
        >
          <div className="max-w-md text-left">
            <h2 className="text-2xl font-bold tracking-tight">
              Features built for learners
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Stop scrubbing timelines. Let AI extract precise video timestamps
              for you.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 text-left sm:grid-cols-3">
            <Card className="rounded-2xl border-border/60 bg-card/30 shadow-sm backdrop-blur-md transition-all duration-300 hover:border-border">
              <CardContent className="space-y-4 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 text-red-500">
                  <RiCpuLine className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold">Vector RAG Retrieval</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Search across hours of lecture or video transcripts inside
                  Neon DB using pgvector similarity match.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60 bg-card/30 shadow-sm backdrop-blur-md transition-all duration-300 hover:border-border">
              <CardContent className="space-y-4 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-500">
                  <RiTimeLine className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold">Interactive Citations</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Click on assistant responses citing specific transcript
                  timestamps to instantly seek the video player to that second.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60 bg-card/30 shadow-sm backdrop-blur-md transition-all duration-300 hover:border-border">
              <CardContent className="space-y-4 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/5 text-primary">
                  <RiHistoryLine className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold">Autosaved Sessions</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Resilient streaming with cancellation hooks ensures assistant
                  replies are safely stored, keeping your chat in sync.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  )
}
