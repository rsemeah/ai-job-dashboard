"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  XCircle, 
  ArrowLeft, 
  ArrowRight,
  HelpCircle,
  MessageSquare,
} from "lucide-react"

export default function StripeCancelPage() {
  const router = useRouter()

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-lg text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <XCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Payment Canceled</CardTitle>
          <CardDescription className="text-base">
            No worries - your account wasn&apos;t charged
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You can continue using HireWire with your current plan. 
            If you have questions about Pro, we&apos;re here to help.
          </p>
          
          <div className="rounded-lg border bg-muted/30 p-4 text-left">
            <h3 className="font-medium mb-2 flex items-center gap-2 text-sm">
              <HelpCircle className="h-4 w-4" />
              Common questions
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">Can I try before I buy?</strong>
                <br />
                Yes! The free plan lets you try core features before upgrading.
              </li>
              <li>
                <strong className="text-foreground">Is there a money-back guarantee?</strong>
                <br />
                Yes, we offer a 30-day money-back guarantee on all Pro subscriptions.
              </li>
            </ul>
          </div>
        </CardContent>
        
        <CardFooter className="flex-col gap-3 pt-2">
          <div className="flex w-full gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => router.push("/jobs")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <Button 
              className="flex-1"
              onClick={() => router.push("/pricing")}
            >
              View Plans
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link 
              href="mailto:support@hirewire.ai" 
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Contact support
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
