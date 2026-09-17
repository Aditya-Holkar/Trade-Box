import type { Candle } from "@/lib/market-data/types";

export type IndicatorPoint = { time: number; value: number };
export type BollingerPoint = { time: number; middle: number; upper: number; lower: number };
export type MacdPoint = { time: number; macd: number; signal: number; histogram: number };

function valid(values: Array<number | null | undefined>): number[] {
  return values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

export function sma(candles: Candle[], period: number): IndicatorPoint[] {
  if (period <= 0) return [];
  const out: IndicatorPoint[] = [];
  for (let i = period - 1; i < candles.length; i++) {
    const window = valid(candles.slice(i - period + 1, i + 1).map((c) => c.close));
    if (window.length !== period) continue;
    out.push({ time: candles[i].time, value: window.reduce((a, b) => a + b, 0) / period });
  }
  return out;
}

export function ema(candles: Candle[], period: number): IndicatorPoint[] {
  if (period <= 0 || candles.length < period) return [];
  const closes = candles.map((c) => c.close);
  let previous = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const multiplier = 2 / (period + 1);
  const out: IndicatorPoint[] = [{ time: candles[period - 1].time, value: previous }];
  for (let i = period; i < closes.length; i++) {
    previous = (closes[i] - previous) * multiplier + previous;
    out.push({ time: candles[i].time, value: previous });
  }
  return out;
}

export function vwap(candles: Candle[]): IndicatorPoint[] {
  let cumulativePriceVolume = 0;
  let cumulativeVolume = 0;
  return candles.flatMap((c) => {
    if (!Number.isFinite(c.volume) || c.volume <= 0) return [];
    const typical = (c.high + c.low + c.close) / 3;
    cumulativePriceVolume += typical * c.volume;
    cumulativeVolume += c.volume;
    return [{ time: c.time, value: cumulativePriceVolume / cumulativeVolume }];
  });
}

export function rsi(candles: Candle[], period = 14): IndicatorPoint[] {
  if (period <= 0 || candles.length <= period) return [];
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const change = candles[i].close - candles[i - 1].close;
    gains += Math.max(change, 0);
    losses += Math.max(-change, 0);
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  const out: IndicatorPoint[] = [{ time: candles[period].time, value: avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss) }];
  for (let i = period + 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    avgGain = (avgGain * (period - 1) + Math.max(change, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-change, 0)) / period;
    out.push({ time: candles[i].time, value: avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss) });
  }
  return out;
}

export function macd(candles: Candle[], fast = 12, slow = 26, signal = 9): MacdPoint[] {
  const fastEma = ema(candles, fast);
  const slowEma = ema(candles, slow);
  const slowByTime = new Map(slowEma.map((p) => [p.time, p.value]));
  const macdLine: IndicatorPoint[] = fastEma.flatMap((p) => {
    const slowValue = slowByTime.get(p.time);
    return slowValue === undefined ? [] : [{ time: p.time, value: p.value - slowValue }];
  });
  if (macdLine.length < signal) return [];
  let signalValue = macdLine.slice(0, signal).reduce((sum, p) => sum + p.value, 0) / signal;
  const multiplier = 2 / (signal + 1);
  const out: MacdPoint[] = [{ time: macdLine[signal - 1].time, macd: macdLine[signal - 1].value, signal: signalValue, histogram: macdLine[signal - 1].value - signalValue }];
  for (let i = signal; i < macdLine.length; i++) {
    signalValue = (macdLine[i].value - signalValue) * multiplier + signalValue;
    out.push({ time: macdLine[i].time, macd: macdLine[i].value, signal: signalValue, histogram: macdLine[i].value - signalValue });
  }
  return out;
}

export function bollinger(candles: Candle[], period = 20, multiplier = 2): BollingerPoint[] {
  const out: BollingerPoint[] = [];
  for (let i = period - 1; i < candles.length; i++) {
    const values = candles.slice(i - period + 1, i + 1).map((c) => c.close);
    const middle = values.reduce((a, b) => a + b, 0) / period;
    const variance = values.reduce((sum, value) => sum + (value - middle) ** 2, 0) / period;
    const deviation = Math.sqrt(variance);
    out.push({ time: candles[i].time, middle, upper: middle + multiplier * deviation, lower: middle - multiplier * deviation });
  }
  return out;
}

export function atr(candles: Candle[], period = 14): IndicatorPoint[] {
  if (candles.length <= period) return [];
  const tr = candles.slice(1).map((c, index) => Math.max(c.high - c.low, Math.abs(c.high - candles[index].close), Math.abs(c.low - candles[index].close)));
  let value = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const out: IndicatorPoint[] = [{ time: candles[period].time, value }];
  for (let i = period; i < tr.length; i++) {
    value = (value * (period - 1) + tr[i]) / period;
    out.push({ time: candles[i + 1].time, value });
  }
  return out;
}

export function stochastic(candles: Candle[], period = 14): IndicatorPoint[] {
  if (candles.length < period) return [];
  return candles.slice(period - 1).flatMap((c, offset) => {
    const i = offset + period - 1;
    const window = candles.slice(i - period + 1, i + 1);
    const high = Math.max(...window.map((x) => x.high));
    const low = Math.min(...window.map((x) => x.low));
    return [{ time: c.time, value: high === low ? 50 : ((c.close - low) / (high - low)) * 100 }];
  });
}

export function obv(candles: Candle[]): IndicatorPoint[] {
  let value = 0;
  return candles.map((c, i) => {
    if (i > 0) value += c.close > candles[i - 1].close ? c.volume : c.close < candles[i - 1].close ? -c.volume : 0;
    return { time: c.time, value };
  });
}

export function relativeVolume(candles: Candle[], period = 20): IndicatorPoint[] {
  return candles.flatMap((c, i) => {
    if (i < period) return [];
    const average = candles.slice(i - period, i).reduce((sum, x) => sum + x.volume, 0) / period;
    return [{ time: c.time, value: average > 0 ? c.volume / average : 0 }];
  });
}
