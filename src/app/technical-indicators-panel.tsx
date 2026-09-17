"use client";

import { useEffect, useMemo, useState } from "react";
import type { Candle } from "@/lib/market-data/types";
import { atr, bollinger, ema, macd, obv, relativeVolume, rsi, sma, stochastic, vwap } from "@/lib/technical/indicators";

const indicatorChoices = ["SMA 20", "EMA 20", "VWAP", "RSI 14", "MACD", "Bollinger 20", "ATR 14", "Stochastic 14", "OBV", "Relative Volume"] as const;

type Choice = (typeof indicatorChoices)[number];

function fmt(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

export default function TechnicalIndicatorsPanel({ symbol = "AAPL" }: { symbol?: string }) {
  const normalized = symbol.trim().toUpperCase() || "AAPL";
  const [candles, setCandles] = useState<Candle[]>([]);
  const [selected, setSelected] = useState<Choice[]>(["SMA 20", "EMA 20", "RSI 14", "MACD"]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetch(`/api/market/history?symbol=${encodeURIComponent(normalized)}&range=1y&interval=1d`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Indicator data unavailable");
        if (!cancelled) setCandles(body.data ?? []);
      })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Indicator data unavailable"); });
    return () => { cancelled = true; };
  }, [normalized]);

  const values = useMemo(() => {
    const last = <T extends { time: number }>(points: T[]) => points[points.length - 1];
    const s = last(sma(candles, 20));
    const e = last(ema(candles, 20));
    const v = last(vwap(candles));
    const r = last(rsi(candles));
    const m = last(macd(candles));
    const b = last(bollinger(candles));
    const a = last(atr(candles));
    const st = last(stochastic(candles));
    const o = last(obv(candles));
    const rv = last(relativeVolume(candles));
    return new Map<Choice, string>([
      ["SMA 20", fmt(s?.value)], ["EMA 20", fmt(e?.value)], ["VWAP", fmt(v?.value)], ["RSI 14", fmt(r?.value)],
      ["MACD", m ? `${fmt(m.macd)} / ${fmt(m.signal)}` : "—"], ["Bollinger 20", b ? `${fmt(b.lower)} — ${fmt(b.middle)} — ${fmt(b.upper)}` : "—"],
      ["ATR 14", fmt(a?.value)], ["Stochastic 14", fmt(st?.value)], ["OBV", fmt(o?.value)], ["Relative Volume", rv ? `${fmt(rv.value)}x` : "—"],
    ]);
  }, [candles]);

  function toggle(choice: Choice) {
    setSelected((current) => current.includes(choice) ? current.filter((x) => x !== choice) : [...current, choice]);
  }

  return <section className="mt-4 rounded border border-[#1b2532] bg-[#0c1118] p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><div className="text-xs font-bold tracking-[0.16em] text-[#5eead4]">PHASE 4 · TECHNICAL INDICATORS</div><div className="mt-1 text-lg font-semibold">{normalized} indicator engine</div></div>
      <div className="text-[10px] text-[#617086]">1Y daily calculation · {candles.length} bars</div>
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
      {indicatorChoices.map((choice) => <button key={choice} onClick={() => toggle(choice)} className={`rounded border px-2.5 py-1.5 text-[10px] font-semibold ${selected.includes(choice) ? "border-[#315c56] bg-[#142b29] text-[#5eead4]" : "border-[#263444] text-[#718096] hover:text-white"}`}>{choice}</button>)}
    </div>
    {error ? <div className="mt-4 rounded border border-[#4a2930] bg-[#171016] p-3 text-xs text-[#f0a8b2]">{error}</div> : <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{selected.map((choice) => <div key={choice} className="rounded border border-[#1b2532] bg-[#101722] p-3"><div className="text-[10px] text-[#617086]">{choice}</div><div className="mt-2 text-sm font-semibold tabular-nums text-[#d7e0ea]">{values.get(choice) ?? "—"}</div></div>)}</div>}
    <div className="mt-3 text-[10px] leading-5 text-[#617086]">Calculations run locally from Trade Box OHLCV data. SMA/EMA/VWAP are trend/reference measures; RSI and Stochastic are momentum measures; MACD measures momentum/trend difference; Bollinger and ATR describe volatility; OBV and relative volume describe volume behavior.</div>
  </section>;
}
