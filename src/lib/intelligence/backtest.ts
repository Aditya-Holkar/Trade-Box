import type { Candle } from "@/lib/market-data/types";

export type BacktestTrade = {
  side: "long" | "short";
  entryTime: number;
  exitTime: number;
  entry: number;
  exit: number;
  stop: number;
  target: number;
  returnPct: number;
  rMultiple: number;
  barsHeld: number;
};

export type BacktestResult = {
  strategy: string;
  trades: BacktestTrade[];
  initialCapital: number;
  finalCapital: number;
  totalReturnPct: number;
  winRatePct: number;
  profitFactor: number;
  maxDrawdownPct: number;
  expectancyR: number;
  sharpe: number | null;
  averageBarsHeld: number;
};

type Snapshot = { ema20: number; sma50: number; rsi: number; atr: number };

function snapshot(candles: Candle[], i: number): Snapshot | null {
  if (i < 50) return null;
  const closes = candles.slice(0, i + 1).map((c) => c.close);
  const emaSeed = closes.slice(0, 20).reduce((a, b) => a + b, 0) / 20;
  let ema20 = emaSeed;
  const k = 2 / 21;
  for (let j = 20; j < closes.length; j++) ema20 = (closes[j] - ema20) * k + ema20;
  const sma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / 50;
  let gains = 0;
  let losses = 0;
  for (let j = closes.length - 14; j < closes.length; j++) {
    const change = closes[j] - closes[j - 1];
    gains += Math.max(change, 0);
    losses += Math.max(-change, 0);
  }
  const avgGain = gains / 14;
  const avgLoss = losses / 14;
  const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  let atr = 0;
  for (let j = i - 13; j <= i; j++) {
    const prevClose = candles[j - 1].close;
    atr += Math.max(candles[j].high - candles[j].low, Math.abs(candles[j].high - prevClose), Math.abs(candles[j].low - prevClose));
  }
  return { ema20, sma50, rsi, atr: atr / 14 };
}

export function backtestTrendMomentum(candles: Candle[], initialCapital = 100000): BacktestResult {
  const trades: BacktestTrade[] = [];
  let capital = initialCapital;
  let equityPeak = capital;
  let maxDrawdownPct = 0;
  let position: { side: "long" | "short"; entry: number; stop: number; target: number; entryIndex: number } | null = null;

  for (let i = 51; i < candles.length; i++) {
    const previous = snapshot(candles, i - 1);
    const candle = candles[i];
    if (!previous) continue;

    if (position) {
      const hitStop = position.side === "long" ? candle.low <= position.stop : candle.high >= position.stop;
      const hitTarget = position.side === "long" ? candle.high >= position.target : candle.low <= position.target;
      if (hitStop || hitTarget) {
        const exit = hitStop ? position.stop : position.target;
        const direction = position.side === "long" ? 1 : -1;
        const returnPct = ((exit - position.entry) / position.entry) * direction * 100;
        const risk = Math.abs(position.entry - position.stop);
        const rMultiple = risk ? ((exit - position.entry) * direction) / risk : 0;
        capital *= 1 + returnPct / 100;
        trades.push({ side: position.side, entryTime: candles[position.entryIndex].time, exitTime: candle.time, entry: position.entry, exit, stop: position.stop, target: position.target, returnPct, rMultiple, barsHeld: i - position.entryIndex });
        position = null;
        equityPeak = Math.max(equityPeak, capital);
        maxDrawdownPct = Math.max(maxDrawdownPct, ((equityPeak - capital) / equityPeak) * 100);
      }
      continue;
    }

    const longSignal = previous.ema20 > previous.sma50 && candles[i - 1].close > previous.ema20 && previous.rsi >= 50 && previous.rsi <= 70;
    const shortSignal = previous.ema20 < previous.sma50 && candles[i - 1].close < previous.ema20 && previous.rsi >= 30 && previous.rsi <= 50;
    if (!longSignal && !shortSignal) continue;

    const entry = candle.open;
    const risk = Math.max(previous.atr * 1.5, entry * 0.005);
    const side = longSignal ? "long" : "short";
    position = side === "long"
      ? { side, entry, stop: entry - risk, target: entry + risk * 2, entryIndex: i }
      : { side, entry, stop: entry + risk, target: entry - risk * 2, entryIndex: i };
  }

  if (position) {
    const last = candles.at(-1)!;
    const direction = position.side === "long" ? 1 : -1;
    const returnPct = ((last.close - position.entry) / position.entry) * direction * 100;
    const risk = Math.abs(position.entry - position.stop);
    trades.push({ side: position.side, entryTime: candles[position.entryIndex].time, exitTime: last.time, entry: position.entry, exit: last.close, stop: position.stop, target: position.target, returnPct, rMultiple: risk ? ((last.close - position.entry) * direction) / risk : 0, barsHeld: candles.length - 1 - position.entryIndex });
    capital *= 1 + returnPct / 100;
  }

  const winners = trades.filter((t) => t.returnPct > 0);
  const grossProfit = winners.reduce((s, t) => s + t.returnPct, 0);
  const grossLoss = Math.abs(trades.filter((t) => t.returnPct < 0).reduce((s, t) => s + t.returnPct, 0));
  const returns = trades.map((t) => t.returnPct / 100);
  const mean = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const variance = returns.length > 1 ? returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1) : 0;
  const sharpe = variance > 0 ? (mean / Math.sqrt(variance)) * Math.sqrt(252) : null;
  return {
    strategy: "EMA20/SMA50 trend + RSI 50/70 momentum, 1.5 ATR stop, 2R target",
    trades,
    initialCapital,
    finalCapital: capital,
    totalReturnPct: ((capital / initialCapital) - 1) * 100,
    winRatePct: trades.length ? (winners.length / trades.length) * 100 : 0,
    profitFactor: grossLoss ? grossProfit / grossLoss : grossProfit ? Number.POSITIVE_INFINITY : 0,
    maxDrawdownPct,
    expectancyR: trades.length ? trades.reduce((s, t) => s + t.rMultiple, 0) / trades.length : 0,
    sharpe,
    averageBarsHeld: trades.length ? trades.reduce((s, t) => s + t.barsHeld, 0) / trades.length : 0,
  };
}
