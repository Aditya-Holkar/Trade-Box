import type { Candle, MarketDataProvider, Quote } from "./types";

const BASE_URL = "https://query1.finance.yahoo.com";

const SYMBOL_ALIASES: Record<string, string> = {
  XAUUSD: "GC=F",
  GOLD: "GC=F",
  XAGUSD: "SI=F",
  SILVER: "SI=F",
  WTI: "CL=F",
  BRENT: "BZ=F",
};

function normalizeYahooSymbol(input: string): string {
  const symbol = input.trim().toUpperCase();
  if (SYMBOL_ALIASES[symbol]) return SYMBOL_ALIASES[symbol];
  if (symbol.endsWith("=X")) return symbol;

  // Yahoo represents standard FX pairs as e.g. EURUSD=X.
  if (/^[A-Z]{6}$/.test(symbol)) return `${symbol}=X`;
  return symbol;
}

function inferAssetType(symbol: string): Quote["assetType"] {
  if (symbol === "GC=F" || symbol === "SI=F" || symbol === "CL=F" || symbol === "BZ=F") return "commodity";
  if (symbol.endsWith("=X")) return "forex";
  if (symbol.endsWith("=F")) return "commodity";
  if (symbol.startsWith("^") || symbol === "%5EVIX") return "index";
  return "stock";
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        symbol?: string;
        shortName?: string;
        currency?: string;
        regularMarketPrice?: number;
        previousClose?: number;
        chartPreviousClose?: number;
        regularMarketDayHigh?: number;
        regularMarketDayLow?: number;
        regularMarketVolume?: number;
        marketCap?: number;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
    error?: { description?: string } | null;
  };
}

async function fetchChart(symbol: string, range: string, interval: string) {
  const url = new URL(`${BASE_URL}/v8/finance/chart/${encodeURIComponent(symbol)}`);
  url.searchParams.set("range", range);
  url.searchParams.set("interval", interval);
  url.searchParams.set("events", "div,splits");

  const response = await fetch(url, {
    headers: { "User-Agent": "Trade-Box/0.1" },
    next: { revalidate: 30 },
  });

  if (!response.ok) throw new Error(`Yahoo Finance returned HTTP ${response.status}`);
  const data = (await response.json()) as YahooChartResponse;
  const result = data.chart?.result?.[0];
  if (!result) throw new Error(data.chart?.error?.description ?? `No market data for ${symbol}`);
  return result;
}

export const yahooProvider: MarketDataProvider = {
  name: "Yahoo Finance",

  async getQuote(symbol: string): Promise<Quote> {
    const requestedSymbol = symbol.trim().toUpperCase();
    const yahooSymbol = normalizeYahooSymbol(requestedSymbol);
    const result = await fetchChart(yahooSymbol, "1d", "1m");
    const meta = result.meta ?? {};
    const price = meta.regularMarketPrice;
    if (typeof price !== "number") throw new Error(`No quote available for ${requestedSymbol}`);

    const previousClose = meta.previousClose ?? meta.chartPreviousClose ?? null;
    const change = previousClose === null ? null : price - previousClose;
    const changePercent = previousClose ? (change! / previousClose) * 100 : null;

    return {
      symbol: requestedSymbol,
      name: meta.shortName ?? meta.symbol ?? requestedSymbol,
      assetType: inferAssetType(yahooSymbol),
      currency: meta.currency ?? "USD",
      price,
      previousClose,
      change,
      changePercent,
      dayHigh: meta.regularMarketDayHigh ?? null,
      dayLow: meta.regularMarketDayLow ?? null,
      volume: meta.regularMarketVolume ?? null,
      marketCap: meta.marketCap ?? null,
      timestamp: Date.now(),
      provider: "Yahoo Finance",
      freshness: "delayed",
    };
  },

  async getHistory(symbol: string, range = "1mo", interval = "1d"): Promise<Candle[]> {
    const result = await fetchChart(normalizeYahooSymbol(symbol), range, interval);
    const timestamps = result.timestamp ?? [];
    const quote = result.indicators?.quote?.[0];
    if (!quote) return [];

    return timestamps.flatMap((time, index) => {
      const open = quote.open?.[index];
      const high = quote.high?.[index];
      const low = quote.low?.[index];
      const close = quote.close?.[index];
      const volume = quote.volume?.[index] ?? 0;
      if ([open, high, low, close].some((value) => typeof value !== "number")) return [];
      return [{ time, open: open!, high: high!, low: low!, close: close!, volume: volume ?? 0 }];
    });
  },
};
