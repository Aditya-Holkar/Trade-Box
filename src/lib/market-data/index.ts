import { getCachedHistory, getCachedQuote, setCachedHistory, setCachedQuote } from "./cache";
import { yahooProvider } from "./yahoo";
import type { Candle, MarketDataProvider, Quote } from "./types";

const tickerLayerProvider: MarketDataProvider = {
  name: "TickerLayer",
  async getQuote(symbol: string): Promise<Quote> {
    const key = process.env.TICKERLAYER_API_KEY;
    if (!key) throw new Error("TickerLayer API key is not configured in Vercel");
    const response = await fetch(
      "https://api.tickerlayer.com/v1/quote?asset_class=commodities&symbol=" +
        encodeURIComponent(symbol.toUpperCase()),
      {
        headers: { Authorization: "Bearer " + key },
        cache: "no-store",
      },
    );
    if (!response.ok) throw new Error("TickerLayer quote unavailable");
    const body = (await response.json()) as {
      bid?: number;
      ask?: number;
      timestamp?: number;
    };
    if (typeof body.bid !== "number" || typeof body.ask !== "number") {
      throw new Error("TickerLayer returned no bid/ask");
    }
    const price = (body.bid + body.ask) / 2;
    return {
      symbol: symbol.toUpperCase(),
      name: "Gold / US Dollar",
      assetType: "commodity",
      currency: "USD",
      price,
      previousClose: null,
      change: null,
      changePercent: null,
      dayHigh: null,
      dayLow: null,
      volume: null,
      marketCap: null,
      timestamp: body.timestamp ?? Date.now(),
      provider: "TickerLayer",
      freshness: "live",
    };
  },
  async getHistory() {
    throw new Error("TickerLayer history is not enabled in this provider adapter");
  },
};

const goldPriceProvider: MarketDataProvider = {
  name: "GoldPrice.dev",
  async getQuote(symbol: string): Promise<Quote> {
    if (symbol.trim().toUpperCase() !== "XAUUSD") {
      throw new Error("GoldPrice.dev fallback only supports XAUUSD");
    }

    const response = await fetch(
      "https://api.goldprice.dev/v1/spot/XAU-USD-SPOT",
      {
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!response.ok) {
      throw new Error(`GoldPrice.dev returned HTTP ${response.status}`);
    }

    const body = (await response.json()) as {
      symbol?: string;
      quote_currency?: string;
      price?: string | number;
      bid?: string | number;
      ask?: string | number;
      is_stale?: boolean;
      computed_at?: string;
    };

    const price = Number(body.price);
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error("GoldPrice.dev returned no valid XAU/USD price");
    }

    const computedAt = body.computed_at ? Date.parse(body.computed_at) : Date.now();
    const timestamp = Number.isFinite(computedAt) ? computedAt : Date.now();

    if (body.is_stale === true) {
      throw new Error("GoldPrice.dev returned a stale XAU/USD price");
    }

    const bid = body.bid == null ? null : Number(body.bid);
    const ask = body.ask == null ? null : Number(body.ask);

    return {
      symbol: "XAUUSD",
      name: "Gold / US Dollar",
      assetType: "commodity",
      currency: body.quote_currency ?? "USD",
      price,
      previousClose: null,
      change: null,
      changePercent: null,
      dayHigh: null,
      dayLow: null,
      volume: null,
      marketCap: null,
      timestamp,
      provider: "GoldPrice.dev",
      freshness: "live",
      ...(bid !== null || ask !== null ? { bid, ask } : {}),
    } as Quote & { bid?: number | null; ask?: number | null };
  },
  async getHistory() {
    throw new Error("GoldPrice.dev anonymous fallback does not provide the intraday history required by this adapter");
  },
};


export const providers = [yahooProvider];

export async function getQuote(symbol: string): Promise<Quote> {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) throw new Error("Symbol is required");

  // XAUUSD quote must stay on a spot feed. If TickerLayer is unavailable,
  // use the keyless GoldPrice.dev spot endpoint rather than GC=F futures.
  if (normalized === "XAUUSD") {
    try {
      return await tickerLayerProvider.getQuote("XAUUSD");
    } catch (tickerError) {
      try {
        return await goldPriceProvider.getQuote("XAUUSD");
      } catch (fallbackError) {
        throw new Error(
          "No live XAUUSD spot feed is available. TickerLayer and the keyless GoldPrice.dev fallback both failed.",
          { cause: fallbackError ?? tickerError },
        );
      }
    }
  }

  const cached = getCachedQuote(normalized);
  if (cached) return cached;
  let lastError: unknown;
  for (const provider of providers) {
    try {
      const quote = await provider.getQuote(normalized);
      setCachedQuote(normalized, quote);
      return quote;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("No market-data provider is available");
}

export async function getHistory(
  symbol: string,
  range = "1mo",
  interval = "1d",
): Promise<Candle[]> {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) throw new Error("Symbol is required");
  const key = normalized + ":" + range + ":" + interval;
  const cached = getCachedHistory(key);
  if (cached) return cached;

  // Live XAUUSD is spot, but anonymous spot history is not available at the
  // intraday depth this app needs. Use Yahoo GC=F only as a historical
  // technical proxy; never use it for the displayed live XAUUSD price.
  if (normalized === "XAUUSD") {
    const candles = await yahooProvider.getHistory(normalized, range, interval);
    setCachedHistory(key, candles);
    return candles;
  }

  let lastError: unknown;
  for (const provider of providers) {
    try {
      const candles = await provider.getHistory(normalized, range, interval);
      setCachedHistory(key, candles);
      return candles;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("No market-data provider is available");
}
