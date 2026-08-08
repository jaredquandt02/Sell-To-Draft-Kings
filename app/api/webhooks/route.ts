import { NextResponse } from "next/server";

/**
 * Receives push events from the active stats provider (if it supports
 * webhooks instead of polling). Wire to the corresponding
 * lib/stats-provider implementation once a provider that pushes is chosen.
 */
export async function POST(request: Request) {
  await request.json();
  return NextResponse.json({ received: true });
}
