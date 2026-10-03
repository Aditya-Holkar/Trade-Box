import { NextResponse } from "next/server";
import { getXauusdSnapshot } from "@/lib/jev-xau/trader";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getXauusdSnapshot();
    return NextResponse.json(snapshot, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "XAUUSD bridge unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
