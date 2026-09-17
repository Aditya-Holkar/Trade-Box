import type { Candle, MarketDataProvider, Quote } from "./types";

const BASE_URL = "https://query1.finance.yahoo.com";

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
    const result = await fetchChart(symbol.toUpperCase(), "1d", "1m");
    const meta = result.meta ?? {};
    const price = meta.regularMarketPrice;
    if (typeof price !== "number") throw new Error(`No quote available for ${symbol}`);

    const previousClose = meta.previousClose ?? meta.chartPreviousClose ?? null;
    const change = previousClose === null ? null : price - previousClose;
    const changePercent = previousClose ? (change! / previousClose) * 100 : null;

    return {
      symbol: meta.symbol ?? symbol.toUpperCase(),
      name: meta.shortName ?? meta.symbol ?? symbol.toUpperCase(),
      assetType: "stock",
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
    const result = await fetchChart(symbol.toUpperCase(), range, interval);
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
