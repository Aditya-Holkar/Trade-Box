import type { Candle } from "@/lib/market-data/types";
import { atr, bollinger, ema, macd, obv, relativeVolume, rsi, sma, stochastic, vwap } from "./indicators";

export type AnalysisCategory = "trend" | "momentum" | "volume" | "volatility" | "structure";
export type AnalysisObservation = {
  category: AnalysisCategory;
  title: string;
  detail: string;
  state: "bullish" | "bearish" | "neutral";
};

export type TechnicalAnalysis = {
  symbol?: string;
  lastPrice: number | null;
  observations: AnalysisObservation[];
  support: number | null;
  resistance: number | null;
  regime: "trending" | "range-bound" | "mixed" | "insufficient-data";
};

function last<T>(values: T[]): T | undefined { return values[values.length - 1]; }

function swings(candles: Candle[], window = 2) {
  const highs: number[] = [];
  const lows: number[] = [];
  for (let i = window; i < candles.length - window; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    if (candles.slice(i - window, i + window + 1).every((c, j) => j === window || high >= c.high)) highs.push(high);
    if (candles.slice(i - window, i + window + 1).every((c, j) => j === window || low <= c.low)) lows.push(low);
  }
  return { highs, lows };
}

export function analyzeTechnical(candles: Candle[], symbol?: string): TechnicalAnalysis {
  if (candles.length < 30) return { symbol, lastPrice: candles.at(-1)?.close ?? null, observations: [], support: null, resistance: null, regime: "insufficient-data" };

  const price = candles.at(-1)!.close;
  const sma20 = last(sma(candles, 20))?.value;
  const sma50 = last(sma(candles, 50))?.value;
  const ema20 = last(ema(candles, 20))?.value;
  const rsi14 = last(rsi(candles, 14))?.value;
  const macdValue = last(macd(candles));
  const boll = last(bollinger(candles));
  const atr14 = last(atr(candles))?.value;
  const stoch = last(stochastic(candles))?.value;
  const volumeRatio = last(relativeVolume(candles))?.value;
  const obvNow = last(obv(candles))?.value;
  const obvPrev = obv(candles).at(-6)?.value;
  const vwapNow = last(vwap(candles))?.value;
  const observations: AnalysisObservation[] = [];

  if (ema20 !== undefined && sma50 !== undefined) {
    observations.push({ category: "trend", title: "Moving-average structure", state: price > ema20 && ema20 > sma50 ? "bullish" : price < ema20 && ema20 < sma50 ? "bearish" : "neutral", detail: `Price ${price > ema20 ? "is above" : "is below"} EMA20; EMA20 is ${ema20 > sma50 ? "above" : "below"} SMA50.` });
  }
  if (sma20 !== undefined && sma50 !== undefined) {
    observations.push({ category: "trend", title: "SMA alignment", state: sma20 > sma50 ? "bullish" : sma20 < sma50 ? "bearish" : "neutral", detail: `SMA20 is ${sma20 > sma50 ? "above" : "below"} SMA50.` });
  }
  if (vwapNow !== undefined) observations.push({ category: "trend", title: "VWAP position", state: price > vwapNow ? "bullish" : price < vwapNow ? "bearish" : "neutral", detail: `Price is ${price > vwapNow ? "above" : "below"} session VWAP.` });
  if (rsi14 !== undefined) observations.push({ category: "momentum", title: "RSI regime", state: rsi14 >= 55 ? "bullish" : rsi14 <= 45 ? "bearish" : "neutral", detail: `RSI14 is ${rsi14.toFixed(1)}; ${rsi14 > 70 ? "above the conventional overbought zone" : rsi14 < 30 ? "below the conventional oversold zone" : "inside the central range"}.` });
  if (macdValue) observations.push({ category: "momentum", title: "MACD momentum", state: macdValue.macd > macdValue.signal ? "bullish" : macdValue.macd < macdValue.signal ? "bearish" : "neutral", detail: `MACD ${macdValue.macd >= macdValue.signal ? "is above" : "is below"} its signal line; histogram is ${macdValue.histogram.toFixed(3)}.` });
  if (stoch !== undefined) observations.push({ category: "momentum", title: "Stochastic", state: stoch >= 55 ? "bullish" : stoch <= 45 ? "bearish" : "neutral", detail: `%K is ${stoch.toFixed(1)}.` });
  if (boll && atr14 !== undefined) observations.push({ category: "volatility", title: "Volatility context", state: price > boll.upper ? "bearish" : price < boll.lower ? "bullish" : "neutral", detail: `ATR14 is ${atr14.toFixed(2)}; price is ${price > boll.upper ? "above" : price < boll.lower ? "below" : "inside"} the Bollinger envelope.` });
  if (volumeRatio !== undefined) observations.push({ category: "volume", title: "Relative volume", state: volumeRatio >= 1.5 ? "bullish" : volumeRatio <= 0.7 ? "bearish" : "neutral", detail: `Latest volume is ${volumeRatio.toFixed(2)}× its 20-bar average.` });
  if (obvNow !== undefined && obvPrev !== undefined) observations.push({ category: "volume", title: "OBV direction", state: obvNow > obvPrev ? "bullish" : obvNow < obvPrev ? "bearish" : "neutral", detail: `OBV is ${obvNow > obvPrev ? "rising" : obvNow < obvPrev ? "falling" : "flat"} over the recent window.` });

  const { highs, lows } = swings(candles);
  const resistance = highs.at(-1) ?? null;
  const support = lows.at(-1) ?? null;
  if (support !== null && resistance !== null) {
    const breakout = price > resistance;
    const breakdown = price < support;
    observations.push({ category: "structure", title: breakout ? "Resistance breakout" : breakdown ? "Support breakdown" : "Market structure", state: breakout ? "bullish" : breakdown ? "bearish" : "neutral", detail: breakout ? `Price is above the latest confirmed swing high near ${resistance.toFixed(2)}.` : breakdown ? `Price is below the latest confirmed swing low near ${support.toFixed(2)}.` : `Nearest confirmed swing levels are support ${support.toFixed(2)} and resistance ${resistance.toFixed(2)}.` });
  }

  const trendStates = observations.filter((x) => x.category === "trend").map((x) => x.state);
  const bullishTrend = trendStates.filter((x) => x === "bullish").length;
  const bearishTrend = trendStates.filter((x) => x === "bearish").length;
  const regime = bullishTrend >= 2 || bearishTrend >= 2 ? "trending" : "range-bound";

  return { symbol, lastPrice: price, observations, support, resistance, regime };
}
