"use client";

import { useEffect, useMemo, useState } from "react";
import type { Candle } from "@/lib/market-data/types";
import { analyzeTechnical } from "@/lib/technical/analysis-engine";

const filters = ["all", "trend", "momentum", "volume", "volatility", "structure"] as const;
type Filter = (typeof filters)[number];

export default function TechnicalAnalysisPanel({ symbol = "AAPL" }: { symbol?: string }) {
  const normalized = symbol.trim().toUpperCase() || "AAPL";
  const [candles, setCandles] = useState<Candle[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setCandles([]);
    fetch(`/api/market/history?symbol=${encodeURIComponent(normalized)}&range=1y&interval=1d`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Technical analysis unavailable");
        if (!cancelled) setCandles(body.data ?? []);
      })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Technical analysis unavailable"); });
    return () => { cancelled = true; };
  }, [normalized]);

  const analysis = useMemo(() => analyzeTechnical(candles, normalized), [candles, normalized]);
  const observations = filter === "all" ? analysis.observations : analysis.observations.filter((item) => item.category === filter);

  return <section className="mt-4 rounded border border-[#1b2532] bg-[#0c1118] p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="text-xs font-bold tracking-[0.16em] text-[#5eead4]">PHASE 5 · TECHNICAL ANALYSIS</div><div className="mt-1 text-lg font-semibold">{normalized} explainable market structure</div></div>
      <div className="flex items-center gap-2 text-[10px]"><span className="rounded border border-[#263444] px-2 py-1 text-[#7f8da1]">REGIME</span><span className="font-bold uppercase text-[#c4cfdd]">{analysis.regime}</span></div>
    </div>

    {error ? <div className="mt-4 rounded border border-[#4a2930] bg-[#171016] p-3 text-xs text-[#f0a8b2]">{error}</div> : <>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded border border-[#1b2532] bg-[#101722] p-3"><div className="text-[10px] text-[#617086]">LAST PRICE</div><div className="mt-1 text-sm font-semibold tabular-nums">{analysis.lastPrice?.toFixed(2) ?? "—"}</div></div>
        <div className="rounded border border-[#1b2532] bg-[#101722] p-3"><div className="text-[10px] text-[#617086]">SUPPORT</div><div className="mt-1 text-sm font-semibold tabular-nums">{analysis.support?.toFixed(2) ?? "—"}</div></div>
        <div className="rounded border border-[#1b2532] bg-[#101722] p-3"><div className="text-[10px] text-[#617086]">RESISTANCE</div><div className="mt-1 text-sm font-semibold tabular-nums">{analysis.resistance?.toFixed(2) ?? "—"}</div></div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">{filters.map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded border px-2.5 py-1.5 text-[10px] font-semibold uppercase ${filter === item ? "border-[#315c56] bg-[#142b29] text-[#5eead4]" : "border-[#263444] text-[#718096] hover:text-white"}`}>{item}</button>)}</div>
      <div className="mt-4 grid gap-2 md:grid-cols-2">{observations.map((item, index) => <div key={`${item.title}-${index}`} className="rounded border border-[#1b2532] bg-[#101722] p-3"><div className="flex items-center justify-between gap-3"><div className="text-xs font-semibold">{item.title}</div><span className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase ${item.state === "bullish" ? "bg-[#142b29] text-[#5eead4]" : item.state === "bearish" ? "bg-[#311a20] text-[#f08a9a]" : "bg-[#1b2532] text-[#9aa8ba]"}`}>{item.state}</span></div><div className="mt-2 text-xs leading-5 text-[#8f9caf]">{item.detail}</div></div>)}</div>
      <div className="mt-3 text-[10px] leading-5 text-[#617086]">Signals are descriptive technical observations derived from historical OHLCV. They are not an aggregate BUY/SELL recommendation.</div>
    </>}
  </section>;
}
