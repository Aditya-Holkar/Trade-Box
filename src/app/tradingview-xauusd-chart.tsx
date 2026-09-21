"use client";

import { useEffect, useRef } from "react";

const TV_ALIASES: Record<string, string> = {
  XAUUSD: "OANDA:XAUUSD", XAGUSD: "OANDA:XAGUSD",
  EURUSD: "OANDA:EURUSD", GBPUSD: "OANDA:GBPUSD", USDJPY: "OANDA:USDJPY", USDCHF: "OANDA:USDCHF", AUDUSD: "OANDA:AUDUSD", USDCAD: "OANDA:USDCAD", NZDUSD: "OANDA:NZDUSD", EURGBP: "OANDA:EURGBP", EURJPY: "OANDA:EURJPY", GBPJPY: "OANDA:GBPJPY", AUDJPY: "OANDA:AUDJPY",
  BTCUSD: "COINBASE:BTCUSD", ETHUSD: "COINBASE:ETHUSD", XRPUSD: "COINBASE:XRPUSD", SOLUSD: "COINBASE:SOLUSD",
  VEDL: "NSE:VEDL", "VEDL.NS": "NSE:VEDL", RELIANCE: "NSE:RELIANCE", "RELIANCE.NS": "NSE:RELIANCE", TCS: "NSE:TCS", "TCS.NS": "NSE:TCS", INFY: "NSE:INFY", "INFY.NS": "NSE:INFY",
  AAPL: "NASDAQ:AAPL", MSFT: "NASDAQ:MSFT", NVDA: "NASDAQ:NVDA", AMZN: "NASDAQ:AMZN", GOOGL: "NASDAQ:GOOGL", TSLA: "NASDAQ:TSLA", META: "NASDAQ:META"
};

function isTradingViewWidgetSupported(symbol: string) {
  const raw = symbol.trim().toUpperCase();
  if (raw.endsWith(".NS") || raw.startsWith("NSE:")) return false;
  return true;
}

function toTradingViewSymbol(symbol: string) {
  const raw = symbol.trim().toUpperCase();
  if (!raw) return "OANDA:XAUUSD";
  if (raw.includes(":")) return raw;
  return TV_ALIASES[raw] ?? raw;
}

export default function TradingViewXauusdChart({ symbol }: { symbol: string }) {
  const container = useRef<HTMLDivElement>(null);
  const normalized = symbol.trim().toUpperCase() || "XAUUSD";
  const tvSymbol = toTradingViewSymbol(normalized);
  const showChart = isTradingViewWidgetSupported(normalized);

  useEffect(() => {
    const host = container.current;
    if (!host) return;
    host.replaceChildren();

    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container";
    Object.assign(wrapper.style, { width: "100%", height: "100%" });

    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    Object.assign(widget.style, { width: "100%", height: "100%" });

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.textContent = JSON.stringify({
      autosize: true,
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
      studies: ["MASimple@tv-basicstudies", "RSI@tv-basicstudies", "MACD@tv-basicstudies"],
      show_popup_button: true,
      popup_width: "1000",
      popup_height: "650",
      enable_publishing: false,
      calendar: false,
      support_host: "https://www.tradingview.com"
    });

    wrapper.append(widget, script);
    host.append(wrapper);
    return () => host.replaceChildren();
  }, [tvSymbol]);

  return (
    <section className="mt-4 overflow-hidden rounded border border-[#1b2532] bg-[#0c1118]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1b2532] px-4 py-3">
        <div>
          <div className="text-xs font-bold tracking-[0.16em] text-[#5eead4]">PHASE 4 · TECHNICAL ANALYSIS</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-lg font-semibold">{normalized}</span>
            <span className="text-xs text-[#7f8da1]">DIRECT TRADINGVIEW MARKET CHART</span>
          </div>
        </div>
        <div className="rounded border border-[#23413d] bg-[#0c1516] px-3 py-1.5 text-[10px] font-bold tracking-wider text-[#5eead4]">{tvSymbol}</div>
      </div>
      <div ref={container} className="relative h-[552px] w-full min-w-0 overflow-hidden sm:h-[632px] lg:h-[732px]" />
    </section>
  );
}
