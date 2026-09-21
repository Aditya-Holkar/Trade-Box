"use client";

import { useEffect, useRef } from "react";

export default function TradingViewXauusdChart({ symbol }: { symbol: string }) {
  const container = useRef<HTMLDivElement>(null);
  const normalized = symbol.trim().toUpperCase() || "XAUUSD";
  const tvSymbol = normalized.includes(":")
    ? normalized
    : normalized === "XAUUSD" || normalized === "XAGUSD"
      ? "OANDA:" + normalized
      : normalized;

  useEffect(() => {
    const host = container.current;
    if (!host) return;
    host.replaceChildren();

    // TradingView's embed script expects the official container structure:
    // outer tradingview-widget-container + inner widget + sibling script.
    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container";
    Object.assign(wrapper.style, {
      width: "100%",
      height: "100%",
    });

    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    Object.assign(widget.style, {
      width: "100%",
      height: "100%",
    });

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.textContent = JSON.stringify({
      autosize: true,
      width: "100%",
      height: "100%",
      symbol: tvSymbol,
      interval: "15",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      allow_symbol_change: true,
      hide_top_toolbar: false,
      hide_side_toolbar: false,
      withdateranges: true,
      save_image: false,
      studies: [
        "MASimple@tv-basicstudies",
        "RSI@tv-basicstudies",
        "MACD@tv-basicstudies",
      ],
      show_popup_button: true,
      popup_width: "1000",
      popup_height: "650",
      enable_publishing: false,
      calendar: false,
      support_host: "https://www.tradingview.com",
    });

    wrapper.append(widget, script);
    host.append(wrapper);

    return () => {
      host.replaceChildren();
    };
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
        className="relative h-[552px] w-full min-w-0 overflow-hidden sm:h-[632px] lg:h-[732px] pointer-events-auto"
      />
    </section>
  );
}
