import type { Candle, Quote } from "@/lib/market-data/types";
import { getHistory, getQuote } from "@/lib/market-data";
import { analyzeTechnical, type TechnicalAnalysis } from "@/lib/technical/analysis-engine";
import { backtestTrendMomentum, type BacktestResult } from "./backtest";

export type FundamentalSnapshot = {
  revenue: number | null;
  netIncome: number | null;
  eps: number | null;
  freeCashFlow: number | null;
  pe: number | null;
  debtToEquity: number | null;
  roe: number | null;
  source: string;
  available: boolean;
};

export type NewsItem = { title: string; link: string; publishedAt: string | null; sentiment: "positive" | "negative" | "neutral" };

export type TradeSetup = {
  direction: "BUY" | "SELL" | "WAIT";
  entryLow: number | null;
  entryHigh: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  riskReward: number | null;
  invalidation: string;
  rationale: string[];
};

export type IntelligenceReport = {
  symbol: string;
  quote: Quote;
  technical: TechnicalAnalysis;
  fundamentals: FundamentalSnapshot;
  news: NewsItem[];
  backtest: BacktestResult;
  setup: TradeSetup;
  dataWarnings: string[];
  generatedAt: number;
};

async function yahooFundamentals(symbol: string): Promise<FundamentalSnapshot> {
  const empty: FundamentalSnapshot = { revenue: null, netIncome: null, eps: null, freeCashFlow: null, pe: null, debtToEquity: null, roe: null, source: "Unavailable", available: false };
  try {
    const encoded = encodeURIComponent(symbol.toUpperCase());
    const types = ["annualTotalRevenue", "annualNetIncome", "annualDilutedEPS", "annualFreeCashFlow", "trailingPeRatio", "quarterlyTotalRevenue", "quarterlyNetIncome"];
    const url = `https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encoded}?symbol=${encoded}&type=${types.join(",")}&period1=1577836800&period2=${Math.floor(Date.now() / 1000)}&merge=false&padTimeSeries=true`;
    const response = await fetch(url, { headers: { "User-Agent": "Trade-Box/0.1" }, next: { revalidate: 3600 } });
    if (!response.ok) return empty;
    const body = await response.json() as { timeseries?: { result?: Array<Record<string, unknown>> } };
    const rows = body.timeseries?.result ?? [];
    const latest = (name: string) => {
      const row = rows.find((r) => Array.isArray(r[name]) && (r[name] as unknown[]).length);
      const values = row?.[name] as Array<Record<string, unknown>> | undefined;
      const value = values?.at(-1)?.reportedValue as Record<string, unknown> | undefined;
      return typeof value?.raw === "number" ? value.raw : null;
    };
    const revenue = latest("annualTotalRevenue");
    const netIncome = latest("annualNetIncome");
    const eps = latest("annualDilutedEPS");
    const freeCashFlow = latest("annualFreeCashFlow");
    const pe = latest("trailingPeRatio");
    return { revenue, netIncome, eps, freeCashFlow, pe, debtToEquity: null, roe: null, source: "Yahoo Finance fundamentals", available: [revenue, netIncome, eps, freeCashFlow, pe].some((x) => x !== null) };
  } catch {
    return empty;
  }
}

function sentiment(title: string): NewsItem["sentiment"] {
  const text = title.toLowerCase();
  const positive = ["beats", "beat", "upgrade", "growth", "surge", "rises", "profit", "record", "bullish", "buy", "strong", "positive", "approval", "wins"];
  const negative = ["miss", "misses", "downgrade", "fall", "falls", "loss", "warning", "lawsuit", "cut", "weak", "negative", "fraud", "drop", "decline"];
  const p = positive.filter((w) => text.includes(w)).length;
  const n = negative.filter((w) => text.includes(w)).length;
  return p > n ? "positive" : n > p ? "negative" : "neutral";
}

async function yahooNews(symbol: string): Promise<NewsItem[]> {
  try {
    const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`;
    const response = await fetch(url, { next: { revalidate: 300 } });
    if (!response.ok) return [];
    const xml = await response.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 10);
    return items.map((match) => {
      const block = match[1];
      const get = (tag: string) => block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").trim() ?? "";
      const title = get("title");
      return { title, link: get("link"), publishedAt: get("pubDate") || null, sentiment: sentiment(title) };
    }).filter((item) => item.title);
  } catch {
    return [];
  }
}

function buildSetup(quote: Quote, technical: TechnicalAnalysis): TradeSetup {
  const price = quote.price;
  const bullish = technical.observations.filter((x) => x.state === "bullish").length;
  const bearish = technical.observations.filter((x) => x.state === "bearish").length;
  const support = technical.support;
  const resistance = technical.resistance;
  if (!support || !resistance) return { direction: "WAIT", entryLow: null, entryHigh: null, stop: null, target1: null, target2: null, riskReward: null, invalidation: "Wait for confirmed support/resistance and sufficient data.", rationale: ["Insufficient structural levels for a defined setup."] };
  const bullishSetup = bullish >= bearish + 2 && price >= support && price <= resistance * 1.01;
  const bearishSetup = bearish >= bullish + 2 && price <= resistance && price >= support * 0.99;
  if (bullishSetup) {
    const risk = Math.max(price - support, price * 0.005);
    const stop = price - risk;
    const target1 = price + risk * 2;
    const target2 = price + risk * 3;
    return { direction: "BUY", entryLow: Math.min(price, price * 1.002), entryHigh: Math.max(price, price * 1.002), stop, target1, target2, riskReward: 2, invalidation: `Invalidate if price closes below ${support.toFixed(2)}.`, rationale: ["Technical factors have a bullish majority.", `Support is near ${support.toFixed(2)}.`, `Resistance is near ${resistance.toFixed(2)}.`] };
  }
  if (bearishSetup) {
    const risk = Math.max(resistance - price, price * 0.005);
    const stop = price + risk;
    const target1 = price - risk * 2;
    const target2 = price - risk * 3;
    return { direction: "SELL", entryLow: Math.min(price * 0.998, price), entryHigh: Math.max(price * 0.998, price), stop, target1, target2, riskReward: 2, invalidation: `Invalidate if price closes above ${resistance.toFixed(2)}.`, rationale: ["Technical factors have a bearish majority.", `Resistance is near ${resistance.toFixed(2)}.`, `Support is near ${support.toFixed(2)}.`] };
  }
  return { direction: "WAIT", entryLow: null, entryHigh: null, stop: null, target1: null, target2: null, riskReward: null, invalidation: "Wait for trend confirmation or a clean support/resistance break.", rationale: ["Technical factors are mixed; forcing a trade would reduce signal quality."] };
}

export async function analyzeSymbol(symbol: string): Promise<IntelligenceReport> {
  const normalized = symbol.trim().toUpperCase();
  const [quote, candles, fundamentals, news] = await Promise.all([
    getQuote(normalized),
    getHistory(normalized, "1y", "1d"),
    yahooFundamentals(normalized),
    yahooNews(normalized),
  ]);
  const technical = analyzeTechnical(candles, normalized);
  const backtest = backtestTrendMomentum(candles);
  const setup = buildSetup(quote, technical);
  const dataWarnings: string[] = [];
  if (!fundamentals.available) dataWarnings.push("Fundamental data is unavailable for this symbol from the current provider.");
  if (!news.length) dataWarnings.push("No recent news was returned by the current news feed.");
  dataWarnings.push("Market data may be delayed; the setup is research output, not an execution instruction.");
  return { symbol: normalized, quote, technical, fundamentals, news, backtest, setup, dataWarnings, generatedAt: Date.now() };
}
