"use client";

import { useCallback, useEffect, useState } from "react";

type Snapshot = any;
const card = "card";

export default function Page() {
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
    <main className="page">
      <div className="shell">
        <header className="header">
          <div>
            <div className="eyebrow">JEV / XAUUSD</div>
            <h1>Standalone Decision Engine</h1>
            <p>MT5 → features → Jev → risk gate → optional MT5 execution.</p>
          </div>
          <button className="button" onClick={refresh}>{loading ? "Refreshing…" : "Refresh"}</button>
        </header>

        {error && <div className="error">MT5 bridge: {error}<small>Start mt5/mt5_service.py and verify MT5 is open and logged in.</small></div>}

        {data && (
          <>
            <section className="grid four">
              <Metric title="XAUUSD" value={price.mid.toFixed(2)} sub={"Bid " + price.bid.toFixed(2) + " · Ask " + price.ask.toFixed(2)} />
              <Metric title="Decision" value={data.decision.action.toUpperCase()} sub={data.decision.reason} accent />
              <Metric title="Trend / Session" value={f.market.trend} sub={f.market.session + " · " + f.market.volatility + " volatility"} />
              <Metric title="Mode" value={data.mode} sub="DRY_RUN blocks real execution" />
            </section>

            <section className="grid three">
              <div className={card}><Label>Decision probabilities</Label>
                <div className="bars">
                  {([["BUY", p.buy], ["SELL", p.sell], ["HOLD", p.hold]] as [string, number][]).map(([name, n]) =>
                    <div key={name}><div className="bar-label"><span>{name}</span><span>{(Number(n) * 100).toFixed(1)}%</span></div><div className="track"><div className="fill" style={{width: Math.max(0, Math.min(100, Number(n) * 100)) + "%"}} /></div></div>
                  )}
                </div>
              </div>

              <div className={card}><Label>Technical state</Label>
                <div className="stats">
                  <Stat k="RSI 14" v={f.technical.rsi14.toFixed(1)} />
                  <Stat k="EMA 20" v={f.technical.ema20.toFixed(2)} />
                  <Stat k="EMA 50" v={f.technical.ema50.toFixed(2)} />
                  <Stat k="EMA 200" v={f.technical.ema200.toFixed(2)} />
                  <Stat k="ATR 5m" v={f.technical.atr5m.toFixed(3)} />
                  <Stat k="ATR 15m" v={f.technical.atr15m.toFixed(3)} />
                </div>
              </div>

              <div className={card}><Label>Risk gate</Label>
                <div className={data.risk.allowed ? "ready" : "blocked"}>{data.risk.allowed ? "READY" : "BLOCKED"}</div>
                <p className="muted">{data.risk.reason}</p>
                <div className="stats">
                  <Stat k="Spread" v={price.spread.toFixed(2)} />
                  <Stat k="Positions" v={String(data.positions?.length ?? 0)} />
                  <Stat k="Balance" v={data.account?.balance?.toFixed(2) ?? "—"} />
                  <Stat k="Equity" v={data.account?.equity?.toFixed(2) ?? "—"} />
                </div>
              </div>
            </section>

            <section className={card}><Label>Recent XAUUSD closes</Label><p className="prices">{f.recentPrices}</p><div className="timestamp">{new Date(data.timestamp).toLocaleTimeString()}</div></section>
          </>
        )}
      </div>
    </main>
  );
}

function Label({children}:{children:React.ReactNode}) { return <div className="label">{children}</div>; }
function Metric({title,value,sub,accent}:{title:string,value:string,sub:string,accent?:boolean}) {
  return <div className={card}><Label>{title}</Label><div className={accent ? "metric accent" : "metric"}>{value}</div><div className="muted">{sub}</div></div>;
}
function Stat({k,v}:{k:string,v:string}) { return <div><div className="label">{k}</div><div className="stat">{v}</div></div>; }
