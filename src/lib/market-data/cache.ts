import type { Candle, Quote } from "./types";

type CacheEntry<T> = { value: T; expiresAt: number };

const quoteCache = new Map<string, CacheEntry<Quote>>();
const historyCache = new Map<string, CacheEntry<Candle[]>>();

export function getCachedQuote(symbol: string) {
  const entry = quoteCache.get(symbol.toUpperCase());
  if (!entry || entry.expiresAt <= Date.now()) return null;
  return entry.value;
}

export function setCachedQuote(symbol: string, value: Quote, ttlMs = 30_000) {
  quoteCache.set(symbol.toUpperCase(), { value, expiresAt: Date.now() + ttlMs });
}

export function getCachedHistory(key: string) {
  const entry = historyCache.get(key);
  if (!entry || entry.expiresAt <= Date.now()) return null;
  return entry.value;
}

export function setCachedHistory(key: string, value: Candle[], ttlMs = 60_000) {
  historyCache.set(key, { value, expiresAt: Date.now() + ttlMs });
}
