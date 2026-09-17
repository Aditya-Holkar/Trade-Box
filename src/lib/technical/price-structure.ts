import type { Candle } from "@/lib/market-data/types";

export type PriceLevel = { price: number; label: string; kind: "support" | "resistance" | "reference" };
export type FibonacciLevel = { ratio: number; price: number; label: string };

export type PriceStructure = {
  swingHigh: number | null;
  swingLow: number | null;
  support: PriceLevel[];
  resistance: PriceLevel[];
  fibonacci: FibonacciLevel[];
};

function swings(candles: Candle[], window = 2) {
  const highs: number[] = [];
  const lows: number[] = [];
  for (let i = window; i < candles.length - window; i++) {
    const range = candles.slice(i - window, i + window + 1);
    if (range.every((c, j) => j === window || candles[i].high >= c.high)) highs.push(candles[i].high);
    if (range.every((c, j) => j === window || candles[i].low <= c.low)) lows.push(candles[i].low);
  }
  return { highs, lows };
}

function uniqueLevels(values: number[], minDistance: number) {
  return values.filter((value, index) => values.findIndex((candidate) => Math.abs(candidate - value) <= minDistance) === index);
}

export function getPriceStructure(candles: Candle[]): PriceStructure {
  if (candles.length < 10) return { swingHigh: null, swingLow: null, support: [], resistance: [], fibonacci: [] };

  const { highs, lows } = swings(candles);
  const latest = candles.at(-1)!.close;
  const recent = candles.slice(-Math.min(80, candles.length));
  const rangeHigh = Math.max(...recent.map((c) => c.high));
  const rangeLow = Math.min(...recent.map((c) => c.low));
  const distance = Math.max((rangeHigh - rangeLow) * 0.01, latest * 0.001);

  const supportValues = uniqueLevels([...lows, rangeLow], distance)
    .filter((value) => value <= latest)
    .sort((a, b) => b - a)
    .slice(0, 4);
  const resistanceValues = uniqueLevels([...highs, rangeHigh], distance)
    .filter((value) => value >= latest)
    .sort((a, b) => a - b)
    .slice(0, 4);

  const high = highs.at(-1) ?? rangeHigh;
  const low = lows.at(-1) ?? rangeLow;
  const swingHigh = Math.max(high, low);
  const swingLow = Math.min(high, low);
  const span = swingHigh - swingLow;
  const fibonacci = span > 0
    ? [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1].map((ratio) => ({
        ratio,
        price: swingHigh - span * ratio,
        label: `${(ratio * 100).toFixed(1)}%`,
      }))
    : [];

  return {
    swingHigh,
    swingLow,
    support: supportValues.map((price, index) => ({ price, label: index === 0 ? "Nearest support" : `Support ${index + 1}`, kind: "support" })),
    resistance: resistanceValues.map((price, index) => ({ price, label: index === 0 ? "Nearest resistance" : `Resistance ${index + 1}`, kind: "resistance" })),
    fibonacci,
  };
}
