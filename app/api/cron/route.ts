import { NextResponse } from "next/server";

/**
 * Scheduled entry point (Vercel Cron) for weekly jobs: scoring, elimination
 * cuts, and credit restocks. Dispatch to lib/game-engine functions here.
 */
export async function GET() {
  return NextResponse.json({ ok: true });
}
