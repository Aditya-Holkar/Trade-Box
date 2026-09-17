"use client";

import { useEffect, useMemo, useState } from "react";

type Quote = {
  symbol: string;
  name: string;
  price: number;
  changePercent: number | null;
  currency: string;
};

type WatchItem = { symbol: string; name: string };

const STORAGE_KEY = "trade-box-watchlists";
const DEFAULT: WatchItem[] = [
  { symbol: "AAPL", name: "Apple" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "GC=F", name: "Gold Futures" },
];

export default function WatchlistPanel({ activeSymbol, onSelect }: { activeSymbol: string; onSelect: (symbol: string) => void }) {
  const [items, setItems] = useState<WatchItem[]>(DEFAULT);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      if (Array.isArray(saved) && saved.length) setItems(saved.slice(0, 50));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  async function refresh() {
    if (!items.length) return;
    setLoading(true);
    try {
      const results = await Promise.all(items.map(async (item) => {
        const response = await fetch(`/api/market/quote?symbol=${encodeURIComponent(item.symbol)}`, { cache: "no-store" });
        if (!response.ok) return null;
        const body = await response.json();
        return body.data as Quote;
      }));
      const next: Record<string, Quote> = {};
      results.forEach((quote) => { if (quote) next[quote.symbol] = quote; });
      setQuotes(next);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30000);
    return () => window.clearInterval(timer);
  }, [items.map((item) => item.symbol).join(",")]);

  function addItem() {
    const symbol = input.trim().toUpperCase();
    if (!symbol || items.some((item) => item.symbol === symbol)) return;
    setItems((current) => [...current, { symbol, name: symbol }].slice(0, 50));
    setInput("");
    onSelect(symbol);
  }

  function remove(symbol: string) {
    setItems((current) => current.filter((item) => item.symbol !== symbol));
  }

  function move(symbol: string, direction: -1 | 1) {
    setItems((current) => {
      const index = current.findIndex((item) => item.symbol === symbol);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  const ordered = useMemo(() => items, [items]);

  return <section className="mt-4 rounded border border-[#1b2532] bg-[#0c1118]">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1b2532] px-4 py-3">
      <div><div className="text-xs font-bold tracking-[0.16em] text-[#5eead4]">PHASE 7 · WATCHLISTS</div><div className="mt-1 text-lg font-semibold">Track the instruments that matter.</div></div>
      <button onClick={() => void refresh()} disabled={loading} className="rounded border border-[#263444] px-3 py-1.5 text-[10px] font-bold text-[#9aa8ba] hover:border-[#5eead4] hover:text-[#5eead4]">{loading ? "UPDATING" : "REFRESH"}</button>
    </div>
    <div className="flex gap-2 border-b border-[#1b2532] p-3">
      <input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addItem(); }} placeholder="Add symbol… e.g. RELIANCE.NS, BTC-USD, EURUSD" className="min-w-0 flex-1 rounded border border-[#263444] bg-[#101722] px-3 py-2 text-xs outline-none focus:border-[#5eead4]" />
      <button onClick={addItem} className="rounded bg-[#17302d] px-4 py-2 text-xs font-bold text-[#5eead4]">ADD</button>
    </div>
    <div className="divide-y divide-[#1b2532]">
      {ordered.map((item, index) => {
        const quote = quotes[item.symbol];
        const pct = quote?.changePercent ?? null;
        return <div key={item.symbol} className={`grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-3 ${activeSymbol === item.symbol ? "bg-[#101b1b]" : ""}`}>
          <button onClick={() => onSelect(item.symbol)} className="min-w-0 text-left">
            <div className="truncate text-sm font-semibold">{quote?.name ?? item.name}</div>
            <div className="mt-0.5 text-[10px] tracking-widest text-[#718096]">{item.symbol}</div>
          </button>
          <div className="text-right tabular-nums"><div className="text-sm">{quote ? quote.price.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}</div><div className={`text-[10px] ${pct !== null && pct >= 0 ? "text-[#5eead4]" : "text-[#f08a9a]"}`}>{pct === null ? "—" : `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`}</div></div>
          <div className="flex items-center gap-1">
            <button onClick={() => move(item.symbol, -1)} disabled={index === 0} className="rounded px-1.5 py-1 text-[10px] text-[#718096] hover:text-white disabled:opacity-20">↑</button>
            <button onClick={() => move(item.symbol, 1)} disabled={index === ordered.length - 1} className="rounded px-1.5 py-1 text-[10px] text-[#718096] hover:text-white disabled:opacity-20">↓</button>
            <button onClick={() => remove(item.symbol)} className="rounded px-1.5 py-1 text-[10px] text-[#718096] hover:text-[#f08a9a]">×</button>
          </div>
        </div>;
      })}
      {!ordered.length && <div className="p-8 text-center text-sm text-[#718096]">Your watchlist is empty. Add a symbol above.</div>}
    </div>
  </section>;
}
