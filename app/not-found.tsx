"use client"

import { Button } from "@/components/ui/button"
import { RiAlertLine, RiHome4Line } from "@remixicon/react"
import Link from "next/link"

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-6 text-foreground select-none">
      {/* Background radial glows */}
      <div className="pointer-events-none absolute top-1/3 left-1/2 -z-10 h-[450px] w-[450px] -translate-x-1/2 rounded-full bg-red-500/10 blur-[100px]" />
      <div className="pointer-events-none absolute right-10 bottom-10 -z-10 h-[300px] w-[300px] rounded-full bg-primary/5 blur-[120px]" />

      {/* Decorative Grid Pattern */}
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] bg-[size:14px_24px]" />

      <div className="z-10 mx-auto max-w-md space-y-6 text-center">
        {/* Animated Icon Box */}
        <div className="mb-2 inline-flex h-16 w-16 animate-bounce items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/5 text-red-500">
          <RiAlertLine className="h-8 w-8" />
        </div>

        {/* 404 Title */}
        <h1 className="bg-gradient-to-b from-foreground to-muted-foreground/60 bg-clip-text text-8xl leading-none font-black tracking-tighter text-transparent">
          404
        </h1>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight">Page Not Found</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The page you are looking for doesn't exist, or has been moved to a
            different address.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-4">
          <Link href="/">
            <Button className="mx-auto flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-600 px-6 font-semibold text-white shadow-lg shadow-red-600/10 transition-transform hover:bg-red-700 active:scale-95">
              <RiHome4Line className="h-5 w-5" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
