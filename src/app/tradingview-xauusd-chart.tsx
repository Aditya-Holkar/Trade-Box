"use client";

import { useEffect, useRef } from "react";

export default function TradingViewXauusdChart({ symbol }: { symbol: string }) {
  const container = useRef<HTMLDivElement>(null);
  const normalized = symbol.trim().toUpperCase() || "XAUUSD";
  const tvSymbol = normalized.includes(":") ? normalized : "OANDA:" + normalized;

  useEffect(() => {
    const host = container.current;
    if (!host) return;
    host.replaceChildren();

    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    Object.assign(widget.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
    });

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.text = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: "15",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      allow_symbol_change: false,
      hide_top_toolbar: false,
      hide_side_toolbar: true,
      withdateranges: true,
      save_image: false,
      studies: ["MASimple@tv-basicstudies", "RSI@tv-basicstudies", "MACD@tv-basicstudies"],
      calendar: false,
      support_host: "https://www.tradingview.com"
    });

    host.append(widget, script);
    return () => host.replaceChildren();
  }, [tvSymbol]);

  return (
    <section className="mt-4 overflow-hidden rounded border border-[#1b2532] bg-[#0c1118]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1b2532] px-4 py-3">
        <div>
          <div className="text-xs font-bold tracking-[0.16em] text-[#5eead4]">
            PHASE 4 · TECHNICAL ANALYSIS
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-lg font-semibold">{normalized}</span>
            <span className="text-xs text-[#7f8da1]">DIRECT TRADINGVIEW MARKET CHART</span>
          </div>
        </div>
        <div className="rounded border border-[#23413d] bg-[#0c1516] px-3 py-1.5 text-[10px] font-bold tracking-wider text-[#5eead4]">
          {tvSymbol}
        </div>
      </div>

      <div
        ref={container}
        className="relative h-[520px] w-full min-w-0 overflow-hidden sm:h-[600px] lg:h-[700px]"
      />
    </section>
  );
}
