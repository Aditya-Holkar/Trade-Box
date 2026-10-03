"use client";

import { useCallback, useEffect, useState } from "react";

type Snapshot = {
  price: { bid:number; ask:number; mid:number; spread:number };
  decision: { action:"buy"|"sell"|"hold"; reason:string; probabilities:{buy:number;sell:number;hold:number} };
  features: { market:{trend:string;session:string;volatility:string}; technical:{rsi14:number;ema20:number;ema50:number;ema200:number;atr5m:number;atr15m:number}; recentPrices:number[]|string };
  mode:string;
  risk:{allowed:boolean;reason:string};
  account?:{balance:number;equity:number};
  positions?:unknown[];
  timestamp:string;
};

export default function JevXauusdPage() {
  const [data,setData]=useState<Snapshot|null>(null);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);
  const refresh=useCallback(async()=>{
    try{
      setLoading(true);
      const res=await fetch("/api/xauusd-jev",{cache:"no-store"});
      const json=await res.json();
      if(!res.ok) throw new Error(json.error||"Unable to read XAUUSD market data");
      setData(json); setError("");
    }catch(e){setError(e instanceof Error?e.message:"Unable to connect");}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{refresh();},[refresh]);

  return <main className="min-h-screen bg-[#08090c] px-4 py-6 text-zinc-100">
    <div className="mx-auto max-w-7xl">
      <header className="mb-5 flex items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div><div className="text-xs font-bold tracking-[.2em] text-teal-300">JEV / XAUUSD</div><h1 className="mt-1 text-2xl font-semibold">Standalone Decision Engine</h1><p className="mt-1 text-sm text-zinc-500">Cloud market data → features → Jev → risk gate.</p></div>
        <button onClick={refresh} disabled={loading} className="rounded border border-zinc-700 px-4 py-2 text-sm hover:border-teal-300 disabled:cursor-not-allowed disabled:opacity-50">{loading?"Refreshing…":"Refresh"}</button>
      </header>
      {error&&<div className="mb-5 rounded border border-red-900 bg-red-950/30 p-4 text-sm text-red-300">Market data: {error}</div>}
      {data&&<div className="space-y-4">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric title="XAUUSD" value={data.price.mid.toFixed(2)} sub={`Bid ${data.price.bid.toFixed(2)} · Ask ${data.price.ask.toFixed(2)}`}/>
          <Metric title="Decision" value={data.decision.action.toUpperCase()} sub={data.decision.reason} accent/>
          <Metric title="Trend / Session" value={data.features.market.trend} sub={`${data.features.market.session} · ${data.features.market.volatility} volatility`}/>
          <Metric title="Mode" value={data.mode} sub="DRY_RUN blocks real execution"/>
        </section>
        <section className="grid gap-4 lg:grid-cols-3">
          <Card title="Decision probabilities">{(["buy","sell","hold"] as const).map(k=><div key={k} className="mb-3"><div className="mb-1 flex justify-between text-xs uppercase"><span>{k}</span><span>{(data.decision.probabilities[k]*100).toFixed(1)}%</span></div><div className="h-2 rounded bg-zinc-800"><div className="h-2 rounded bg-teal-300" style={{width:`${Math.max(0,Math.min(100,data.decision.probabilities[k]*100))}%`}}/></div></div>)}</Card>
          <Card title="Technical state"><Stats items={[["RSI 14",data.features.technical.rsi14.toFixed(1)],["EMA 20",data.features.technical.ema20.toFixed(2)],["EMA 50",data.features.technical.ema50.toFixed(2)],["EMA 200",data.features.technical.ema200.toFixed(2)],["ATR 5m",data.features.technical.atr5m.toFixed(3)],["ATR 15m",data.features.technical.atr15m.toFixed(3)]]}/></Card>
          <Card title="Risk gate"><div className={`mb-2 text-xl font-bold ${data.risk.allowed?"text-teal-300":"text-red-300"}`}>{data.risk.allowed?"READY":"BLOCKED"}</div><p className="mb-4 text-sm text-zinc-500">{data.risk.reason}</p><Stats items={[["Spread",data.price.spread.toFixed(2)],["Positions",String(data.positions?.length??0)],["Balance",data.account?.balance?.toFixed(2)??"—"],["Equity",data.account?.equity?.toFixed(2)??"—"]]}/></Card>
        </section>
        <Card title="Recent XAUUSD closes"><div className="break-all font-mono text-xs text-zinc-400">{(Array.isArray(data.features.recentPrices) ? data.features.recentPrices : String(data.features.recentPrices).trim().split(/\s+/).filter(Boolean)).join(" · ")}</div><div className="mt-3 text-xs text-zinc-600">{new Date(data.timestamp).toLocaleTimeString()}</div></Card>
      </div>}
    </div>
  </main>;
}
function Metric({title,value,sub,accent}:{title:string;value:string;sub:string;accent?:boolean}){return <div className="rounded border border-zinc-800 bg-zinc-950/60 p-4"><div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{title}</div><div className={`mt-2 text-2xl font-bold ${accent?"text-teal-300":""}`}>{value}</div><div className="mt-1 text-xs text-zinc-500">{sub}</div></div>}
function Card({title,children}:{title:string;children:React.ReactNode}){return <div className="rounded border border-zinc-800 bg-zinc-950/60 p-4"><div className="mb-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">{title}</div>{children}</div>}
function Stats({items}:{items:[string,string][]}){return <div className="grid grid-cols-2 gap-4">{items.map(([k,v])=><div key={k}><div className="text-[10px] uppercase text-zinc-600">{k}</div><div className="mt-1 font-mono text-sm text-zinc-200">{v}</div></div>)}</div>}
