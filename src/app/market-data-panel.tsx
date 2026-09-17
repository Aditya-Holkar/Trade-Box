"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Quote = { symbol: string; name: string; currency: string; price: number; previousClose: number | null; change: number | null; changePercent: number | null; dayHigh: number | null; dayLow: number | null; volume: number | null; provider: string; freshness: string; timestamp: number };
type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };
const defaultSymbols = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "TSLA"];
const money = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export default function MarketDataPanel({ requestedSymbol }: { requestedSymbol?: string }) {
  const [symbols, setSymbols] = useState(defaultSymbols);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [history, setHistory] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState("AAPL");
  const [query, setQuery] = useState("");
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const loadQuotes = useCallback(async (requestedSymbols: string[], silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(requestedSymbols.map(async (symbol) => {
        const response = await fetch(`/api/market/quote?symbol=${encodeURIComponent(symbol)}`, { cache: "no-store" });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? `Failed to load ${symbol}`);
        return body.data as Quote;
      }));
      setQuotes(results); setLastRefresh(Date.now());
    } catch (err) { setError(err instanceof Error ? err.message : "Market data unavailable"); }
    finally { setLoading(false); }
  }, []);

  const loadHistory = useCallback(async (symbol: string) => {
    setChartLoading(true);
    try {
      const response = await fetch(`/api/market/history?symbol=${encodeURIComponent(symbol)}&range=1mo&interval=1d`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "History unavailable");
      setHistory(body.data as Candle[]);
    } catch { setHistory([]); }
    finally { setChartLoading(false); }
  }, []);

  useEffect(() => { void loadQuotes(symbols); }, [loadQuotes, symbols]);
  useEffect(() => { if (requestedSymbol) { const symbol = requestedSymbol.toUpperCase(); setSymbols((current) => current.includes(symbol) ? current : [...current, symbol]); setSelected(symbol); } }, [requestedSymbol]);
  useEffect(() => { void loadHistory(selected); }, [loadHistory, selected]);
  useEffect(() => { const timer = window.setInterval(() => void loadQuotes(symbols, true), 30_000); return () => window.clearInterval(timer); }, [loadQuotes, symbols]);

  const active = quotes.find((quote) => quote.symbol === selected) ?? quotes[0];
  const chartPoints = useMemo(() => history.slice(-30), [history]);
  const chartPath = useMemo(() => {
    if (chartPoints.length < 2) return "";
    const min = Math.min(...chartPoints.map((c) => c.close)); const max = Math.max(...chartPoints.map((c) => c.close)); const spread = max - min || 1;
    return chartPoints.map((c, i) => `${i === 0 ? "M" : "L"} ${((i / (chartPoints.length - 1)) * 100).toFixed(2)} ${(92 - ((c.close - min) / spread) * 78).toFixed(2)}`).join(" ");
  }, [chartPoints]);

  function addSymbol(event: FormEvent) { event.preventDefault(); const symbol = query.trim().toUpperCase(); if (!symbol) return; setSymbols((current) => current.includes(symbol) ? current : [...current, symbol]); setSelected(symbol); setQuery(""); }

  return <section className="mt-4 grid gap-4 xl:grid-cols-[1.7fr_1fr]">
    <div className="rounded border border-[#1b2532] bg-[#0c1118] p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><div className="text-xs font-bold tracking-[0.16em] text-[#5eead4]">MARKET DATA ENGINE</div><div className="mt-1 text-lg font-semibold">Live quote monitor</div></div><div className="flex items-center gap-2 text-[10px] text-[#7f8da1]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#5eead4]" /> AUTO REFRESH 30S <button onClick={() => void loadQuotes(symbols)} className="rounded border border-[#263444] px-2 py-1 text-[#9aa8ba] hover:border-[#5eead4] hover:text-[#5eead4]">REFRESH</button></div></div>
      <form onSubmit={addSymbol} className="mb-4 flex gap-2"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Add symbol, e.g. META, INFY, BTC-USD" className="min-w-0 flex-1 rounded border border-[#263444] bg-[#101722] px-3 py-2 text-sm outline-none placeholder:text-[#526176] focus:border-[#5eead4]" /><button className="rounded border border-[#5eead4] px-3 text-xs font-bold text-[#5eead4] hover:bg-[#102522]">ADD</button></form>
      {error && <div className="mb-3 rounded border border-[#4a2930] bg-[#171016] p-3 text-sm text-[#f0a8b2]">{error}</div>}
      <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b border-[#1b2532] text-[10px] uppercase tracking-[0.14em] text-[#7f8da1]"><tr><th className="pb-3">Symbol</th><th className="pb-3">Price</th><th className="pb-3">Change</th><th className="pb-3">Day range</th><th className="pb-3">Volume</th><th className="pb-3">Status</th></tr></thead><tbody>{loading && !quotes.length ? Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan={6} className="py-4 text-[#526176]">Loading market data…</td></tr>) : quotes.map((quote) => { const positive = (quote.changePercent ?? 0) >= 0; const isSelected = quote.symbol === active?.symbol; return <tr key={quote.symbol} onClick={() => setSelected(quote.symbol)} className={`cursor-pointer border-b border-[#151e29] hover:bg-[#101722] ${isSelected ? "bg-[#101722]" : ""}`}><td className="py-3 font-semibold">{quote.symbol}<span className="ml-2 text-[10px] font-normal text-[#617086]">{quote.name}</span></td><td className="py-3 tabular-nums">{money.format(quote.price)}</td><td className={`py-3 tabular-nums ${positive ? "text-[#5eead4]" : "text-[#f08a9a]"}`}>{quote.changePercent === null ? "—" : `${positive ? "+" : ""}${quote.changePercent.toFixed(2)}%`}</td><td className="py-3 text-xs text-[#9aa8ba]">{quote.dayLow?.toFixed(2) ?? "—"} — {quote.dayHigh?.toFixed(2) ?? "—"}</td><td className="py-3 text-xs text-[#9aa8ba]">{quote.volume === null ? "—" : compact.format(quote.volume)}</td><td className="py-3"><span className="rounded border border-[#23413d] px-2 py-1 text-[10px] text-[#5eead4]">{quote.freshness.toUpperCase()}</span></td></tr>; })}</tbody></table></div>
      <div className="mt-3 flex justify-between text-[10px] text-[#617086]"><span>Provider: Yahoo Finance · server-side</span><span>Updated {new Date(lastRefresh).toLocaleTimeString()}</span></div>
    </div>
    <div className="rounded border border-[#1b2532] bg-[#0c1118] p-5"><div className="flex items-center justify-between"><div className="text-xs font-bold tracking-[0.16em] text-[#5eead4]">QUOTE DETAIL</div>{active && <span className="text-[10px] text-[#617086]">{active.currency}</span>}</div>{active ? <><div className="mt-5 flex items-end justify-between"><div><div className="text-2xl font-bold">{active.symbol}</div><div className="text-xs text-[#7f8da1]">{active.name}</div></div><div className="text-right"><div className="text-3xl font-semibold tabular-nums">{money.format(active.price)}</div><div className={`text-sm ${(active.changePercent ?? 0) >= 0 ? "text-[#5eead4]" : "text-[#f08a9a]"}`}>{active.change === null ? "—" : `${active.change >= 0 ? "+" : ""}${active.change.toFixed(2)}`} ({active.changePercent === null ? "—" : `${active.changePercent.toFixed(2)}%`})</div></div></div><div className="mt-5 h-40 rounded border border-[#1b2532] bg-[#101722] p-2">{chartLoading ? <div className="flex h-full items-center justify-center text-xs text-[#617086]">Loading 1M price history…</div> : chartPath ? <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full"><path d={chartPath} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" className="text-[#5eead4]" /></svg> : <div className="flex h-full items-center justify-center text-xs text-[#617086]">History unavailable</div>}</div><div className="mt-4 grid grid-cols-2 gap-2 text-xs">{[["Previous close", active.previousClose], ["Day high", active.dayHigh], ["Day low", active.dayLow], ["Volume", active.volume === null ? null : compact.format(active.volume)]].map(([label, value]) => <div key={label as string} className="rounded border border-[#1b2532] bg-[#101722] p-3"><div className="text-[#617086]">{label}</div><div className="mt-1 font-medium tabular-nums">{typeof value === "number" ? value.toFixed(2) : value ?? "—"}</div></div>)}</div><div className="mt-4 flex justify-between border-t border-[#1b2532] pt-4 text-[10px] text-[#617086]"><span>{active.provider} · {active.freshness}</span><span>{new Date(active.timestamp).toLocaleTimeString()}</span></div></> : <div className="mt-6 text-sm text-[#617086]">Select a symbol to inspect its quote.</div>}</div>
  </section>;
}
