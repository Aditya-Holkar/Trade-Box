import { getCachedHistory, getCachedQuote, setCachedHistory, setCachedQuote } from "./cache";
import { yahooProvider } from "./yahoo";
import type { Candle, Quote } from "./types";

export const providers = [yahooProvider];

export async function getQuote(symbol: string): Promise<Quote> {
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
