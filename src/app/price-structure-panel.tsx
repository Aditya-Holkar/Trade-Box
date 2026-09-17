"use client";

import { useEffect, useState } from "react";
import { getPriceStructure, type PriceStructure } from "@/lib/technical/price-structure";
import type { Candle } from "@/lib/market-data/types";

export default function PriceStructurePanel({ symbol }: { symbol: string }) {
  const [structure, setStructure] = useState<PriceStructure | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStructure(null);
    setError(null);
    fetch(`/api/market/history?symbol=${encodeURIComponent(symbol)}&range=3mo&interval=1d`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Price structure unavailable");
        return body.data as Candle[];
      })
      .then((candles) => { if (!cancelled) setStructure(getPriceStructure(candles)); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Price structure unavailable"); });
    return () => { cancelled = true; };
  }, [symbol]);

  return <section className="mt-4 rounded border border-[#1b2532] bg-[#0c1118] p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><div className="text-xs font-bold tracking-[0.16em] text-[#5eead4]">PHASE 6 · PRICE STRUCTURE</div><h2 className="mt-1 text-lg font-semibold">Support, resistance & Fibonacci</h2></div>
      <div className="text-[11px] text-[#7f8da1]">{symbol} · 3M structure</div>
    </div>
    {error && <div className="mt-4 rounded border border-[#4a2830] bg-[#180f13] p-3 text-xs text-[#f08a9a]">{error}</div>}
    {!structure && !error && <div className="mt-4 text-sm text-[#7f8da1]">Calculating swing structure…</div>}
    {structure && <div className="mt-5 grid gap-4 lg:grid-cols-3">
      <div className="rounded border border-[#1b2532] bg-[#101722] p-4">
        <div className="text-[10px] font-bold tracking-[0.16em] text-[#7f8da1]">SUPPORT</div>
        <div className="mt-3 space-y-2">{structure.support.length ? structure.support.map((level) => <div key={`${level.label}-${level.price}`} className="flex justify-between text-sm"><span className="text-[#9aa8ba]">{level.label}</span><span className="tabular-nums text-[#5eead4]">{level.price.toFixed(2)}</span></div>) : <span className="text-xs text-[#617086]">No confirmed support below price.</span>}</div>
      </div>
      <div className="rounded border border-[#1b2532] bg-[#101722] p-4">
        <div className="text-[10px] font-bold tracking-[0.16em] text-[#7f8da1]">RESISTANCE</div>
        <div className="mt-3 space-y-2">{structure.resistance.length ? structure.resistance.map((level) => <div key={`${level.label}-${level.price}`} className="flex justify-between text-sm"><span className="text-[#9aa8ba]">{level.label}</span><span className="tabular-nums text-[#f5c16c]">{level.price.toFixed(2)}</span></div>) : <span className="text-xs text-[#617086]">No confirmed resistance above price.</span>}</div>
      </div>
      <div className="rounded border border-[#1b2532] bg-[#101722] p-4">
        <div className="text-[10px] font-bold tracking-[0.16em] text-[#7f8da1]">FIBONACCI RETRACEMENT</div>
        <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2">{structure.fibonacci.map((level) => <div key={level.ratio} className="flex justify-between text-xs"><span className="text-[#9aa8ba]">{level.label}</span><span className="tabular-nums">{level.price.toFixed(2)}</span></div>)}</div>
      </div>
    </div>}
  </section>;
}
