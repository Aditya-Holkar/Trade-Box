"use client";

import { useEffect, useState } from "react";

type Report = any;

export default function IntelligencePanel({ symbol }: { symbol: string }) {
  const [report, setReport] = useState<Report>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    setLoading(true); setError(null);
    try {
      const response = await fetch(`/api/intelligence/analyze?symbol=${encodeURIComponent(symbol)}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Analysis failed");
      setReport(body.data);
    } catch (e) { setError(e instanceof Error ? e.message : "Analysis failed"); }
    finally { setLoading(false); }
  }

  useEffect(() => { void analyze(); }, [symbol]);

  const setup = report?.setup;
  const bt = report?.backtest;
  const fundamental = report?.fundamentals;
  const technical = report?.technical;
  const news = report?.news ?? [];
  const fmt = (value: number | null | undefined) => value == null ? "—" : value.toLocaleString(undefined, { maximumFractionDigits: 2 });

  return <section className="mt-4 rounded border border-[#1b2532] bg-[#0c1118]">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1b2532] px-4 py-3">
      <div><div className="text-xs font-bold tracking-[0.16em] text-[#5eead4]">TRADE INTELLIGENCE ENGINE</div><div className="mt-1 text-lg font-semibold">{symbol} · Fundamental + Technical + News + Backtest</div></div>
      <button onClick={() => void analyze()} disabled={loading} className="rounded border border-[#263444] px-3 py-1.5 text-[10px] font-bold text-[#9aa8ba] hover:border-[#5eead4] hover:text-[#5eead4]">{loading ? "ANALYZING…" : "RUN ANALYSIS"}</button>
    </div>
    {error && <div className="m-4 rounded border border-[#5b2932] bg-[#1a1014] p-3 text-xs text-[#f08a9a]">{error}</div>}
    {loading && !report && <div className="p-8 text-center text-sm text-[#718096]">Running multi-factor analysis and historical backtest…</div>}
    {report && <div className="space-y-4 p-4">
      <div className="grid gap-3 lg:grid-cols-[1.1fr_1fr_1fr]">
        <div className={`rounded border p-4 ${setup.direction === "BUY" ? "border-[#23413d] bg-[#0c1516]" : setup.direction === "SELL" ? "border-[#5b2932] bg-[#1a1014]" : "border-[#263444] bg-[#101722]"}`}>
          <div className="text-[10px] tracking-widest text-[#7f8da1]">CURRENT DECISION</div>
          <div className="mt-2 text-3xl font-black">{setup.direction}</div>
          <div className="mt-2 text-xs text-[#9aa8ba]">Regime: {technical.regime}</div>
          <div className="mt-3 space-y-1 text-xs">{setup.rationale.map((x: string) => <div key={x}>• {x}</div>)}</div>
        </div>
        <div className="rounded border border-[#1b2532] bg-[#101722] p-4"><div className="text-[10px] tracking-widest text-[#7f8da1]">TRADE PLAN</div><div className="mt-3 grid grid-cols-2 gap-3 text-xs"><div>Entry<br/><b>{fmt(setup.entryLow)} – {fmt(setup.entryHigh)}</b></div><div>Stop<br/><b>{fmt(setup.stop)}</b></div><div>Target 1<br/><b>{fmt(setup.target1)}</b></div><div>Target 2<br/><b>{fmt(setup.target2)}</b></div><div>R:R<br/><b>{setup.riskReward ? `1:${fmt(setup.riskReward)}` : "—"}</b></div><div>Price<br/><b>{fmt(report.quote.price)}</b></div></div><div className="mt-3 text-[11px] text-[#7f8da1]">{setup.invalidation}</div></div>
        <div className="rounded border border-[#1b2532] bg-[#101722] p-4"><div className="text-[10px] tracking-widest text-[#7f8da1]">BACKTEST · 1Y DAILY</div><div className="mt-3 grid grid-cols-2 gap-3 text-xs"><div>Trades<br/><b>{bt.trades.length}</b></div><div>Win rate<br/><b>{bt.winRatePct.toFixed(1)}%</b></div><div>Total return<br/><b>{bt.totalReturnPct.toFixed(1)}%</b></div><div>Profit factor<br/><b>{Number.isFinite(bt.profitFactor) ? bt.profitFactor.toFixed(2) : "∞"}</b></div><div>Max drawdown<br/><b>{bt.maxDrawdownPct.toFixed(1)}%</b></div><div>Expectancy<br/><b>{bt.expectancyR.toFixed(2)}R</b></div></div></div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded border border-[#1b2532] bg-[#101722] p-4"><div className="text-[10px] tracking-widest text-[#7f8da1]">FUNDAMENTALS</div><div className="mt-3 grid grid-cols-2 gap-3 text-xs"><div>Revenue<br/><b>{fmt(fundamental.revenue)}</b></div><div>Net income<br/><b>{fmt(fundamental.netIncome)}</b></div><div>EPS<br/><b>{fmt(fundamental.eps)}</b></div><div>Free cash flow<br/><b>{fmt(fundamental.freeCashFlow)}</b></div><div>P/E<br/><b>{fmt(fundamental.pe)}</b></div><div>Source<br/><b>{fundamental.source}</b></div></div></div>
        <div className="rounded border border-[#1b2532] bg-[#101722] p-4"><div className="text-[10px] tracking-widest text-[#7f8da1]">TECHNICAL EVIDENCE</div><div className="mt-3 space-y-2 text-xs">{technical.observations.slice(0, 8).map((x: any) => <div key={x.title} className="flex gap-2"><span className={x.state === "bullish" ? "text-[#5eead4]" : x.state === "bearish" ? "text-[#f08a9a]" : "text-[#9aa8ba]"}>●</span><div><b>{x.title}</b><div className="text-[#718096]">{x.detail}</div></div></div>)}</div></div>
        <div className="rounded border border-[#1b2532] bg-[#101722] p-4"><div className="text-[10px] tracking-widest text-[#7f8da1]">NEWS FLOW</div><div className="mt-3 space-y-2">{news.slice(0, 6).map((item: any) => <div key={`${item.title}-${item.publishedAt}`} className="text-xs"><span className={item.sentiment === "positive" ? "text-[#5eead4]" : item.sentiment === "negative" ? "text-[#f08a9a]" : "text-[#9aa8ba]"}>{item.sentiment.toUpperCase()}</span><div className="mt-0.5 text-[#d2dae5]">{item.title}</div></div>)}{!news.length && <div className="text-xs text-[#718096]">No recent headlines available.</div>}</div></div>
      </div>
      {!!report.dataWarnings?.length && <div className="rounded border border-[#3c3523] bg-[#17150e] p-3 text-[11px] text-[#c6b98a]">{report.dataWarnings.map((warning: string) => <div key={warning}>• {warning}</div>)}</div>}
    </div>}
  </section>;
}
