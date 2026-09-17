const modules = [
  ["MARKET", "Market data engine", "Quotes, OHLCV, market status, freshness"],
  ["SEARCH", "Universal search", "Symbols, companies, indices, crypto, forex"],
  ["CHARTS", "Professional charts", "Candles, volume, timeframes, comparisons"],
  ["TA", "Technical analysis", "Indicators, structure, explainable signals"],
  ["RESEARCH", "Research terminal", "Fundamentals, news, macro and events"],
  ["PORTFOLIO", "Portfolio & risk", "P&L, allocation, exposure and risk"],
];

export default function Home() {
  return (
    <main className="min-h-screen p-4 md:p-6">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-5 flex flex-wrap items-center gap-4 border-b border-[#1b2532] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded bg-[#5eead4] text-sm font-black text-[#07100f]">TB</div>
            <div>
              <div className="text-sm font-bold tracking-[0.18em]">TRADE BOX</div>
              <div className="text-[11px] text-[#7f8da1]">FINANCIAL RESEARCH TERMINAL</div>
            </div>
          </div>
          <div className="ml-auto flex min-w-[280px] flex-1 max-w-xl items-center rounded border border-[#1b2532] bg-[#0c1118] px-3 py-2 text-sm text-[#7f8da1]">
            <span className="mr-2 text-[#5eead4]">⌘K</span>
            Search symbols, companies, markets...
          </div>
          <div className="rounded border border-[#1b2532] px-3 py-2 text-xs text-[#7f8da1]">PHASE 0</div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded border border-[#1b2532] bg-[#0c1118] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold tracking-[0.16em] text-[#5eead4]">MISSION CONTROL</div>
                <h1 className="mt-1 text-2xl font-semibold">Build the terminal, one reliable layer at a time.</h1>
              </div>
              <div className="text-right text-[11px] text-[#7f8da1]">SYSTEM<br/><span className="text-[#5eead4]">FOUNDATION READY</span></div>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-[#9aa8ba]">
              Trade Box starts with the application shell. Market providers will plug into a normalized API boundary in the next phase, keeping the UI independent from individual data vendors.
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-3">
              {[["APP", "Next.js App Router"], ["LANG", "TypeScript"], ["UI", "Terminal-first shell"]].map(([k, v]) => (
                <div key={k} className="rounded border border-[#1b2532] bg-[#101722] p-3">
                  <div className="text-[10px] tracking-widest text-[#7f8da1]">{k}</div>
                  <div className="mt-1 text-sm">{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded border border-[#1b2532] bg-[#0c1118] p-5">
            <div className="text-xs font-bold tracking-[0.16em] text-[#5eead4]">PHASE 0 CHECKLIST</div>
            <div className="mt-4 space-y-3 text-sm">
              {["Repository initialized", "Next.js + TypeScript shell", "App Router structure", "Terminal visual language", "Provider boundary planned", "Documentation started"].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <span className="text-[#5eead4]">✓</span><span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-4 rounded border border-[#1b2532] bg-[#0c1118] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold tracking-[0.16em] text-[#5eead4]">SYSTEM MAP</div>
              <div className="mt-1 text-lg font-semibold">Upcoming Trade Box modules</div>
            </div>
            <div className="text-[11px] text-[#7f8da1]">BUILD ORDER: EASY → HARD</div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {modules.map(([tag, title, description]) => (
              <div key={tag} className="rounded border border-[#1b2532] bg-[#101722] p-4">
                <div className="text-[10px] font-bold tracking-[0.18em] text-[#7f8da1]">{tag}</div>
                <div className="mt-2 font-medium">{title}</div>
                <div className="mt-1 text-xs leading-5 text-[#7f8da1]">{description}</div>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-5 flex flex-wrap justify-between gap-3 border-t border-[#1b2532] pt-4 text-[11px] text-[#617086]">
          <span>Trade Box · Open-source financial research platform</span>
          <span>Market data may be delayed, incomplete, or unavailable.</span>
        </footer>
      </div>
    </main>
  );
}
