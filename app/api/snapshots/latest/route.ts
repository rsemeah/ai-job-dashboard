import { NextRequest, NextResponse } from "next/server"

/**
 * Stub endpoint for /api/snapshots/latest
 * 
 * This endpoint is requested by the v0 preview environment's wrapper code,
 * not by HireWire application code. We return a safe empty response to
 * prevent 404 errors in the console during preview.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const chatId = searchParams.get("chatId")
  const blockId = searchParams.get("blockId")

  // If required params are missing, return 400
  if (!chatId || !blockId) {
    return NextResponse.json(
      { error: "Missing required parameters: chatId and blockId" },
      { status: 400 }
    )
  }

  // Return empty snapshot - this endpoint is not used by HireWire
  return NextResponse.json({
    snapshot: null,
    chatId,
    blockId,
  })
}
