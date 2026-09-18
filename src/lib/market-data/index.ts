import { getCachedHistory, getCachedQuote, setCachedHistory, setCachedQuote } from "./cache";
import { yahooProvider } from "./yahoo";

const tickerLayerProvider: MarketDataProvider = {
  name: "TickerLayer",
  async getQuote(symbol: string): Promise<Quote> {
    const key = process.env.TICKERLAYER_API_KEY;
    if (!key) throw new Error("TickerLayer API key is not configured");
    const response = await fetch("https://api.tickerlayer.com/v1/quote?asset_class=commodities&symbol="+encodeURIComponent(symbol.toUpperCase()), { headers: { Authorization: "Bearer "+key }, cache: "no-store" });
    if (!response.ok) throw new Error("TickerLayer quote unavailable");
    const body = await response.json() as { bid?:number; ask?:number; timestamp?:number; symbol?:string };
    if (typeof body.bid !== "number" || typeof body.ask !== "number") throw new Error("TickerLayer returned no bid/ask");
    const price=(body.bid+body.ask)/2;
    return { symbol:symbol.toUpperCase(), name:"Gold / US Dollar", assetType:"commodity", currency:"USD", price, previousClose:null, change:null, changePercent:null, dayHigh:null, dayLow:null, volume:null, marketCap:null, timestamp:body.timestamp??Date.now(), provider:"TickerLayer", freshness:"live" };
  },
  async getHistory(){ throw new Error("TickerLayer history is not enabled in this provider adapter"); }
};
import type { Candle, Quote } from "./types";

export const providers = [yahooProvider];

export async function getQuote(symbol: string): Promise<Quote> {
  if (symbol.trim().toUpperCase() === "XAUUSD") {
    try { return await tickerLayerProvider.getQuote("XAUUSD"); } catch { /* fall through to Yahoo */ }
  }
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) throw new Error("Symbol is required");

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

export async function getHistory(symbol: string, range = "1mo", interval = "1d"): Promise<Candle[]> {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) throw new Error("Symbol is required");
  const key = `${normalized}:${range}:${interval}`;
  const cached = getCachedHistory(key);
  if (cached) return cached;

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
