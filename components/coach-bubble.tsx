"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { CoachChat } from "@/components/coach-chat"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Sparkles, X, Minimize2, Maximize2, GripVertical } from "lucide-react"

interface Position {
  x: number
  y: number
}

const STORAGE_KEY = "hirewire-coach-bubble-position"
const DEFAULT_POSITION: Position = { x: 20, y: 20 } // From bottom-right

export function CoachBubble() {
  const [mounted, setMounted] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [position, setPosition] = useState<Position>(DEFAULT_POSITION)
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; startPos: Position } | null>(null)
  const bubbleRef = useRef<HTMLDivElement>(null)

  // Mount guard + load position from localStorage
  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        setPosition(JSON.parse(saved))
      } catch {
        // Ignore invalid JSON
      }
    }
  }, [])

  // Save position to localStorage
  useEffect(() => {
    if (!isDragging) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(position))
    }
  }, [position, isDragging])

  // Handle drag start
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY
    
    dragRef.current = {
      startX: clientX,
      startY: clientY,
      startPos: position,
    }
    setIsDragging(true)
  }, [position])

  // Handle drag move
  useEffect(() => {
    if (!isDragging) return

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!dragRef.current) return
      
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY
      
      const deltaX = dragRef.current.startX - clientX
      const deltaY = dragRef.current.startY - clientY
      
      const newX = Math.max(0, Math.min(window.innerWidth - 80, dragRef.current.startPos.x + deltaX))
      const newY = Math.max(0, Math.min(window.innerHeight - 80, dragRef.current.startPos.y + deltaY))
      
      setPosition({ x: newX, y: newY })
    }

    const handleEnd = () => {
      setIsDragging(false)
      dragRef.current = null
    }

    document.addEventListener("mousemove", handleMove)
    document.addEventListener("mouseup", handleEnd)
    document.addEventListener("touchmove", handleMove)
    document.addEventListener("touchend", handleEnd)

    return () => {
      document.removeEventListener("mousemove", handleMove)
      document.removeEventListener("mouseup", handleEnd)
      document.removeEventListener("touchmove", handleMove)
      document.removeEventListener("touchend", handleEnd)
    }
  }, [isDragging])

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen])

  // Prevent hydration mismatch - render nothing until mounted
  if (!mounted) {
    return null
  }

  return (
    <div
      ref={bubbleRef}
      className={cn(
        "fixed z-50 transition-all duration-300",
        isMaximized ? "inset-4" : ""
      )}
      style={!isMaximized ? {
        right: position.x,
        bottom: position.y,
      } : undefined}
    >
      {/* Collapsed Bubble */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className={cn(
            "h-14 w-14 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90",
            "hover:scale-110 transition-transform duration-200",
            "flex items-center justify-center"
          )}
        >
          <Sparkles className="h-6 w-6 text-white" />
        </Button>
      )}

      {/* Expanded Chat Panel */}
      {isOpen && (
        <Card className={cn(
          "flex flex-col bg-background shadow-2xl border overflow-hidden",
          isMaximized 
            ? "w-full h-full rounded-xl" 
            : "w-96 h-[500px] rounded-2xl"
        )}>
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
            {/* Drag handle */}
            {!isMaximized && (
              <div
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
                className="cursor-grab active:cursor-grabbing p-1 -ml-1 hover:bg-muted rounded"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            
            {/* Title */}
            <div className="flex items-center gap-2 flex-1">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">HireWire Coach</p>
                <p className="text-xs text-muted-foreground">Your AI career advisor</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsMaximized(!isMaximized)}
              >
                {isMaximized ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setIsOpen(false)
                  setIsMaximized(false)
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Chat Content */}
          <CoachChat compact className="flex-1" />
        </Card>
      )}
    </div>
  )
}
