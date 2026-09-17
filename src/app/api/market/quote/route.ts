import { NextRequest, NextResponse } from "next/server";
import { getQuote } from "@/lib/market-data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol") ?? "AAPL";
  try {
    const quote = await getQuote(symbol);
    return NextResponse.json({ data: quote });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load quote" },
      { status: 502 },
    );
  }
}
