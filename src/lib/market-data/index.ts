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

const xausProvider: MarketDataProvider = {
  name: "XAUS",
  async getQuote(symbol: string): Promise<Quote> {
    if (symbol.trim().toUpperCase() !== "XAUUSD") {
      throw new Error("XAUS fallback only supports XAUUSD");
    }

    const response = await fetch(
      "https://xaus.com/api/v1/spot?compact=1&fresh=" + Date.now(),
      {
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!response.ok) throw new Error(`XAUS returned HTTP ${response.status}`);

    const body = (await response.json()) as {
      spot_usd_oz?: number;
      updated_at?: string;
      price_as_of?: string;
      data_state?: {
        status?: "fresh" | "stale" | "unavailable";
        age_seconds?: number;
      };
    };

    if (
      typeof body.spot_usd_oz !== "number" ||
      !Number.isFinite(body.spot_usd_oz) ||
      body.spot_usd_oz <= 0 ||
      body.data_state?.status === "unavailable"
    ) {
      throw new Error("XAUS returned no usable XAU/USD spot price");
    }

    const observedAt = body.price_as_of ?? body.updated_at;
    const timestamp = observedAt ? Date.parse(observedAt) : Date.now();
    const age = body.data_state?.age_seconds ?? 0;

    if (!Number.isFinite(timestamp) || age > 120 || body.data_state?.status === "stale") {
      throw new Error("XAUS XAU/USD spot price is stale");
    }

    return {
      symbol: "XAUUSD",
      name: "Gold / US Dollar",
      assetType: "commodity",
      currency: "USD",
      price: body.spot_usd_oz,
      previousClose: null,
      change: null,
      changePercent: null,
      dayHigh: null,
      dayLow: null,
      volume: null,
      marketCap: null,
      timestamp,
      provider: "XAUS",
      freshness: "live",
    };
  },

  async getHistory(symbol: string, range = "1mo", interval = "1d"): Promise<Candle[]> {
    if (symbol.trim().toUpperCase() !== "XAUUSD") {
      throw new Error("XAUS history only supports XAUUSD");
    }

    if (interval === "1d" || interval === "1w" || interval === "1mo") {
      const response = await fetch(
        "https://xaus.com/api/v1/history?fresh=" + Date.now(),
        { cache: "no-store", signal: AbortSignal.timeout(10_000) },
      );
      if (!response.ok) throw new Error(`XAUS history returned HTTP ${response.status}`);

      const body = (await response.json()) as {
        points?: Array<{ d?: string; o?: number; c?: number; h?: number; l?: number }>;
      };
      const points = body.points ?? [];
      const candles = points
        .filter(
          (p) =>
            typeof p.d === "string" &&
            typeof p.c === "number" &&
            typeof p.h === "number" &&
            typeof p.l === "number",
        )
        .map((p) => ({
          time: Math.floor(Date.parse(p.d as string) / 1000),
          open: typeof p.o === "number" ? p.o : (p.c as number),
          high: p.h as number,
          low: p.l as number,
          close: p.c as number,
          volume: 0,
        }))
        .filter((p) => Number.isFinite(p.time))
        .sort((a, b) => a.time - b.time);

      if (!candles.length) throw new Error("XAUS returned no daily XAU/USD history");
      return candles;
    }

    const response = await fetch(
      "https://xaus.com/api/v1/intraday?symbol=xau&hours=48&fresh=" + Date.now(),
      { cache: "no-store", signal: AbortSignal.timeout(10_000) },
    );
    if (!response.ok) throw new Error(`XAUS intraday returned HTTP ${response.status}`);

    const body = (await response.json()) as {
      points?: Array<{ t?: string | number; p?: number }>;
      data_state?: { status?: string; age_seconds?: number };
    };
    const points = body.points ?? [];
    const raw = points
      .map((p) => ({
        time:
          typeof p.t === "number"
            ? (p.t > 2_000_000_000 ? Math.floor(p.t / 1000) : Math.floor(p.t))
            : Math.floor(Date.parse(p.t ?? "") / 1000),
        price: Number(p.p),
      }))
      .filter((p) => Number.isFinite(p.time) && Number.isFinite(p.price) && p.price > 0)
      .sort((a, b) => a.time - b.time);

    if (raw.length < 2) throw new Error("XAUS returned insufficient intraday XAU/USD history");

    const minutes = interval === "5m" ? 5 : interval === "15m" ? 15 : interval === "30m" ? 30 : interval === "1h" ? 60 : 2;
    const bucket = new Map<number, number[]>();
    for (const point of raw) {
      const start = Math.floor(point.time / (minutes * 60)) * minutes * 60;
      const values = bucket.get(start) ?? [];
      values.push(point.price);
      bucket.set(start, values);
    }

    return [...bucket.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([time, values]) => ({
        time,
        open: values[0],
        high: Math.max(...values),
        low: Math.min(...values),
        close: values[values.length - 1],
        volume: 0,
      }));
  },
};

export const providers = [yahooProvider];

export async function getQuote(symbol: string): Promise<Quote> {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) throw new Error("Symbol is required");

  // XAUUSD stays entirely on keyless spot data: TickerLayer first, XAUS fallback.
  if (normalized === "XAUUSD") {
    try {
      return await tickerLayerProvider.getQuote("XAUUSD");
    } catch (tickerError) {
      try {
        return await xausProvider.getQuote("XAUUSD");
      } catch (fallbackError) {
        throw new Error(
          "No live XAUUSD spot feed is available. TickerLayer and keyless XAUS both failed.",
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

  // XAUUSD history also stays off Yahoo: XAUS provides keyless
  // recorded 2-minute intraday points and daily history.
  if (normalized === "XAUUSD") {
    const candles = await xausProvider.getHistory(normalized, range, interval);
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
