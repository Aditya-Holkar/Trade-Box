"use client";

import { useEffect, useMemo, useState } from "react";

type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };
type DrawingTool = "horizontal" | "trendline" | "ray" | "channel" | "rectangle" | "fibonacci";
type Level = { id: number; price: number; label: string };

const tools: Array<[DrawingTool, string]> = [
  ["horizontal", "Horizontal"],
  ["trendline", "Trendline"],
  ["ray", "Ray"],
  ["channel", "Channel"],
  ["rectangle", "Rectangle"],
  ["fibonacci", "Fibonacci"],
];

export default function DrawingToolsPanel({ symbol = "AAPL" }: { symbol?: string }) {
  const [tool, setTool] = useState<DrawingTool>("horizontal");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [price, setPrice] = useState("");
  const [levels, setLevels] = useState<Level[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/market/history?symbol=${encodeURIComponent(symbol)}&range=3mo&interval=1d`, { cache: "no-store" })
      .then((response) => response.json())
      .then((body) => { if (!cancelled) setCandles(body.data ?? []); })
      .catch(() => { if (!cancelled) setCandles([]); });
    return () => { cancelled = true; };
  }, [symbol]);

  const structure = useMemo(() => {
    if (!candles.length) return null;
    const highs = candles.slice(-60).map((c) => c.high);
    const lows = candles.slice(-60).map((c) => c.low);
    return { high: Math.max(...highs), low: Math.min(...lows), last: candles.at(-1)!.close };
  }, [candles]);

  const fib = useMemo(() => {
    if (!structure) return [];
    const range = structure.high - structure.low;
    return [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1].map((ratio) => ({ ratio, price: structure.high - range * ratio }));
  }, [structure]);

  function addLevel() {
    const value = Number(price);
    if (!Number.isFinite(value) || value <= 0) return;
    setLevels((current) => [...current, { id: Date.now(), price: value, label: "Manual level" }]);
    setPrice("");
  }

  function addStructureLevel(value: number, label: string) {
    setLevels((current) => [...current, { id: Date.now(), price: value, label }]);
  }

  return <section className="mt-4 rounded border border-[#1b2532] bg-[#0c1118]">
    <div className="border-b border-[#1b2532] px-4 py-3">
      <div className="text-xs font-bold tracking-[0.16em] text-[#5eead4]">PHASE 6 · DRAWING & PRICE STRUCTURE</div>
      <div className="mt-1 text-lg font-semibold">Drawing workspace · {symbol}</div>
    </div>

    <div className="flex flex-wrap gap-1 border-b border-[#1b2532] bg-[#0a0f15] p-2">
      {tools.map(([key, label]) => <button key={key} onClick={() => setTool(key)} className={`rounded px-3 py-1.5 text-[10px] font-bold ${tool === key ? "bg-[#17302d] text-[#5eead4]" : "text-[#7f8da1] hover:bg-[#101722] hover:text-white"}`}>{label}</button>)}
    </div>

    <div className="grid gap-4 p-4 lg:grid-cols-[1.1fr_1fr_1fr]">
      <div className="rounded border border-[#1b2532] bg-[#101722] p-4">
        <div className="text-[10px] font-bold tracking-[0.16em] text-[#7f8da1]">SELECTED TOOL</div>
        <div className="mt-2 text-sm font-semibold uppercase">{tool}</div>
        <p className="mt-2 text-xs leading-5 text-[#7f8da1]">The selected drawing mode is ready for the chart canvas. Horizontal levels can be stored immediately; interactive canvas primitives are the next drawing-layer increment.</p>
        <div className="mt-4 flex gap-2">
          <input value={price} onChange={(e) => setPrice(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addLevel()} placeholder="Price level" inputMode="decimal" className="min-w-0 flex-1 rounded border border-[#263444] bg-[#0c1118] px-3 py-2 text-xs outline-none focus:border-[#5eead4]" />
          <button onClick={addLevel} className="rounded bg-[#17302d] px-3 py-2 text-[10px] font-bold text-[#5eead4]">ADD</button>
        </div>
      </div>

      <div className="rounded border border-[#1b2532] bg-[#101722] p-4">
        <div className="text-[10px] font-bold tracking-[0.16em] text-[#7f8da1]">STRUCTURE</div>
        {structure ? <div className="mt-3 space-y-2 text-xs"><button onClick={() => addStructureLevel(structure.high, "60-bar high")} className="flex w-full justify-between rounded border border-[#263444] px-3 py-2 hover:border-[#5eead4]"><span>Resistance</span><span className="tabular-nums">{structure.high.toFixed(2)}</span></button><button onClick={() => addStructureLevel(structure.low, "60-bar low")} className="flex w-full justify-between rounded border border-[#263444] px-3 py-2 hover:border-[#5eead4]"><span>Support</span><span className="tabular-nums">{structure.low.toFixed(2)}</span></button><div className="flex justify-between px-3 py-1 text-[#7f8da1]"><span>Last</span><span>{structure.last.toFixed(2)}</span></div></div> : <div className="mt-3 text-xs text-[#7f8da1]">Loading structure…</div>}
      </div>

      <div className="rounded border border-[#1b2532] bg-[#101722] p-4">
        <div className="text-[10px] font-bold tracking-[0.16em] text-[#7f8da1]">FIBONACCI RETRACEMENT</div>
        <div className="mt-3 space-y-1 text-xs">{fib.map((level) => <button key={level.ratio} onClick={() => addStructureLevel(level.price, `Fib ${(level.ratio * 100).toFixed(1)}%`)} className="flex w-full justify-between rounded px-2 py-1 hover:bg-[#17212d]"><span>{(level.ratio * 100).toFixed(1)}%</span><span className="tabular-nums">{level.price.toFixed(2)}</span></button>)}</div>
      </div>
    </div>

    {levels.length > 0 && <div className="border-t border-[#1b2532] p-4"><div className="mb-2 text-[10px] font-bold tracking-[0.16em] text-[#7f8da1]">SAVED DRAWINGS</div><div className="flex flex-wrap gap-2">{levels.map((level) => <button key={level.id} onClick={() => setLevels((current) => current.filter((item) => item.id !== level.id))} className="rounded border border-[#263444] bg-[#101722] px-3 py-2 text-xs hover:border-[#f08a9a]"><span className="text-[#7f8da1]">{level.label}</span><span className="ml-2 tabular-nums">{level.price.toFixed(2)}</span><span className="ml-2 text-[#617086]">×</span></button>)}</div></div>}
  </section>;
}
