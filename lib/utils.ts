import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import React from "react"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function extractYoutubeId(url: string): string | null {
  if (!url) return null

  // Matches standard watch URLs, embed URLs, shorts, and share links
  const regExp =
    /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/
  const match = url.match(regExp)

  console.log("match", match)
  return match && match[1].length === 11 ? match[1] : null
}

export function parseMessageCitations(
  text: string,
  onSeek: (seconds: number) => void
): React.ReactNode[] {
  const offsetRegex = /\[Offset:\s*(\d+)s\]/gi
  const timeRegex = /\b(?:at\s+)?(\d{1,2}):(\d{2})\b/gi

  const parts: React.ReactNode[] = []
  let lastIndex = 0

  interface MatchItem {
    index: number
    length: number
    text: string
    seconds: number
  }

  const matches: MatchItem[] = []

  let match
  offsetRegex.lastIndex = 0
  while ((match = offsetRegex.exec(text)) !== null) {
    matches.push({
      index: match.index,
      length: match[0].length,
      text: match[0],
      seconds: parseInt(match[1], 10),
    })
  }

  timeRegex.lastIndex = 0
  while ((match = timeRegex.exec(text)) !== null) {
    const start = match.index
    const end = start + match[0].length
    const isOverlapping = matches.some(
      (m) => start < m.index + m.length && end > m.index
    )
    if (!isOverlapping) {
      const mins = parseInt(match[1], 10)
      const secs = parseInt(match[2], 10)
      matches.push({
        index: start,
        length: match[0].length,
        text: match[0],
        seconds: mins * 60 + secs,
      })
    }
  }

  matches.sort((a, b) => a.index - b.index)

  matches.forEach((m) => {
    if (m.index > lastIndex) {
      parts.push(text.substring(lastIndex, m.index))
    }
    parts.push(
      React.createElement(
        "button",
        {
          key: `seek-${m.index}`,
          onClick: () => onSeek(m.seconds),
          className:
            "inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 text-xs font-semibold rounded bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-600 transition-colors border border-red-500/10 cursor-pointer align-baseline",
        },
        `⏱️ ${m.text}`
      )
    )
    lastIndex = m.index + m.length
  })

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}

export function formatDuration(seconds: number | null): string {
  if (!seconds) return "00:00"
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  const paddedMins = String(mins).padStart(2, "0")
  const paddedSecs = String(secs).padStart(2, "0")

  if (hrs > 0) {
    return `${hrs}:${paddedMins}:${paddedSecs}`
  }
  return `${paddedMins}:${paddedSecs}`
}
