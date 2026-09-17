import type { MarketAssetType } from "./types";

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string | null;
  type: MarketAssetType | "unknown";
  currency: string | null;
  quoteType: string | null;
}

interface YahooSearchResponse {
  quotes?: Array<{
    symbol?: string;
    shortname?: string;
    longname?: string;
    exchange?: string;
    quoteType?: string;
    typeDisp?: string;
    currency?: string;
  }>;
}

const BASE_URL = "https://query1.finance.yahoo.com/v1/finance/search";

function normalizeType(quoteType?: string, typeDisp?: string): SearchResult["type"] {
  const value = `${quoteType ?? ""} ${typeDisp ?? ""}`.toLowerCase();
  if (value.includes("etf")) return "etf";
  if (value.includes("crypto")) return "crypto";
  if (value.includes("currency") || value.includes("forex")) return "forex";
  if (value.includes("index")) return "index";
  if (value.includes("commodity")) return "commodity";
  if (value.includes("equity") || value.includes("stock")) return "stock";
  return "unknown";
}

export async function searchMarketSymbols(query: string): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = new URL(BASE_URL);
  url.searchParams.set("q", trimmed);
  url.searchParams.set("quotesCount", "12");
  url.searchParams.set("newsCount", "0");
  url.searchParams.set("enableFuzzyQuery", "true");

  const response = await fetch(url, {
    headers: { "User-Agent": "Trade-Box/0.1" },
    next: { revalidate: 60 },
  });

  if (!response.ok) throw new Error(`Market search returned HTTP ${response.status}`);

  const data = (await response.json()) as YahooSearchResponse;
  return (data.quotes ?? [])
    .filter((quote) => quote.symbol)
    .map((quote) => ({
      symbol: quote.symbol!,
      name: quote.longname ?? quote.shortname ?? quote.symbol!,
      exchange: quote.exchange ?? null,
      type: normalizeType(quote.quoteType, quote.typeDisp),
      currency: quote.currency ?? null,
      quoteType: quote.quoteType ?? null,
    }));
}
