"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { RiMoonLine, RiSunLine, RiYoutubeFill } from "@remixicon/react"
import Link from "next/link"
import { useEffect, useState } from "react"

export function Navbar() {
  const { data: session } = useSession()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const currentTheme = theme === "system" ? resolvedTheme : theme

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-2 transition-opacity hover:opacity-90"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white shadow-md shadow-red-600/25">
            <RiYoutubeFill className="h-6 w-6" />
          </div>
          <span className="bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-xl font-bold tracking-tight text-transparent">
            Context<span className="font-extrabold text-red-500">Tube</span>
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setTheme(currentTheme === "dark" ? "light" : "dark")
              }
              className="rounded-xl border border-border"
              title="Toggle theme (Press 'd')"
            >
              {currentTheme === "dark" ? (
                <RiSunLine className="h-[1.2rem] w-[1.2rem]" />
              ) : (
                <RiMoonLine className="h-[1.2rem] w-[1.2rem]" />
              )}
            </Button>
          )}

          {/* User Section */}
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none">
                    {session.user?.image ? (
                      <img
                        src={session.user.image}
                        alt={session.user.name || "Avatar"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-medium">
                        {session.user?.name?.[0]?.toUpperCase() || "U"}
                      </span>
                    )}
                  </button>
                }
              />
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm leading-none font-medium">
                        {session.user?.name || "User"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {session.user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="cursor-pointer rounded-lg text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="outline"
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="rounded-xl border border-border font-medium"
            >
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
