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

const tradingViewProvider: MarketDataProvider = {
  name: "TradingView",
  async getQuote(symbol: string): Promise<Quote> {
    const key = process.env.TRADINGVIEW_RAPIDAPI_KEY;
    if (!key) {
      throw new Error("TradingView fallback API key is not configured");
    }

    const tvSymbol = symbol.toUpperCase() === "XAUUSD" ? "OANDA:XAUUSD" : symbol.toUpperCase();
    const response = await fetch(
      "https://tradingview-data1.p.rapidapi.com/api/quote/" + encodeURIComponent(tvSymbol),
      {
        headers: {
          "x-rapidapi-host": "tradingview-data1.p.rapidapi.com",
          "x-rapidapi-key": key,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) throw new Error("TradingView quote unavailable");

    const body = (await response.json()) as {
      success?: boolean;
      data?: {
        data?: {
          bid?: number;
          ask?: number;
          lp?: number;
          prev_close_price?: number;
          ch?: number;
          chp?: number;
          high_price?: number;
          low_price?: number;
          volume?: number;
          lp_time?: number;
        };
      };
    };

    const data = body.data?.data;
    if (!body.success || !data || typeof data.lp !== "number") {
      throw new Error("TradingView returned no live price");
    }

    return {
      symbol: symbol.toUpperCase(),
      name: "Gold / US Dollar",
      assetType: "commodity",
      currency: "USD",
      price: data.lp,
      previousClose: typeof data.prev_close_price === "number" ? data.prev_close_price : null,
      change: typeof data.ch === "number" ? data.ch : null,
      changePercent: typeof data.chp === "number" ? data.chp : null,
      dayHigh: typeof data.high_price === "number" ? data.high_price : null,
      dayLow: typeof data.low_price === "number" ? data.low_price : null,
      volume: typeof data.volume === "number" ? data.volume : null,
      marketCap: null,
      timestamp:
        typeof data.lp_time === "number" ? data.lp_time * 1000 : Date.now(),
      provider: "TradingView",
      freshness: "live",
    };
  },
  async getHistory(symbol: string, range = "1mo", interval = "1d"): Promise<Candle[]> {
    const key = process.env.TRADINGVIEW_RAPIDAPI_KEY;
    if (!key) {
      throw new Error("TradingView fallback API key is not configured");
    }

    const tvSymbol = symbol.toUpperCase() === "XAUUSD" ? "OANDA:XAUUSD" : symbol.toUpperCase();
    const timeframeMap: Record<string, string> = {
      "1m": "1",
      "5m": "5",
      "15m": "15",
      "30m": "30",
      "1h": "60",
      "4h": "240",
      "1d": "D",
      "1w": "W",
      "1mo": "M",
    };

    const timeframe = timeframeMap[interval] ?? "D";
    const rangeMap: Record<string, number> = {
      "1d": 100,
      "5d": 500,
      "1mo": 1000,
      "3mo": 2500,
      "6mo": 3000,
      "1y": 5000,
      "5y": 5000,
    };

    const params = new URLSearchParams({
      timeframe,
      range: String(rangeMap[range] ?? 1000),
      type: "Japanese",
    });

    const response = await fetch(
      "https://tradingview-data1.p.rapidapi.com/api/price/" +
        encodeURIComponent(tvSymbol) +
        "?" +
        params.toString(),
      {
        headers: {
          "x-rapidapi-host": "tradingview-data1.p.rapidapi.com",
          "x-rapidapi-key": key,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) throw new Error("TradingView historical data unavailable");

    const body = (await response.json()) as {
      success?: boolean;
      data?: {
        history?: Array<{
          time?: number;
          open?: number;
          close?: number;
          max?: number;
          min?: number;
          volume?: number;
        }>;
      };
    };

    const history = body.data?.history;
    if (!body.success || !Array.isArray(history)) {
      throw new Error("TradingView returned no historical candles");
    }

    return history
      .filter(
        (bar) =>
          typeof bar.time === "number" &&
          typeof bar.open === "number" &&
          typeof bar.close === "number" &&
          typeof bar.max === "number" &&
          typeof bar.min === "number",
      )
      .map((bar) => ({
        time: bar.time as number,
        open: bar.open as number,
        high: bar.max as number,
        low: bar.min as number,
        close: bar.close as number,
        volume: typeof bar.volume === "number" ? bar.volume : 0,
      }))
      .sort((a, b) => a.time - b.time);
  },
};

export const providers = [yahooProvider];

export async function getQuote(symbol: string): Promise<Quote> {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) throw new Error("Symbol is required");

  // XAUUSD must never fall back to Yahoo/GC=F because that is gold futures,
  // not the TradingView-style spot XAUUSD instrument.
  if (normalized === "XAUUSD") {
    try {
      return await tickerLayerProvider.getQuote("XAUUSD");
    } catch (tickerError) {
      try {
        return await tradingViewProvider.getQuote("XAUUSD");
      } catch (tradingViewError) {
        throw new Error(
          "No live XAUUSD spot feed is available. TickerLayer failed and TradingView fallback is not configured or unavailable.",
          { cause: tradingViewError ?? tickerError },
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

  // XAUUSD history uses TradingView/OANDA spot data only. Never use Yahoo GC=F.
  if (normalized === "XAUUSD") {
    const candles = await tradingViewProvider.getHistory(normalized, range, interval);
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
