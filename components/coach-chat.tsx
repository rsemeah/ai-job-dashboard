"use client"

import { useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { 
  Send, 
  Sparkles, 
  User, 
  Loader2,
  Lightbulb,
  FileText,
  Target,
  HelpCircle
} from "lucide-react"
import ReactMarkdown from "react-markdown"

interface CoachChatProps {
  className?: string
  conversationId?: string
  compact?: boolean
  onClose?: () => void
  /** Optional job context to help the coach provide job-specific advice */
  jobContext?: {
    jobId: string
    title: string
    company: string
    score?: number | null
    status?: string
  }
  /** Optional gap context for targeted gap clarification mode */
  gapContext?: {
    jobTitle: string
    company: string
    gap?: {
      requirement: string
      category: string
      coach_question: string
    }
  }
  /** Initial message to send when component mounts */
  initialMessage?: string
}

// Quick action suggestions
const quickActions = [
  { label: "Review my pipeline", icon: Target, prompt: "What should I focus on next in my job search? Review my pipeline and suggest the best next action." },
  { label: "Interview prep tips", icon: HelpCircle, prompt: "I have an upcoming interview. Can you help me prepare? Give me your top tips." },
  { label: "Improve my resume", icon: FileText, prompt: "Can you review my evidence library and suggest how I could strengthen my resume?" },
  { label: "Build my evidence", icon: Lightbulb, prompt: "Help me add to my evidence library. Ask me about my achievements and experiences." },
]

// Helper to extract text from message (v4 uses content directly)
function getMessageText(message: { content?: string }): string {
  return message.content || ""
}

export function CoachChat({ className, conversationId, compact = false, onClose, jobContext, gapContext, initialMessage }: CoachChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const initialMessageSent = useRef(false)

  const { messages, input, setInput, handleSubmit: submitMessage, isLoading, append, error } = useChat({
    api: "/api/coach",
    body: {
      ...(jobContext ? {
        jobContext: {
          jobId: jobContext.jobId,
          title: jobContext.title,
          company: jobContext.company,
          score: jobContext.score,
          status: jobContext.status,
        }
      } : {}),
      ...(gapContext ? { gapContext } : {}),
    },
    onError: (err) => {
      console.error("[v0] Coach useChat error:", err)
    },
  })

  // Debug logging
  useEffect(() => {
    console.log("[v0] CoachChat mounted", { 
      hasJobContext: !!jobContext, 
      hasGapContext: !!gapContext,
      hasInitialMessage: !!initialMessage 
    })
  }, [])

  // Send initial message on mount if provided
  useEffect(() => {
    if (initialMessage && !initialMessageSent.current && messages.length === 0) {
      initialMessageSent.current = true
      append({ role: "user", content: initialMessage })
    }
  }, [initialMessage, messages.length, append])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    console.log("[v0] CoachChat submitting message:", input.substring(0, 50))
    submitMessage(e)
  }

  // Handle quick action click
  const handleQuickAction = (prompt: string) => {
    if (isLoading) return
    append({ role: "user", content: prompt })
  }

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Messages area */}
      <ScrollArea 
        ref={scrollRef as React.RefObject<HTMLDivElement>}
        className={cn("flex-1 px-4", compact ? "py-2" : "py-4")}
      >
        {/* Welcome message if no messages */}
        {messages.length === 0 && (
          <div className={cn("space-y-4", compact ? "py-2" : "py-6")}>
            <div className="flex items-start gap-3">
              <Avatar className="h-8 w-8 bg-primary/10">
                <AvatarFallback className="bg-primary text-white">
                  <Sparkles className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium">HireWire Coach</p>
                <p className="text-sm text-muted-foreground">
                  Hey! I&apos;m your personal career coach. I can help you with job search strategy, 
                  interview prep, building your evidence library, and improving your application materials.
                </p>
                {jobContext ? (
                  <div className="p-2 bg-muted rounded-md border text-sm">
                    <p className="font-medium">Currently focused on:</p>
                    <p className="text-muted-foreground">
                      {jobContext.title} at {jobContext.company}
                      {jobContext.score !== null && jobContext.score !== undefined && ` (Fit: ${jobContext.score}%)`}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    What would you like to work on today?
                  </p>
                )}
              </div>
            </div>

            {/* Quick actions grid */}
            <div className={cn(
              "grid gap-2",
              compact ? "grid-cols-1" : "grid-cols-2"
            )}>
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  className="justify-start gap-2 h-auto py-2 px-3 text-left"
                  onClick={() => handleQuickAction(action.prompt)}
                  disabled={isLoading}
                >
                  <action.icon className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-xs">{action.label}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Message list */}
        <div className="space-y-4">
          {messages.map((message) => {
            const isUser = message.role === "user"
            const text = getMessageText(message)
            
            if (!text) return null

            return (
              <div
                key={message.id}
                className={cn(
                  "flex items-start gap-3",
                  isUser && "flex-row-reverse"
                )}
              >
                <Avatar className={cn(
                  "h-8 w-8",
                  isUser ? "bg-muted" : "bg-primary/10"
                )}>
                  <AvatarFallback className={cn(
                    isUser ? "bg-muted text-muted-foreground" : "bg-primary text-white"
                  )}>
                    {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className={cn(
                  "flex-1 space-y-1",
                  isUser && "text-right"
                )}>
                  <p className="text-xs font-medium text-muted-foreground">
                    {isUser ? "You" : "HireWire Coach"}
                  </p>
                  <div className={cn(
                    "prose prose-sm max-w-none",
                    isUser ? "text-right" : "text-left",
                    "[&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2"
                  )}>
                    {isUser ? (
                      <p className="text-sm">{text}</p>
                    ) : (
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="text-sm text-foreground mb-2">{children}</p>,
                          ul: ({ children }) => <ul className="text-sm list-disc pl-4 mb-2">{children}</ul>,
                          ol: ({ children }) => <ol className="text-sm list-decimal pl-4 mb-2">{children}</ol>,
                          li: ({ children }) => <li className="text-sm mb-1">{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          code: ({ children }) => (
                            <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>
                          ),
                        }}
                      >
                        {text}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-start gap-3">
              <Avatar className="h-8 w-8 bg-primary/10">
                <AvatarFallback className="bg-primary text-white">
                  <Sparkles className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            </div>
          )}
          
          {/* Error display */}
          {error && (
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg mt-4">
              <div className="text-sm text-red-700">
                <p className="font-medium">Coach Error</p>
                <p className="text-red-600">{error.message || "Failed to get response. Please try again."}</p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className={cn(
        "border-t bg-background",
        compact ? "p-2" : "p-4"
      )}>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about your job search..."
            className={cn(
              "min-h-[40px] max-h-[120px] resize-none",
              compact && "text-sm"
            )}
            rows={1}
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={!input.trim() || isLoading}
            className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
