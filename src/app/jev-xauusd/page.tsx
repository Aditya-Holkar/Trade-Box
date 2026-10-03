"use client";

import {useCallback,useEffect,useState} from "react";

type Timeframe="5m"|"15m"|"30m"|"1h"|"1d"|"1w"|"1M";
const TIMEFRAMES:Timeframe[]=["5m","15m","30m","1h","1d","1w","1M"];
const LABELS:Record<Timeframe,string>={"5m":"5 Min","15m":"15 Min","30m":"30 Min","1h":"1 Hour","1d":"1 Day","1w":"1 Week","1M":"1 Month"};

type Decision={action:"buy"|"sell"|"hold";reason:string;probabilities:{buy:number;sell:number;hold:number}};
type Feature={bid:number;ask:number;mid:number;spread:number;market:{trend:string;session:string;volatility:string};technical:{rsi14:number;ema20:number;ema50:number;ema200:number;atr5m:number;atr15m:number;atr1h:number};recentPrices:number[]|string};
type Snapshot={price:{bid:number;ask:number;mid:number;spread:number};decision:Decision;features:Feature;timeframes:Record<Timeframe,{timeframe:Timeframe;features:Feature;decision:Decision}>;mode:string;risk:{allowed:boolean;reason:string};account?:{balance:number;equity:number};positions?:unknown[];timestamp:string};

const ACTION_STYLES={
  buy:{text:"text-emerald-400",bg:"bg-emerald-500/10",border:"border-emerald-500/30",bar:"bg-emerald-400"},
  sell:{text:"text-rose-400",bg:"bg-rose-500/10",border:"border-rose-500/30",bar:"bg-rose-400"},
  hold:{text:"text-amber-400",bg:"bg-amber-500/10",border:"border-amber-500/30",bar:"bg-amber-400"}
} as const;

export default function JevXauusdPage(){
  const[data,setData]=useState<Snapshot|null>(null);const[error,setError]=useState("");const[loading,setLoading]=useState(true);const[selected,setSelected]=useState<Timeframe>("5m");
  const refresh=useCallback(async()=>{try{setLoading(true);const res=await fetch("/api/xauusd-jev",{cache:"no-store"});const json=await res.json();if(!res.ok)throw new Error(json.error||"Unable to read XAUUSD market data");setData(json);setError("")}catch(e){setError(e instanceof Error?e.message:"Unable to connect")}finally{setLoading(false)}},[]);
  useEffect(()=>{refresh()},[refresh]);
  const current=data?.timeframes?.[selected];

  return <main className="min-h-screen bg-[#070A12] px-4 py-6 text-slate-100"><div className="mx-auto max-w-7xl">
    <header className="mb-5 flex flex-col gap-4 border-b border-slate-800 pb-5 md:flex-row md:items-center md:justify-between">
      <div><div className="text-xs font-bold tracking-[.2em] text-violet-400">JEV / XAUUSD</div><h1 className="mt-1 text-2xl font-semibold">Multi-Timeframe Decision Engine</h1><p className="mt-1 text-sm text-slate-500">Jev analysis across 5m, 15m, 30m, 1h, 1d, 1w and 1M.</p></div>
      <button onClick={refresh} disabled={loading} className="rounded border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm transition hover:border-violet-400 hover:text-violet-300 disabled:cursor-not-allowed disabled:opacity-50">{loading?"Refreshing…":"Refresh All Timeframes"}</button>
    </header>
    {error&&<div className="mb-5 rounded border border-rose-900 bg-rose-950/30 p-4 text-sm text-rose-300">Market data: {error}</div>}
    {data&&<div className="space-y-4">
      <section className="grid grid-cols-2 gap-2 rounded border border-slate-800 bg-slate-950/70 p-2 sm:grid-cols-4 lg:grid-cols-7">{TIMEFRAMES.map(tf=><button key={tf} onClick={()=>setSelected(tf)} className={`rounded px-3 py-3 text-sm font-semibold transition ${selected===tf?"bg-violet-500 text-white shadow-lg shadow-violet-500/20":"text-slate-400 hover:bg-slate-800 hover:text-slate-100"}`}>{LABELS[tf]}</button>)}</section>
      {current&&<><section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric title={LABELS[selected]} value={current.features.mid.toFixed(2)} sub={`Bid ${current.features.bid.toFixed(2)} · Ask ${current.features.ask.toFixed(2)}`}/>
        <Metric title="Jev Decision" value={current.decision.action.toUpperCase()} sub={current.decision.reason} accent action={current.decision.action}/>
        <Metric title="Trend / Session" value={current.features.market.trend} sub={`${current.features.market.session} · ${current.features.market.volatility} volatility`}/>
        <Metric title="Last Update" value={new Date(data.timestamp).toLocaleTimeString()} sub="Manual refresh only"/>
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        <Card title={`${LABELS[selected]} Jev probabilities`}>{(["buy","sell","hold"] as const).map(k=>{const style=ACTION_STYLES[k];return <div key={k} className="mb-3"><div className="mb-1 flex justify-between text-xs uppercase"><span className={style.text}>{k}</span><span className="text-slate-300">{(current.decision.probabilities[k]*100).toFixed(1)}%</span></div><div className="h-2 rounded bg-slate-800"><div className={`h-2 rounded ${style.bar}`} style={{width:`${Math.max(0,Math.min(100,current.decision.probabilities[k]*100))}%`}}/></div></div>})}</Card>
        <Card title="Technical state"><Stats items={[["RSI 14",current.features.technical.rsi14.toFixed(1)],["EMA 20",current.features.technical.ema20.toFixed(2)],["EMA 50",current.features.technical.ema50.toFixed(2)],["EMA 200",current.features.technical.ema200.toFixed(2)],["ATR 5m",current.features.technical.atr5m.toFixed(3)],["ATR 15m",current.features.technical.atr15m.toFixed(3)]]}/></Card>
        <Card title="Risk gate"><div className={`mb-2 inline-flex rounded border px-2 py-1 text-xl font-bold ${data.risk.allowed?"border-emerald-500/30 bg-emerald-500/10 text-emerald-400":"border-rose-500/30 bg-rose-500/10 text-rose-400"}`}>{data.risk.allowed?"READY":"BLOCKED"}</div><p className="mb-4 text-sm text-slate-500">{data.risk.reason}</p><Stats items={[["Spread",current.features.spread.toFixed(2)],["Positions",String(data.positions?.length??0)],["Balance",data.account?.balance?.toFixed(2)??"—"],["Equity",data.account?.equity?.toFixed(2)??"—"]]}/></Card>
      </section>
      <Card title={`Recent XAUUSD closes · ${LABELS[selected]}`}><div className="break-all font-mono text-xs text-slate-400">{(Array.isArray(current.features.recentPrices)?current.features.recentPrices:String(current.features.recentPrices).trim().split(/\s+/).filter(Boolean)).join(" · ")}</div></Card></>}
      <Card title="All timeframe decisions"><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">{TIMEFRAMES.map(tf=>{const d=data.timeframes[tf].decision;const style=ACTION_STYLES[d.action];return <button key={tf} onClick={()=>setSelected(tf)} className={`rounded border p-3 text-left transition ${style.border} ${style.bg} hover:brightness-110`}><div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-400">{LABELS[tf]}</span><span className={`rounded px-2 py-1 text-sm font-bold ${style.text}`}>{d.action.toUpperCase()}</span></div><div className="mt-2 text-xs text-slate-500">B {(d.probabilities.buy*100).toFixed(0)}% · S {(d.probabilities.sell*100).toFixed(0)}% · H {(d.probabilities.hold*100).toFixed(0)}%</div></button>})}</div></Card>
    </div>}
  </div></main>
}
function Metric({title,value,sub,accent,action}:{title:string;value:string;sub:string;accent?:boolean;action?:"buy"|"sell"|"hold"}){const style=action?ACTION_STYLES[action]:null;return <div className={`rounded border bg-slate-950/70 p-4 ${style?style.border:"border-slate-800"}`}><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{title}</div><div className={`mt-2 text-2xl font-bold ${accent&&style?style.text:accent?"text-violet-400":""}`}>{value}</div><div className="mt-1 text-xs text-slate-500">{sub}</div></div>}
function Card({title,children}:{title:string;children:React.ReactNode}){return <div className="rounded border border-slate-800 bg-slate-950/70 p-4"><div className="mb-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">{title}</div>{children}</div>}
function Stats({items}:{items:[string,string][]}){return <div className="grid grid-cols-2 gap-4">{items.map(([k,v])=><div key={k}><div className="text-[10px] uppercase text-slate-600">{k}</div><div className="mt-1 font-mono text-sm text-slate-200">{v}</div></div>)}</div>}
