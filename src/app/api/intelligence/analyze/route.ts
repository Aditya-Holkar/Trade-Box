import { NextRequest, NextResponse } from "next/server";
import { analyzeSymbol } from "@/lib/intelligence/research-engine";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol") ?? "AAPL";
  try {
    return NextResponse.json({ data: await analyzeSymbol(symbol) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to analyze symbol" }, { status: 502 });
  }
}
