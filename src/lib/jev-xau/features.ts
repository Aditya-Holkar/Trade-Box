export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  tickVolume: number;
  spread?: number;
}

export interface XauTick {
  time: number;
  bid: number;
  ask: number;
  last?: number;
  volume?: number;
}

export type Trend = "up" | "down" | "sideways";
export type Volatility = "low" | "normal" | "high";
export type Session = "asia" | "london" | "overlap" | "new_york" | "off_hours";

export interface FeatureState {
  timestamp: string;
  bid: number;
  ask: number;
  mid: number;
  spread: number;
  spreadBps: number;
  returnsBps: { last1m: number; last5m: number; last15m: number; last30m: number; last1h: number };
  technical: { rsi14: number; ema20: number; ema50: number; ema200: number; atr5m: number; atr15m: number; atr1h: number };
  market: { trend: Trend; volatility: Volatility; session: Session };
  volume: { tickVolume5m: number; tickVolume15m: number; relativeVolume: number };
  recentPrices: string;
}

export function ema(values: number[], period: number): number {
  if (!values.length) return 0;
  const p = Math.min(period, values.length);
  const k = 2 / (p + 1);
  let result = values.slice(0, p).reduce((a, b) => a + b, 0) / p;
  for (let i = p; i < values.length; i++) result = (values[i]! - result) * k + result;
  return result;
}

export function rsi(values: number[], period = 14): number {
  if (values.length < 2) return 50;
  const changes = values.slice(1).map((v, i) => v - values[i]!);
  const p = Math.min(period, changes.length);
  let gains = 0, losses = 0;
  for (const change of changes.slice(-p)) {
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }
  if (losses === 0) return 100;
  return Math.max(0, Math.min(100, 100 - 100 / (1 + gains / p / (losses / p))));
}

function trueRanges(candles: Candle[]): number[] {
  return candles.map((c, i) => {
    if (i === 0) return c.high - c.low;
    const prev = candles[i - 1]!;
    return Math.max(c.high - c.low, Math.abs(c.high - prev.close), Math.abs(c.low - prev.close));
  });
}

export function atr(candles: Candle[], period = 14): number {
  const ranges = trueRanges(candles).slice(-Math.min(period, candles.length));
  return ranges.length ? ranges.reduce((a, b) => a + b, 0) / ranges.length : 0;
}

function bps(closes: number[], bars: number): number {
  if (closes.length <= bars) return 0;
  const current = closes.at(-1)!;
  const previous = closes.at(-(bars + 1))!;
  return previous ? ((current - previous) / previous) * 10000 : 0;
}

function session(date = new Date()): Session {
  const h = date.getUTCHours();
  if (h < 7) return "asia";
  if (h < 12) return "london";
  if (h < 16) return "overlap";
  if (h < 21) return "new_york";
  return "off_hours";
}

function trend(mid: number, e20: number, e50: number, e200: number, r15: number): Trend {
  if (mid > e20 && e20 > e50 && e50 > e200 && r15 > 0) return "up";
  if (mid < e20 && e20 < e50 && e50 < e200 && r15 < 0) return "down";
  return "sideways";
}

function volatility(candles: Candle[], atr5m: number): Volatility {
  const recent = candles.slice(-20);
  if (!recent.length) return "normal";
  const avg = recent.reduce((s, c) => s + c.high - c.low, 0) / recent.length;
  if (!avg) return "normal";
  const ratio = atr5m / avg;
  if (ratio > 1.5) return "high";
  if (ratio < 0.65) return "low";
  return "normal";
}

export function calculateXauusdFeatures(candles: Candle[], tick: XauTick): FeatureState {
  if (!candles.length) throw new Error("No XAUUSD candles supplied");
  const closes = candles.map(c => c.close);
  const mid = (tick.bid + tick.ask) / 2;
  const spread = tick.ask - tick.bid;
  const spreadBps = mid ? (spread / mid) * 10000 : 0;
  const e20 = ema(closes, 20);
  const e50 = ema(closes, 50);
  const e200 = ema(closes, 200);
  const r15 = bps(closes, 3);
  const atr5m = atr(candles, 14);
  const atr15m = atr(candles, 42);
  const atr1h = atr(candles, 168);
  const recent = candles.slice(-30);
  const baseline = candles.slice(-30).reduce((s, c) => s + c.tickVolume, 0) / Math.min(30, candles.length);
  const last3 = candles.slice(-3).reduce((s, c) => s + c.tickVolume, 0);
  return {
    timestamp: new Date().toISOString(),
    bid: tick.bid, ask: tick.ask, mid, spread, spreadBps,
    returnsBps: {
      last1m: bps(closes, 1) / 5,
      last5m: bps(closes, 1),
      last15m: r15,
      last30m: bps(closes, 6),
      last1h: bps(closes, 12),
    },
    technical: {
      rsi14: rsi(closes),
      ema20: e20, ema50: e50, ema200: e200,
      atr5m, atr15m, atr1h,
    },
    market: {
      trend: trend(mid, e20, e50, e200, r15),
      volatility: volatility(candles, atr5m),
      session: session(),
    },
    volume: {
      tickVolume5m: candles.at(-1)?.tickVolume ?? 0,
      tickVolume15m: last3,
      relativeVolume: baseline > 0 ? last3 / (baseline * 3) : 1,
    },
    recentPrices: recent.map(c => c.close.toFixed(2)).join(" "),
  };
}
