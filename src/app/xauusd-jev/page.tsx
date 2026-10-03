"use client";

import { useCallback, useEffect, useState } from "react";

type Snapshot = any;

const card = "rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur";
const label = "text-xs uppercase tracking-[0.16em] text-zinc-500";
const value = "mt-2 text-2xl font-semibold text-white";

export default function XauusdJevPage() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/xauusd-jev", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Unable to read MT5");
      setData(json);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to connect");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [refresh]);

  const p = data?.decision?.probabilities;
  const f = data?.features;
  const price = data?.price;

  return (
    <main className="min-h-screen bg-[#08090c] px-5 py-8 text-zinc-100">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-[0.22em] text-amber-400">Trade-Box / AI Lab</div>
            <h1 className="text-3xl font-semibold tracking-tight">Jev XAUUSD Decision Engine</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              MT5 market data → deterministic feature engine → decision layer → risk gate → optional MT5 execution.
            </p>
          </div>
          <button onClick={refresh} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            MT5 bridge: {error}
            <div className="mt-1 text-xs text-red-300/70">Start python/mt5_service.py and verify MT5 is open and logged in.</div>
          </div>
        )}

        {data && (
          <>
            <div className="mb-5 grid gap-4 md:grid-cols-4">
              <div className={card}><div className={label}>XAUUSD</div><div className={value}>{price.mid.toFixed(2)}</div><div className="mt-1 text-xs text-zinc-500">Bid {price.bid.toFixed(2)} · Ask {price.ask.toFixed(2)}</div></div>
              <div className={card}><div className={label}>Decision</div><div className={`${value} ${p.buy > p.sell ? "text-emerald-400" : p.sell > p.buy ? "text-red-400" : "text-zinc-300"}`}>{data.decision.action.toUpperCase()}</div><div className="mt-1 text-xs text-zinc-500">{data.decision.reason}</div></div>
              <div className={card}><div className={label}>Trend / Session</div><div className={value}>{f.market.trend}</div><div className="mt-1 text-xs text-zinc-500">{f.market.session} · {f.market.volatility} volatility</div></div>
              <div className={card}><div className={label}>Mode</div><div className={value}>{data.mode}</div><div className="mt-1 text-xs text-zinc-500">Execution is blocked while DRY_RUN=true</div></div>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              <section className={card}>
                <div className={label}>Decision probabilities</div>
                <div className="mt-5 space-y-4">
                  {[["BUY", p.buy], ["SELL", p.sell], ["HOLD", p.hold]].map(([name, n]) => (
                    <div key={name}>
                      <div className="mb-1 flex justify-between text-sm"><span>{name}</span><span>{(Number(n) * 100).toFixed(1)}%</span></div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.max(0, Math.min(100, Number(n) * 100))}%` }} /></div>
                    </div>
                  ))}
                </div>
              </section>

              <section className={card}>
                <div className={label}>Technical state</div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  {[
                    ["RSI 14", f.technical.rsi14.toFixed(1)],
                    ["EMA 20", f.technical.ema20.toFixed(2)],
                    ["EMA 50", f.technical.ema50.toFixed(2)],
                    ["EMA 200", f.technical.ema200.toFixed(2)],
                    ["ATR 5m", f.technical.atr5m.toFixed(3)],
                    ["ATR 15m", f.technical.atr15m.toFixed(3)],
                  ].map(([k, v]) => <div key={k}><div className={label}>{k}</div><div className="mt-1 text-lg font-medium">{v}</div></div>)}
                </div>
              </section>

              <section className={card}>
                <div className={label}>Risk gate</div>
                <div className={`mt-3 text-xl font-semibold ${data.risk.allowed ? "text-emerald-400" : "text-zinc-300"}`}>{data.risk.allowed ? "READY" : "BLOCKED"}</div>
                <p className="mt-2 text-sm text-zinc-400">{data.risk.reason}</p>
                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div><div className={label}>Spread</div><div className="mt-1">{price.spread.toFixed(2)}</div></div>
                  <div><div className={label}>Positions</div><div className="mt-1">{data.positions?.length ?? 0}</div></div>
                  <div><div className={label}>Balance</div><div className="mt-1">{data.account?.balance?.toFixed(2) ?? "—"}</div></div>
                  <div><div className={label}>Equity</div><div className="mt-1">{data.account?.equity?.toFixed(2) ?? "—"}</div></div>
                </div>
              </section>
            </div>

            <section className={`${card} mt-5`}>
              <div className="flex items-center justify-between">
                <div><div className={label}>Recent XAUUSD closes</div><div className="mt-2 font-mono text-sm leading-7 text-zinc-300">{f.recentPrices}</div></div>
                <div className="text-right text-xs text-zinc-500">{new Date(data.timestamp).toLocaleTimeString()}</div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
