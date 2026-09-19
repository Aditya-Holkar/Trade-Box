"use client";

import { useEffect, useRef } from "react";

export default function TradingViewXauusdChart() {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = container.current;
    if (!host) return;

    host.replaceChildren();

    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.style.height = "calc(100% - 28px)";
    widget.style.width = "100%";
    widget.style.minHeight = "0";

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.text = JSON.stringify({
      autosize: true,
      symbol: "OANDA:XAUUSD",
      interval: "15",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      allow_symbol_change: true,
      hide_top_toolbar: false,
      hide_side_toolbar: true,
      withdateranges: true,
      save_image: false,
      studies: [
        "MASimple@tv-basicstudies",
        "RSI@tv-basicstudies",
        "MACD@tv-basicstudies"
      ],
      calendar: false,
      support_host: "https://www.tradingview.com"
    });

    const copyright = document.createElement("div");
    copyright.className = "tradingview-widget-copyright";
    copyright.style.height = "28px";
    copyright.style.display = "flex";
    copyright.style.alignItems = "center";
    copyright.style.justifyContent = "center";
    copyright.innerHTML =
      '<a href="https://www.tradingview.com/symbols/XAUUSD/" target="_blank" rel="noopener nofollow" style="font-size:10px;color:#7f8da1;text-decoration:none">XAUUSD chart by TradingView</a>';

    host.append(widget, script, copyright);

    return () => {
      host.replaceChildren();
    };
  }, []);

  return (
    <section className="mt-4 overflow-hidden rounded border border-[#1b2532] bg-[#0c1118]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1b2532] px-4 py-3">
        <div>
          <div className="text-xs font-bold tracking-[0.16em] text-[#5eead4]">
            PHASE 4 · TECHNICAL ANALYSIS
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-lg font-semibold">XAUUSD</span>
            <span className="text-xs text-[#7f8da1]">
              DIRECT TRADINGVIEW MARKET CHART
            </span>
            <span className="text-[10px] text-[#617086]">
              Use the symbol search in the chart toolbar
            </span>
          </div>
        </div>
        <div className="rounded border border-[#23413d] bg-[#0c1516] px-3 py-1.5 text-[10px] font-bold tracking-wider text-[#5eead4]">
          OANDA:XAUUSD · LIVE WIDGET
        </div>
      </div>

      <div
        ref={container}
        className="h-[560px] w-full min-w-0 sm:h-[640px] lg:h-[760px]"
      />
    </section>
  );
}
