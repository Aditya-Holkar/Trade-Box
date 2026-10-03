"use client";

import {useCallback,useEffect,useState} from "react";

type Timeframe="5m"|"15m"|"30m"|"1h"|"1d"|"1w"|"1M";
const TIMEFRAMES:Timeframe[]=["5m","15m","30m","1h","1d","1w","1M"];
const LABELS:Record<Timeframe,string>={"5m":"5 Min","15m":"15 Min","30m":"30 Min","1h":"1 Hour","1d":"1 Day","1w":"1 Week","1M":"1 Month"};

type Decision={action:"buy"|"sell"|"hold";reason:string;probabilities:{buy:number;sell:number;hold:number}};
type Feature={bid:number;ask:number;mid:number;spread:number;market:{trend:string;session:string;volatility:string};technical:{rsi14:number;ema20:number;ema50:number;ema200:number;atr5m:number;atr15m:number;atr1h:number};recentPrices:number[]|string};
type Snapshot={price:{bid:number;ask:number;mid:number;spread:number};decision:Decision;features:Feature;timeframes:Record<Timeframe,{timeframe:Timeframe;features:Feature;decision:Decision}>;mode:string;risk:{allowed:boolean;reason:string};account?:{balance:number;equity:number};positions?:unknown[];timestamp:string};

export default function JevXauusdPage(){
  const[data,setData]=useState<Snapshot|null>(null);const[error,setError]=useState("");const[loading,setLoading]=useState(true);const[selected,setSelected]=useState<Timeframe>("5m");
  const refresh=useCallback(async()=>{try{setLoading(true);const res=await fetch("/api/xauusd-jev",{cache:"no-store"});const json=await res.json();if(!res.ok)throw new Error(json.error||"Unable to read XAUUSD market data");setData(json);setError("")}catch(e){setError(e instanceof Error?e.message:"Unable to connect")}finally{setLoading(false)}},[]);
  useEffect(()=>{refresh()},[refresh]);
  const current=data?.timeframes?.[selected];

  return <main className="min-h-screen bg-[#08090c] px-4 py-6 text-zinc-100"><div className="mx-auto max-w-7xl">
    <header className="mb-5 flex flex-col gap-4 border-b border-zinc-800 pb-5 md:flex-row md:items-center md:justify-between">
      <div><div className="text-xs font-bold tracking-[.2em] text-teal-300">JEV / XAUUSD</div><h1 className="mt-1 text-2xl font-semibold">Multi-Timeframe Decision Engine</h1><p className="mt-1 text-sm text-zinc-500">Jev analysis across 5m, 15m, 30m, 1h, 1d, 1w and 1M.</p></div>
      <button onClick={refresh} disabled={loading} className="rounded border border-zinc-700 px-4 py-2 text-sm hover:border-teal-300 disabled:cursor-not-allowed disabled:opacity-50">{loading?"Refreshing…":"Refresh All Timeframes"}</button>
    </header>
    {error&&<div className="mb-5 rounded border border-red-900 bg-red-950/30 p-4 text-sm text-red-300">Market data: {error}</div>}
    {data&&<div className="space-y-4">
      <section className="grid grid-cols-2 gap-2 rounded border border-zinc-800 bg-zinc-950/60 p-2 sm:grid-cols-4 lg:grid-cols-7">{TIMEFRAMES.map(tf=><button key={tf} onClick={()=>setSelected(tf)} className={`rounded px-3 py-3 text-sm font-semibold transition ${selected===tf?"bg-teal-300 text-zinc-950":"text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"}`}>{LABELS[tf]}</button>)}</section>
      {current&&<><section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric title={LABELS[selected]} value={current.features.mid.toFixed(2)} sub={`Bid ${current.features.bid.toFixed(2)} · Ask ${current.features.ask.toFixed(2)}`}/>
        <Metric title="Jev Decision" value={current.decision.action.toUpperCase()} sub={current.decision.reason} accent/>
        <Metric title="Trend / Session" value={current.features.market.trend} sub={`${current.features.market.session} · ${current.features.market.volatility} volatility`}/>
        <Metric title="Last Update" value={new Date(data.timestamp).toLocaleTimeString()} sub="Manual refresh only"/>
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        <Card title={`${LABELS[selected]} Jev probabilities`}>{(["buy","sell","hold"] as const).map(k=><div key={k} className="mb-3"><div className="mb-1 flex justify-between text-xs uppercase"><span>{k}</span><span>{(current.decision.probabilities[k]*100).toFixed(1)}%</span></div><div className="h-2 rounded bg-zinc-800"><div className="h-2 rounded bg-teal-300" style={{width:`${Math.max(0,Math.min(100,current.decision.probabilities[k]*100))}%`}}/></div></div>)}</Card>
        <Card title="Technical state"><Stats items={[["RSI 14",current.features.technical.rsi14.toFixed(1)],["EMA 20",current.features.technical.ema20.toFixed(2)],["EMA 50",current.features.technical.ema50.toFixed(2)],["EMA 200",current.features.technical.ema200.toFixed(2)],["ATR 5m",current.features.technical.atr5m.toFixed(3)],["ATR 15m",current.features.technical.atr15m.toFixed(3)]]}/></Card>
        <Card title="Risk gate"><div className={`mb-2 text-xl font-bold ${data.risk.allowed?"text-teal-300":"text-red-300"}`}>{data.risk.allowed?"READY":"BLOCKED"}</div><p className="mb-4 text-sm text-zinc-500">{data.risk.reason}</p><Stats items={[["Spread",current.features.spread.toFixed(2)],["Positions",String(data.positions?.length??0)],["Balance",data.account?.balance?.toFixed(2)??"—"],["Equity",data.account?.equity?.toFixed(2)??"—"]]}/></Card>
      </section>
      <Card title={`Recent XAUUSD closes · ${LABELS[selected]}`}><div className="break-all font-mono text-xs text-zinc-400">{(Array.isArray(current.features.recentPrices)?current.features.recentPrices:String(current.features.recentPrices).trim().split(/\s+/).filter(Boolean)).join(" · ")}</div></Card></>}
      <Card title="All timeframe decisions"><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">{TIMEFRAMES.map(tf=>{const d=data.timeframes[tf].decision;return <button key={tf} onClick={()=>setSelected(tf)} className="rounded border border-zinc-800 p-3 text-left hover:border-zinc-600"><div className="flex items-center justify-between"><span className="text-xs font-bold text-zinc-400">{LABELS[tf]}</span><span className={`text-sm font-bold ${d.action==="buy"?"text-teal-300":d.action==="sell"?"text-red-300":"text-zinc-300"}`}>{d.action.toUpperCase()}</span></div><div className="mt-2 text-xs text-zinc-500">B {(d.probabilities.buy*100).toFixed(0)}% · S {(d.probabilities.sell*100).toFixed(0)}% · H {(d.probabilities.hold*100).toFixed(0)}%</div></button>})}</div></Card>
    </div>}
  </div></main>
}
function Metric({title,value,sub,accent}:{title:string;value:string;sub:string;accent?:boolean}){return <div className="rounded border border-zinc-800 bg-zinc-950/60 p-4"><div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{title}</div><div className={`mt-2 text-2xl font-bold ${accent?"text-teal-300":""}`}>{value}</div><div className="mt-1 text-xs text-zinc-500">{sub}</div></div>}
function Card({title,children}:{title:string;children:React.ReactNode}){return <div className="rounded border border-zinc-800 bg-zinc-950/60 p-4"><div className="mb-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">{title}</div>{children}</div>}
function Stats({items}:{items:[string,string][]}){return <div className="grid grid-cols-2 gap-4">{items.map(([k,v])=><div key={k}><div className="text-[10px] uppercase text-zinc-600">{k}</div><div className="mt-1 font-mono text-sm text-zinc-200">{v}</div></div>)}</div>}
