"use client"

import { useState, useEffect } from "react"
import { CoachChat } from "@/components/coach-chat"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { BackButton } from "@/components/back-button"
import { PremiumGate, LockedState } from "@/components/premium-gate"
import { usePremium } from "@/hooks/use-premium"
import { Sparkles, MessageSquare, Plus, Trash2, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export default function CoachPage() {
  const { isPro, isLoading: premiumLoading } = usePremium()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  // Load conversations on mount
  useEffect(() => {
    async function loadConversations() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from("companion_conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })

      if (error) {
        console.error("Failed to load conversations:", error)
        toast.error("Failed to load conversations")
      } else if (data) {
        setConversations(data)
      }
      setLoading(false)
    }

    loadConversations()
  }, [])

  // Create new conversation
  async function createConversation() {
    setCreating(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      toast.error("Please log in to create a conversation")
      setCreating(false)
      return
    }

    const { data, error } = await supabase
      .from("companion_conversations")
      .insert({
        user_id: user.id,
        title: `Chat ${format(new Date(), "MMM d, h:mm a")}`,
      })
      .select()
      .single()

    if (error) {
      console.error("Failed to create conversation:", error)
      toast.error("Failed to create conversation")
    } else if (data) {
      setConversations(prev => [data, ...prev])
      setActiveConversationId(data.id)
      toast.success("New conversation created")
    }
    setCreating(false)
  }

  // Delete conversation
  async function deleteConversation(id: string) {
    const supabase = createClient()
    
    await supabase
      .from("companion_conversations")
      .delete()
      .eq("id", id)

    setConversations(prev => prev.filter(c => c.id !== id))
    if (activeConversationId === id) {
      setActiveConversationId(null)
    }
  }

  // Show locked state for free users
  if (!premiumLoading && !isPro) {
    return (
      <div className="p-6">
        <div className="mb-4">
          <BackButton fallbackHref="/" />
        </div>
        <div className="max-w-lg mx-auto mt-12">
          <LockedState 
            feature="ai_coach" 
            title="AI Career Coach"
            description="Get personalized career guidance, interview prep, and job search strategy from your AI coach. Available with Pro."
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-6">
      <div className="mb-4">
        <BackButton fallbackHref="/" />
      </div>
      <div className="flex flex-1 gap-6 min-h-0">
      {/* Sidebar - Conversation History */}
      <Card className="w-72 shrink-0 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-hirewire-red" />
              <CardTitle className="text-lg">Coach</CardTitle>
            </div>
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={createConversation}
              disabled={creating}
              className="h-8 w-8"
              title="New conversation"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
          <CardDescription>Your AI career advisor</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full px-4 pb-4">
            {loading ? (
              <div className="py-8 text-center">
                <Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Loading conversations...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="py-8 text-center">
                <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No conversations yet</p>
                <Button 
                  variant="link" 
                  className="text-hirewire-red mt-2"
                  onClick={createConversation}
                >
                  Start a conversation
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {/* New chat button */}
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-2 h-auto py-2 px-3",
                    !activeConversationId && "bg-muted"
                  )}
                  onClick={() => setActiveConversationId(null)}
                >
                  <Plus className="h-4 w-4 text-hirewire-red" />
                  <span className="text-sm">New chat</span>
                </Button>

                {/* Conversation list */}
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={cn(
                      "group flex items-center gap-2 rounded-md px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors",
                      activeConversationId === conversation.id && "bg-muted"
                    )}
                    onClick={() => setActiveConversationId(conversation.id)}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{conversation.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(conversation.updated_at), "MMM d")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteConversation(conversation.id)
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-hirewire-red/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-hirewire-red" />
            </div>
            <div>
              <CardTitle>HireWire Coach</CardTitle>
              <CardDescription>
                Career strategy, interview prep, evidence building, and document improvement
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <CoachChat 
            key={activeConversationId || "new"}
            conversationId={activeConversationId || undefined}
            className="h-full"
          />
        </CardContent>
</Card>
      </div>
    </div>
  )
}
