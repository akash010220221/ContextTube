"use client"

import React from "react"
import { Button } from "@/components/ui/button"

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  isDanger?: boolean
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  isDanger = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm transition-all duration-300">
      {/* Click outside to cancel */}
      <div className="absolute inset-0" onClick={onCancel} />

      <div className="relative w-full max-w-sm scale-100 transform space-y-4 rounded-2xl border border-border/80 bg-card/90 p-6 shadow-2xl backdrop-blur-md transition-all duration-300">
        <div className="space-y-1.5">
          <h3 className="text-base font-bold tracking-tight text-foreground">
            {title}
          </h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="ghost"
            onClick={onCancel}
            className="h-9 cursor-pointer rounded-xl border border-border/60 px-4 text-xs font-semibold hover:bg-muted"
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            className={`h-9 cursor-pointer rounded-xl px-4 text-xs font-semibold text-white transition-all active:scale-95 ${
              isDanger
                ? "bg-red-600 shadow-lg shadow-red-600/10 hover:bg-red-700"
                : "bg-primary hover:bg-primary/90"
            }`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}
