"use client";

import { useEffect, useMemo, useState } from "react";

type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };
type Decision = {
  state: "LONG SETUP" | "SHORT SETUP" | "WAIT";
  score: number;
  price: number;
  support: number;
  resistance: number;
  ema20: number;
  ema50: number;
  rsi: number;
  atr: number;
  reasons: string[];
  invalidation: string;
};

function ema(values: number[], period: number) {
  if (!values.length) return 0;
  const k = 2 / (period + 1);
  let value = values[0];
  for (let i = 1; i < values.length; i++) value = values[i] * k + value * (1 - k);
  return value;
}

function rsi(values: number[], period = 14) {
  if (values.length <= period) return 50;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gains += d; else losses -= d;
  }
  let avgGain = gains / period, avgLoss = losses / period;
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

function atr(candles: Candle[], period = 14) {
  if (candles.length < period + 1) return 0;
  const tr = candles.slice(1).map((c, i) => {
    const prev = candles[i].close;
    return Math.max(c.high - c.low, Math.abs(c.high - prev), Math.abs(c.low - prev));
  });
  return tr.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function buildDecision(candles: Candle[]): Decision | null {
  if (candles.length < 60) return null;
  const closes = candles.map(c => c.close);
  const price = closes.at(-1)!;
  const e20 = ema(closes.slice(-120), 20);
  const e50 = ema(closes.slice(-160), 50);
  const r = rsi(closes.slice(-100), 14);
  const a = atr(candles.slice(-80), 14);
  const recent = candles.slice(-24, -1);
  const support = Math.min(...recent.map(c => c.low));
  const resistance = Math.max(...recent.map(c => c.high));
  let score = 0;
  const reasons: string[] = [];

  if (e20 > e50) { score += 2; reasons.push("EMA20 is above EMA50: short-term trend is positive."); }
  else { score -= 2; reasons.push("EMA20 is below EMA50: short-term trend is negative."); }

  if (price > e20) { score += 1; reasons.push("Price is above EMA20."); }
  else { score -= 1; reasons.push("Price is below EMA20."); }

  if (r >= 52 && r <= 68) { score += 1; reasons.push("RSI supports bullish momentum without being deeply overbought."); }
  else if (r <= 48 && r >= 32) { score -= 1; reasons.push("RSI supports bearish momentum without being deeply oversold."); }
  else reasons.push("RSI is extreme or neutral; wait for price confirmation.");

  const breakout = price > resistance;
  const breakdown = price < support;
  if (breakout) { score += 2; reasons.push("Price has broken the recent resistance window."); }
  if (breakdown) { score -= 2; reasons.push("Price has broken the recent support window."); }

  const state = score >= 4 ? "LONG SETUP" : score <= -4 ? "SHORT SETUP" : "WAIT";
  const invalidation = state === "LONG SETUP"
    ? `Long thesis invalid below ~${(price - a).toFixed(2)} or the recent support zone.`
    : state === "SHORT SETUP"
      ? `Short thesis invalid above ~${(price + a).toFixed(2)} or the recent resistance zone.`
      : "No entry until price confirms a directional break and momentum agrees.";

  return { state, score, price, support, resistance, ema20: e20, ema50: e50, rsi: r, atr: a, reasons, invalidation };
}

export default function XauusdDecisionPanel() {
  const [decision, setDecision] = useState<Decision | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updated, setUpdated] = useState<Date | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/market/history?symbol=XAUUSD&range=5d&interval=15m", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "XAUUSD history unavailable");
      const candles = (body.data?.candles ?? body.data ?? []) as Candle[];
      const result = buildDecision(candles);
      if (!result) throw new Error("Not enough XAUUSD candles to calculate the setup.");
      setDecision(result);
      setUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "XAUUSD analysis unavailable");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const tone = useMemo(() => {
    if (!decision) return "border-[#263444] bg-[#101722] text-white";
    if (decision.state === "LONG SETUP") return "border-[#23413d] bg-[#0c1516] text-[#5eead4]";
    if (decision.state === "SHORT SETUP") return "border-[#5b2932] bg-[#1a1014] text-[#f08a9a]";
    return "border-[#263444] bg-[#101722] text-[#f5c16c]";
  }, [decision]);

  return <section className="mt-4 rounded border border-[#1b2532] bg-[#0c1118]">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1b2532] px-4 py-3">
      <div>
        <div className="text-xs font-bold tracking-[0.16em] text-[#5eead4]">XAUUSD · TRADE DECISION ENGINE</div>
        <div className="mt-1 text-lg font-semibold">Confirmation-based entry workflow</div>
      </div>
      <button onClick={() => void load()} disabled={loading} className="rounded border border-[#263444] px-3 py-1.5 text-[10px] font-bold text-[#9aa8ba] hover:border-[#5eead4] hover:text-[#5eead4]">{loading ? "CALCULATING…" : "REFRESH"}</button>
    </div>

    {error && <div className="m-4 rounded border border-[#5b2932] bg-[#1a1014] p-3 text-xs text-[#f08a9a]">{error}</div>}
    {loading && !decision && <div className="p-8 text-center text-sm text-[#718096]">Calculating XAUUSD structure, momentum and volatility…</div>}

    {decision && <div className="space-y-4 p-4">
      <div className="grid gap-3 lg:grid-cols-[1.15fr_1fr_1fr]">
        <div className={`rounded border p-4 ${tone}`}>
          <div className="text-[10px] tracking-widest opacity-70">CURRENT STATE · M15</div>
          <div className="mt-2 text-3xl font-black">{decision.state}</div>
          <div className="mt-2 text-xs opacity-80">Signal score: {decision.score > 0 ? "+" : ""}{decision.score} / 7</div>
          <div className="mt-3 text-xs leading-5 opacity-90">{decision.state === "WAIT" ? "Do not force an entry. Wait for structure + momentum confirmation." : "This is a setup condition, not a guaranteed outcome. Confirm spread, news risk and execution conditions before acting."}</div>
        </div>

        <div className="rounded border border-[#1b2532] bg-[#101722] p-4">
          <div className="text-[10px] tracking-widest text-[#7f8da1]">PRICE STRUCTURE</div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div>Price<br/><b>{decision.price.toFixed(2)}</b></div>
            <div>ATR 14<br/><b>{decision.atr.toFixed(2)}</b></div>
            <div>Support<br/><b>{decision.support.toFixed(2)}</b></div>
            <div>Resistance<br/><b>{decision.resistance.toFixed(2)}</b></div>
          </div>
        </div>

        <div className="rounded border border-[#1b2532] bg-[#101722] p-4">
          <div className="text-[10px] tracking-widest text-[#7f8da1]">MOMENTUM</div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
            <div>EMA20<br/><b>{decision.ema20.toFixed(2)}</b></div>
            <div>EMA50<br/><b>{decision.ema50.toFixed(2)}</b></div>
            <div>RSI14<br/><b>{decision.rsi.toFixed(1)}</b></div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
        <div className="rounded border border-[#1b2532] bg-[#101722] p-4">
          <div className="text-[10px] tracking-widest text-[#7f8da1]">WHY</div>
          <div className="mt-3 space-y-2 text-xs leading-5">{decision.reasons.map((r, i) => <div key={i}>• {r}</div>)}</div>
        </div>
        <div className="rounded border border-[#1b2532] bg-[#101722] p-4">
          <div className="text-[10px] tracking-widest text-[#7f8da1]">INVALIDATION / NEXT ACTION</div>
          <div className="mt-3 text-xs leading-5 text-[#c4cfdd]">{decision.invalidation}</div>
          <div className="mt-4 rounded border border-[#263444] bg-[#0c1118] p-3 text-[10px] leading-5 text-[#7f8da1]">Engine input: 5D of 15-minute OHLCV. For live execution, add a dedicated real-time XAUUSD provider and a high-impact economic-calendar gate.</div>
        </div>
      </div>

      <div className="border-t border-[#1b2532] pt-3 text-[10px] text-[#617086]">Updated {updated?.toLocaleTimeString()} · Research/simulation only · The engine does not place orders.</div>
    </div>}
  </section>;
}
