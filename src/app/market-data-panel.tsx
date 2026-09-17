"use client";

import { useEffect, useState } from "react";

type Quote = {
  symbol: string;
  name: string;
  currency: string;
  price: number;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  volume: number | null;
  provider: string;
  freshness: string;
  timestamp: number;
};

const symbols = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "TSLA"];
const money = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export default function MarketDataPanel() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState("AAPL");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const results = await Promise.all(symbols.map(async (symbol) => {
          const response = await fetch(`/api/market/quote?symbol=${symbol}`, { cache: "no-store" });
          const body = await response.json();
          if (!response.ok) throw new Error(body.error ?? `Failed to load ${symbol}`);
          return body.data as Quote;
        }));
        if (!cancelled) setQuotes(results);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Market data unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const active = quotes.find((quote) => quote.symbol === selected) ?? quotes[0];

  return (
    <section className="mt-4 grid gap-4 xl:grid-cols-[1.7fr_1fr]">
      <div className="rounded border border-[#1b2532] bg-[#0c1118] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold tracking-[0.16em] text-[#5eead4]">MARKET DATA ENGINE</div>
            <div className="mt-1 text-lg font-semibold">US equity quote monitor</div>
          </div>
          <div className="text-[10px] text-[#7f8da1]">SOURCE: YAHOO FINANCE · SERVER-SIDE</div>
        </div>
        {error ? (
          <div className="rounded border border-[#4a2930] bg-[#171016] p-4 text-sm text-[#f0a8b2]">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-[#1b2532] text-[10px] uppercase tracking-[0.14em] text-[#7f8da1]">
                <tr><th className="pb-3">Symbol</th><th className="pb-3">Price</th><th className="pb-3">Change</th><th className="pb-3">Day range</th><th className="pb-3">Volume</th><th className="pb-3">Freshness</th></tr>
              </thead>
              <tbody>
                {loading && !quotes.length ? Array.from({ length: 6 }).map((_, i) => <tr key={i} className="border-b border-[#151e29]"><td colSpan={6} className="py-4 text-[#526176]">Loading market data…</td></tr>) : quotes.map((quote) => {
                  const positive = (quote.changePercent ?? 0) >= 0;
                  return <tr key={quote.symbol} onClick={() => setSelected(quote.symbol)} className="cursor-pointer border-b border-[#151e29] hover:bg-[#101722]">
                    <td className="py-3 font-semibold">{quote.symbol}<span className="ml-2 text-[10px] font-normal text-[#617086]">{quote.name}</span></td>
                    <td className="py-3 tabular-nums">{money.format(quote.price)}</td>
                    <td className={`py-3 tabular-nums ${positive ? "text-[#5eead4]" : "text-[#f08a9a]"}`}>{quote.changePercent === null ? "—" : `${positive ? "+" : ""}${quote.changePercent.toFixed(2)}%`}</td>
                    <td className="py-3 text-xs text-[#9aa8ba]">{quote.dayLow?.toFixed(2) ?? "—"} — {quote.dayHigh?.toFixed(2) ?? "—"}</td>
                    <td className="py-3 text-xs text-[#9aa8ba]">{quote.volume === null ? "—" : compact.format(quote.volume)}</td>
                    <td className="py-3"><span className="rounded border border-[#23413d] px-2 py-1 text-[10px] text-[#5eead4]">{quote.freshness.toUpperCase()}</span></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded border border-[#1b2532] bg-[#0c1118] p-5">
        <div className="text-xs font-bold tracking-[0.16em] text-[#5eead4]">QUOTE DETAIL</div>
        {active ? <>
          <div className="mt-5 flex items-end justify-between"><div><div className="text-2xl font-bold">{active.symbol}</div><div className="text-xs text-[#7f8da1]">{active.name}</div></div><div className="text-right"><div className="text-3xl font-semibold tabular-nums">{money.format(active.price)}</div><div className={`text-sm ${(active.changePercent ?? 0) >= 0 ? "text-[#5eead4]" : "text-[#f08a9a]"}`}>{active.change === null ? "—" : `${active.change >= 0 ? "+" : ""}${active.change.toFixed(2)}`} ({active.changePercent === null ? "—" : `${active.changePercent.toFixed(2)}%`})</div></div></div>
          <div className="mt-6 grid grid-cols-2 gap-2 text-xs">
            {[["Previous close", active.previousClose], ["Day high", active.dayHigh], ["Day low", active.dayLow], ["Volume", active.volume === null ? null : compact.format(active.volume)]].map(([label, value]) => <div key={label as string} className="rounded border border-[#1b2532] bg-[#101722] p-3"><div className="text-[#617086]">{label}</div><div className="mt-1 font-medium tabular-nums">{typeof value === "number" ? value.toFixed(2) : value ?? "—"}</div></div>)}
          </div>
          <div className="mt-4 flex justify-between border-t border-[#1b2532] pt-4 text-[10px] text-[#617086]"><span>{active.currency} · {active.provider}</span><span>{new Date(active.timestamp).toLocaleTimeString()}</span></div>
        </> : <div className="mt-6 text-sm text-[#617086]">Select a symbol to inspect its quote.</div>}
      </div>
    </section>
  );
}
