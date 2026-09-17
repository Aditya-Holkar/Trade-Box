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

// Yahoo Finance does not expose OTC spot XAU/USD under the literal XAUUSD
// search symbol. Keep Trade Box's user-facing symbol stable and map it to the
// Yahoo instrument used by the quote/history provider.
const ALIAS_RESULTS: SearchResult[] = [
  {
    symbol: "XAUUSD",
    name: "Gold / US Dollar (XAU/USD)",
    exchange: "OTC / Spot",
    type: "commodity",
    currency: "USD",
    quoteType: "CURRENCY",
  },
  {
    symbol: "XAGUSD",
    name: "Silver / US Dollar (XAG/USD)",
    exchange: "OTC / Spot",
    type: "commodity",
    currency: "USD",
    quoteType: "CURRENCY",
  },
];

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

  const normalized = trimmed.toUpperCase().replace(/[\s/\-_]/g, "");
  const localMatches = ALIAS_RESULTS.filter((item) => {
    const haystack = `${item.symbol} ${item.name}`.toUpperCase().replace(/[\s/\-_]/g, "");
    return haystack.includes(normalized) || normalized.includes(item.symbol);
  });

  try {
    const url = new URL(BASE_URL);
    url.searchParams.set("q", trimmed);
    url.searchParams.set("quotesCount", "12");
    url.searchParams.set("newsCount", "0");
    url.searchParams.set("enableFuzzyQuery", "true");

    const response = await fetch(url, {
      headers: { "User-Agent": "Trade-Box/0.1" },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      if (localMatches.length) return localMatches;
      throw new Error(`Market search returned HTTP ${response.status}`);
    }

    const data = (await response.json()) as YahooSearchResponse;
    const yahooResults = (data.quotes ?? [])
      .filter((quote) => quote.symbol)
      .map((quote) => ({
        symbol: quote.symbol!,
        name: quote.longname ?? quote.shortname ?? quote.symbol!,
        exchange: quote.exchange ?? null,
        type: normalizeType(quote.quoteType, quote.typeDisp),
        currency: quote.currency ?? null,
        quoteType: quote.quoteType ?? null,
      }));

    const combined = [...localMatches, ...yahooResults];
    return combined.filter(
      (item, index, all) => all.findIndex((candidate) => candidate.symbol === item.symbol) === index,
    );
  } catch (error) {
    if (localMatches.length) return localMatches;
    throw error;
  }
}
