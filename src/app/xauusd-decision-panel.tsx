"use client";

import { useEffect, useState } from "react";

type Horizon = {
  horizon: string; bias: "BUY" | "SELL" | "WAIT"; score: number; confidence: number;
  trigger: string; entry: string; stop: string; targets: string; rationale: string[];
};
type Report = {
  quote: { price: number; bid?: number; ask?: number };
  horizons: Horizon[];
  technicals: Record<string, {score:number;price:number;atr:number;rsi:number;ema20:number;ema50:number;support:number;resistance:number;details:string[]}>;
  news: {title:string;link:string;publishedAt:string;sentiment:string}[];
  marketSentiment: {score:number;label:string};
  macro: {score:number;label:string};
  fundamentals: {dollarIndex:{value:number;changePct:number}|null;us10y:{value:number;changePct:number}|null;oil:{value:number;changePct:number}|null;centralBankContext:string;policyFlowContext:string};
  sources: {forexFactory:{available:boolean;headline:string;sentiment:string;url:string};capitolTrades:{available:boolean;headline:string;sentiment:string;url:string}};
  generatedAt: number;
  warnings: string[];
};

const fmt=(n:number|undefined)=>typeof n==="number"&&Number.isFinite(n)?n.toFixed(2):"—";

export default function XauusdDecisionPanel(){
  const [report,setReport]=useState<Report|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);

  async function load(){
    setLoading(true);setError(null);
    try{const r=await fetch("/api/xauusd/decision",{cache:"no-store"});const b=await r.json();if(!r.ok)throw new Error(b.error??"XAUUSD intelligence unavailable");setReport(b);}
    catch(e){setError(e instanceof Error?e.message:"XAUUSD intelligence unavailable");}
    finally{setLoading(false);}
  }
  useEffect(()=>{ void load(); const timer=window.setInterval(()=>void load(),30000); return ()=>window.clearInterval(timer); },[]);

  return <section className="mt-4 overflow-hidden rounded border border-[#1b2532] bg-[#0b1017]">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1b2532] px-4 py-4">
      <div>
        <div className="text-xs font-bold tracking-[.18em] text-[#5eead4]">XAUUSD · MULTI-HORIZON TRADE INTELLIGENCE</div>
        <div className="mt-1 text-lg font-semibold">News + sentiment + technicals + macro + policy context</div>
      </div>
      <button onClick={()=>void load()} disabled={loading} className="rounded border border-[#263444] px-3 py-2 text-[10px] font-bold tracking-wider text-[#9aa8ba] hover:border-[#5eead4] hover:text-[#5eead4]">{loading?"ANALYZING…":"REFRESH"}</button>
    </div>

    {error&&<div className="m-4 rounded border border-[#5b2932] bg-[#1a1014] p-3 text-xs text-[#f08a9a]">{error}</div>}
    {loading&&!report&&<div className="p-10 text-center text-sm text-[#718096]">Building the XAUUSD evidence stack…</div>}

    {report&&<div className="space-y-4 p-4">
      <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div className="rounded border border-[#23413d] bg-[#0c1516] p-4">
          <div className="text-[10px] tracking-widest text-[#7f8da1]">LIVE MARKET</div>
          <div className="mt-2 font-mono text-3xl font-black">{fmt(report.quote.price)}</div>
          <div className="mt-2 text-xs text-[#7f8da1]">Bid {fmt(report.quote.bid)} · Ask {fmt(report.quote.ask)}</div><div className="mt-1 text-[10px] text-[#5eead4]">LIVE SPOT · auto-refresh 30s</div>
        </div>
        <div className="rounded border border-[#1b2532] bg-[#101722] p-4"><div className="text-[10px] tracking-widest text-[#7f8da1]">MARKET SENTIMENT</div><div className="mt-2 text-xl font-black">{report.marketSentiment.label}</div><div className="mt-1 text-xs text-[#7f8da1]">News-flow composite: {report.marketSentiment.score > 0 ? "+" : ""}{report.marketSentiment.score}</div></div>
        <div className="rounded border border-[#1b2532] bg-[#101722] p-4"><div className="text-[10px] tracking-widest text-[#7f8da1]">MACRO / POLICY</div><div className="mt-2 text-xl font-black">{report.macro.label}</div><div className="mt-1 text-xs text-[#7f8da1]">Forex Factory + policy context</div></div>
        <div className="rounded border border-[#1b2532] bg-[#101722] p-4"><div className="text-[10px] tracking-widest text-[#7f8da1]">ENGINE MODE</div><div className="mt-2 text-xl font-black text-[#f5c16c]">CONFIRMATION</div><div className="mt-1 text-xs text-[#7f8da1]">No guaranteed outcomes</div></div>
      </div>

      <div className="overflow-x-auto rounded border border-[#1b2532]">
        <table className="w-full min-w-[1050px] text-left text-xs">
          <thead className="bg-[#101722] text-[10px] tracking-widest text-[#7f8da1]"><tr><th className="p-3">HORIZON</th><th>RECOMMENDATION</th><th>CONFIDENCE</th><th>ENTRY</th><th>STOP</th><th>TARGETS</th><th>TRIGGER</th></tr></thead>
          <tbody>{report.horizons.map(h=><tr key={h.horizon} className="border-t border-[#1b2532]"><td className="p-3 font-bold">{h.horizon}</td><td className={h.bias==="BUY"?"text-[#5eead4]":h.bias==="SELL"?"text-[#f08a9a]":"text-[#f5c16c]"}><b>{h.bias}</b><div className="text-[10px] text-[#617086]">Score {h.score>0?"+":""}{h.score}</div></td><td>{h.confidence.toFixed(0)}%</td><td>{h.entry}</td><td>{h.stop}</td><td>{h.targets}</td><td className="max-w-[320px] pr-3 text-[#9aa8ba]">{h.trigger}</td></tr>)}</tbody>
        </table>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        <div className="rounded border border-[#1b2532] bg-[#101722] p-4">
          <div className="text-[10px] tracking-widest text-[#7f8da1]">FUNDAMENTALS / MACRO</div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <div>DXY<br/><b>{report.fundamentals.dollarIndex?report.fundamentals.dollarIndex.value.toFixed(2):"—"}</b><div className="text-[#617086]">{report.fundamentals.dollarIndex?report.fundamentals.dollarIndex.changePct.toFixed(2)+"% 5D":"—"}</div></div>
            <div>US10Y<br/><b>{report.fundamentals.us10y?report.fundamentals.us10y.value.toFixed(2):"—"}</b><div className="text-[#617086]">{report.fundamentals.us10y?report.fundamentals.us10y.changePct.toFixed(2)+"% 5D":"—"}</div></div>
            <div>OIL<br/><b>{report.fundamentals.oil?report.fundamentals.oil.value.toFixed(2):"—"}</b><div className="text-[#617086]">{report.fundamentals.oil?report.fundamentals.oil.changePct.toFixed(2)+"% 5D":"—"}</div></div>
          </div>
          <div className="mt-3 text-[10px] leading-4 text-[#617086]">Gold has no corporate-style fundamentals; this panel uses macro fundamentals: USD, rates, energy, central-bank context and policy flow.</div>
        </div>
        <div className="rounded border border-[#1b2532] bg-[#101722] p-4">
          <div className="text-[10px] tracking-widest text-[#7f8da1]">TECHNICAL CONFLUENCE</div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            {([["M15","m15"],["30M","m30"],["1H","h1"],["1W","w1"],["1M","m1"]] as const).map(([label,key])=>{const x=report.technicals[key];return <div key={key} className="rounded border border-[#1b2532] p-3"><div className="font-bold">{label}</div><div className="mt-1 text-[#9aa8ba]">EMA {x.score>0?"bullish":"bearish"} · RSI {fmt(x.rsi)}</div><div className="text-[#617086]">S {fmt(x.support)} · R {fmt(x.resistance)}</div></div>})}
          </div>
        </div>
        <div className="rounded border border-[#1b2532] bg-[#101722] p-4">
          <div className="text-[10px] tracking-widest text-[#7f8da1]">NEWS ANALYSIS</div>
          <div className="mt-3 space-y-2">{report.news.length?report.news.slice(0,5).map((n,i)=><div key={i} className="border-b border-[#1b2532] pb-2 text-xs"><div>{n.title}</div><div className="mt-1 text-[10px] text-[#617086]">{n.sentiment.toUpperCase()} · {n.publishedAt}</div></div>):<div className="text-xs text-[#617086]">No recent headlines returned.</div>}</div>
        </div>
        <div className="rounded border border-[#1b2532] bg-[#101722] p-4">
          <div className="text-[10px] tracking-widest text-[#7f8da1]">EXTERNAL SOURCES</div>
          <div className="mt-3 space-y-3 text-xs">
            <div><b>Forex Factory</b><div className="mt-1 text-[#9aa8ba]">{report.sources.forexFactory.available?report.sources.forexFactory.headline:"Unavailable"}</div></div>
            <div><b>Capitol Trades</b><div className="mt-1 text-[#9aa8ba]">{report.sources.capitolTrades.available?report.sources.capitolTrades.headline:"Unavailable"}</div></div>
          </div>
        </div>
      </div>

      <div className="rounded border border-[#263444] bg-[#0c1118] p-4">
        <div className="text-[10px] tracking-widest text-[#f5c16c]">ACCURACY / DATA QUALITY GATES</div>
        <div className="mt-2 grid gap-2 text-xs text-[#9aa8ba] md:grid-cols-3">{report.warnings.map((w,i)=><div key={i}>• {w}</div>)}</div>
      </div>
      <div className="text-[10px] text-[#617086]">Updated {new Date(report.generatedAt).toLocaleTimeString()} · Research/simulation only · The engine does not place orders.</div>
    </div>}
  </section>;
}
