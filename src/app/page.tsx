"use client";

import TradingViewXauusdChart from "./tradingview-xauusd-chart";
import XauusdDecisionPanel from "./xauusd-decision-panel";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#070b10] p-3 md:p-5">
      <div className="mx-auto max-w-[1700px]">
        <TradingViewXauusdChart />
        <XauusdDecisionPanel />
      </div>
    </main>
  );
}
