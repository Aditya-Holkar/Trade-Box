import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type YahooSearchQuote = {
  symbol?: string;
  shortname?: string;
  longname?: string;
  exchange?: string;
  exchDisp?: string;
  quoteType?: string;
  typeDisp?: string;
};

const POPULAR = [
  { symbol:"AAPL", name:"Apple Inc.", exchange:"NASDAQ", type:"Stock" },
  { symbol:"MSFT", name:"Microsoft Corporation", exchange:"NASDAQ", type:"Stock" },
  { symbol:"NVDA", name:"NVIDIA Corporation", exchange:"NASDAQ", type:"Stock" },
  { symbol:"AMZN", name:"Amazon.com, Inc.", exchange:"NASDAQ", type:"Stock" },
  { symbol:"GOOGL", name:"Alphabet Inc.", exchange:"NASDAQ", type:"Stock" },
  { symbol:"TSLA", name:"Tesla, Inc.", exchange:"NASDAQ", type:"Stock" },
  { symbol:"VEDL.NS", name:"Vedanta Limited", exchange:"NSE", type:"Stock" },
  { symbol:"RELIANCE.NS", name:"Reliance Industries Limited", exchange:"NSE", type:"Stock" },
  { symbol:"TCS.NS", name:"Tata Consultancy Services", exchange:"NSE", type:"Stock" },
  { symbol:"INFY.NS", name:"Infosys Limited", exchange:"NSE", type:"Stock" },
  { symbol:"BTC-USD", name:"Bitcoin USD", exchange:"Crypto", type:"Crypto" },
  { symbol:"ETH-USD", name:"Ethereum USD", exchange:"Crypto", type:"Crypto" },
  { symbol:"XRP-USD", name:"XRP USD", exchange:"Crypto", type:"Crypto" },
  { symbol:"SOL-USD", name:"Solana USD", exchange:"Crypto", type:"Crypto" },
  { symbol:"EURUSD=X", name:"EUR/USD", exchange:"FOREX", type:"Currency" },
  { symbol:"GBPUSD=X", name:"GBP/USD", exchange:"FOREX", type:"Currency" },
  { symbol:"USDJPY=X", name:"USD/JPY", exchange:"FOREX", type:"Currency" },
  { symbol:"USDINR=X", name:"USD/INR", exchange:"FOREX", type:"Currency" },
  { symbol:"XAUUSD=X", name:"Gold / USD", exchange:"FOREX", type:"Currency" }
];

function normalizeType(q: YahooSearchQuote) {
  const raw = String(q.quoteType ?? q.typeDisp ?? "").toLowerCase();
  if (raw.includes("currency")) return "Currency";
  if (raw.includes("crypto")) return "Crypto";
  if (raw.includes("index")) return "Index";
  if (raw.includes("fund") || raw.includes("etf")) return "ETF";
  if (raw.includes("future")) return "Future";
  return "Stock";
}

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) return NextResponse.json({ results: POPULAR.slice(0, 18) });

  try {
    const url = new URL("https://query1.finance.yahoo.com/v1/finance/search");
    url.searchParams.set("q", q);
    url.searchParams.set("quotesCount", "30");
    url.searchParams.set("newsCount", "0");
    url.searchParams.set("enableFuzzyQuery", "true");
    url.searchParams.set("enableCb", "true");

    const response = await fetch(url, {
      headers: { "User-Agent": "Trade-Box/1.0" },
      next: { revalidate: 300 }
    });
    if (!response.ok) throw new Error("Symbol search unavailable");

    const data = await response.json() as { quotes?: YahooSearchQuote[] };
    const results = (data.quotes ?? [])
      .filter(x => x.symbol && (x.quoteType || x.typeDisp))
      .map(x => ({
        symbol: x.symbol!,
        name: x.longname || x.shortname || x.symbol!,
        exchange: x.exchDisp || x.exchange || "GLOBAL",
        type: normalizeType(x)
      }));

    const merged = [...results, ...POPULAR.filter(p => {
      const term = q.toUpperCase();
      return p.symbol.toUpperCase().includes(term) || p.name.toUpperCase().includes(term);
    })];

    const seen = new Set<string>();
    return NextResponse.json({
      results: merged.filter(x => !seen.has(x.symbol) && seen.add(x.symbol)).slice(0, 30)
    });
  } catch {
    const term = q.toUpperCase();
    return NextResponse.json({
      results: POPULAR.filter(x => x.symbol.includes(term) || x.name.toUpperCase().includes(term)).slice(0, 30)
    });
  }
}
