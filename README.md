# Trade Box

A modular, self-hosted financial research terminal for stocks, ETFs, indices, forex, crypto, commodities, and derivatives.

## Phase 0 — Foundation

Trade Box is being built in small, testable phases. The first phase establishes the application shell and engineering conventions before market-data integrations are added.

### Reference projects

- OpenTerminal — terminal-style dark UI, keyboard-first navigation, widget-oriented workspace, resilient provider architecture.
- India Stock Dashboard — practical financial dashboard structure for portfolio, market overview, charts, screener, and research workflows.
- OpenTerminalUI — terminal shell, persistent workspaces, multi-market architecture, and extensible financial-terminal surface design.

These projects are references for product patterns and architecture, not code to copy.

## Planned stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Reusable UI components
- Server-side API boundary for market-data providers
- Automated CI

## Development principles

1. Keep provider-specific code behind a normalized internal API.
2. Build each phase so the application remains runnable.
3. Prefer small, reviewable commits over large rewrites.
4. Never expose provider credentials to the browser.
5. Treat market data as potentially delayed, incomplete, or stale and expose freshness in the UI.

## Roadmap

- Phase 0: Foundation
- Phase 1: Market Data Engine
- Phase 2: Universal Search
- Phase 3: Professional Charts
- Phase 4: Technical Indicators
- Phase 5: Technical Analysis Engine
- Phase 6: Drawing & Price Structure
- Phase 7: Watchlists
- Phase 8: Screener
- Phase 9+: Research, portfolio, risk, derivatives, AI, and production capabilities
