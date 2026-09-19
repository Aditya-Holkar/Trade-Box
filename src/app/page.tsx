"use client";

import { useState } from "react";
import TradingViewXauusdChart from "./tradingview-xauusd-chart";
import XauusdDecisionPanel from "./xauusd-decision-panel";

export default function Home() {
  const [symbol, setSymbol] = useState("XAUUSD");

  return (
    <main className="min-h-screen bg-[#070b10] p-3 md:p-5">
      <div className="mx-auto max-w-[1700px]">
        <div className="mt-4 rounded border border-[#1b2532] bg-[#0c1118] p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[10px] font-bold tracking-[0.16em] text-[#5eead4]">MARKET SEARCH</div>
              <div className="mt-1 text-xs text-[#7f8da1]">Search a symbol here to keep the TradingView chart and intelligence panel synchronized.</div>
            </div>
            <form
              className="flex w-full max-w-md gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const value = new FormData(event.currentTarget).get("symbol");
                if (typeof value === "string" && value.trim()) setSymbol(value.trim().toUpperCase());
              }}
            >
              <input
                name="symbol"
                aria-label="Search market symbol"
                defaultValue="XAUUSD"
                placeholder="XAUUSD, EURUSD, AAPL..."
                className="min-w-0 flex-1 rounded border border-[#263444] bg-[#080d13] px-3 py-2 text-sm font-mono text-[#e5edf5] outline-none placeholder:text-[#536174] focus:border-[#5eead4]"
              />
              <button type="submit" className="rounded border border-[#23413d] bg-[#0c1516] px-4 py-2 text-[10px] font-bold tracking-wider text-[#5eead4] hover:border-[#5eead4]">SEARCH</button>
            </form>
          </div>
        </div>
        <TradingViewXauusdChart symbol={symbol} />
        <XauusdDecisionPanel symbol={symbol} />
      </div>
    </main>
  );
}
