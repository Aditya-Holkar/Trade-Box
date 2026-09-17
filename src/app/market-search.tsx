"use client";

import { useEffect, useRef, useState } from "react";

export type SearchResult = {
  symbol: string;
  name: string;
  exchange: string | null;
  type: string;
  currency: string | null;
};

const RECENT_KEY = "trade-box-recent-searches";

export default function MarketSearch({ onSelect }: { onSelect: (symbol: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recent, setRecent] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as SearchResult[];
      if (Array.isArray(saved)) setRecent(saved.slice(0, 8));
    } catch {}
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open || !query.trim()) {
      setResults([]);
      setActiveIndex(0);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/market/search?q=${encodeURIComponent(query.trim())}`, { cache: "no-store" });
        const body = await response.json();
        setResults(response.ok ? body.data ?? [] : []);
        setActiveIndex(0);
      } catch {
        setResults([]);
      }
    }, 180);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, open]);

  const items = query.trim() ? results : recent;

  function choose(item: SearchResult) {
    const next = [item, ...recent.filter((entry) => entry.symbol !== item.symbol)].slice(0, 8);
    setRecent(next);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
    onSelect(item.symbol);
    setOpen(false);
    setQuery("");
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(items.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && items[activeIndex]) {
      event.preventDefault();
      choose(items[activeIndex]);
    }
  }

  return (
    <>
      <button onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }} className="flex min-w-[280px] max-w-xl flex-1 items-center rounded border border-[#1b2532] bg-[#0c1118] px-3 py-2 text-left text-sm text-[#7f8da1] transition hover:border-[#31515a] hover:text-[#b8c5d6]">
        <span className="mr-2 rounded bg-[#101722] px-1.5 py-0.5 text-[10px] font-semibold text-[#5eead4]">⌘K</span>
        Search symbols, companies, markets...
      </button>

      {open && <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-[12vh]" onMouseDown={(event) => { if (event.currentTarget === event.target) setOpen(false); }}>
        <div className="w-full max-w-2xl overflow-hidden rounded-lg border border-[#263545] bg-[#0b1017] shadow-2xl shadow-black/50">
          <div className="flex items-center border-b border-[#1b2532] px-4">
            <span className="mr-3 text-[#5eead4]">⌕</span>
            <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={handleInputKeyDown} placeholder="Search ticker or company..." className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-[#536176]" autoComplete="off" />
            <kbd className="rounded border border-[#263545] px-2 py-1 text-[10px] text-[#617086]">ESC</kbd>
          </div>
          <div className="max-h-[420px] overflow-y-auto p-2">
            {!items.length && <div className="px-4 py-10 text-center text-sm text-[#617086]">{query ? "No matching instruments" : "Search stocks, ETFs, indices, crypto and forex"}</div>}
            {items.map((item, index) => <button key={`${item.symbol}-${index}`} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(item)} className={`flex w-full items-center gap-3 rounded px-3 py-3 text-left ${index === activeIndex ? "bg-[#142027]" : "hover:bg-[#101722]"}`}>
              <div className="flex h-9 w-12 items-center justify-center rounded border border-[#263545] text-[10px] font-bold text-[#5eead4]">{item.symbol.slice(0, 6)}</div>
              <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{item.name}</div><div className="mt-0.5 text-[10px] uppercase tracking-wider text-[#617086]">{item.exchange ?? "—"} · {item.type}</div></div>
              <div className="text-[10px] text-[#617086]">{item.currency ?? ""}</div>
            </button>)}
          </div>
          <div className="flex items-center gap-4 border-t border-[#1b2532] px-4 py-2 text-[10px] text-[#617086]"><span>↑↓ navigate</span><span>Enter select</span><span>Esc close</span><span className="ml-auto">MARKET SEARCH</span></div>
        </div>
      </div>}
    </>
  );
}
