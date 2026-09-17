import { NextRequest, NextResponse } from "next/server";
import { getHistory } from "@/lib/market-data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const symbol = params.get("symbol") ?? "AAPL";
  const range = params.get("range") ?? "1mo";
  const interval = params.get("interval") ?? "1d";

  try {
    const candles = await getHistory(symbol, range, interval);
    return NextResponse.json({ data: candles, meta: { symbol: symbol.toUpperCase(), range, interval } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load historical data" },
      { status: 502 },
    );
  }
}
