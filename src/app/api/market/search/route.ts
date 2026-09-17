import { NextRequest, NextResponse } from "next/server";
import { searchMarketSymbols } from "@/lib/market-data/search";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!query) return NextResponse.json({ data: [] });

  try {
    const results = await searchMarketSymbols(query);
    return NextResponse.json({ data: results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to search market symbols" },
      { status: 502 },
    );
  }
}
