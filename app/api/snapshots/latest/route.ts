import { NextResponse } from "next/server"

/**
 * Stub endpoint for /api/snapshots/latest
 *
 * This endpoint is requested by the v0 preview environment's wrapper code,
 * not by HireWire application code. We return a safe empty response to
 * prevent 404 errors in the console during preview.
 */
export async function GET() {
  return NextResponse.json({
    snapshot: null,
  })
}
