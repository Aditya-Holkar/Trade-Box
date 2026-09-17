# Trade Box

A modular, self-hosted financial research terminal for stocks, ETFs, indices, forex, crypto, commodities, and derivatives.

## Phase 1 — Market Data Engine

Phase 1 introduces a normalized, server-side market-data boundary. The dashboard currently reads stock quotes through the provider layer and exposes historical OHLCV through an API route for the charting phase.

### Reference projects

- OpenTerminal — provider matrix, public market-data sources, historical candles, symbol search, and resilient provider architecture. Its README documents Nasdaq/Yahoo/Stooq and TradingView as different provider roles. See the repository for the original implementation and source mapping.
- India Stock Dashboard — practical live-market dashboard patterns and multi-source market data workflows.
- StockView — real-time stock analysis dashboard architecture with a dedicated backend/data layer.

These projects are references for product patterns and architecture, not code to copy.

### Implemented in Phase 1

- Normalized `Quote` and `Candle` contracts.
- `MarketDataProvider` interface so vendors remain replaceable.
- Yahoo Finance provider for stock quotes and historical OHLCV.
- Server-side provider service with a provider loop ready for future fallbacks.
- In-memory quote/history caching to reduce repeated upstream requests.
- `/api/market/quote?symbol=AAPL` endpoint.
- `/api/market/history?symbol=AAPL&range=1mo&interval=1d` endpoint.
- Terminal-style quote monitor for AAPL, MSFT, NVDA, GOOGL, AMZN and TSLA.
- Explicit provider and freshness metadata in the UI.

### Architecture

```text
Browser UI
   ↓
Trade Box API routes
   ↓
Normalized Market Data Service
   ↓
MarketDataProvider interface
   ↓
Yahoo Finance (current provider)

Cache sits inside the server-side data layer.
```

### Important data note

Yahoo Finance is used as the first provider for development. Market data may be delayed, rate-limited, stale, incomplete, or unavailable. Provider-specific details are intentionally isolated so additional sources can be added without changing the UI contract.

## Roadmap

- Phase 0: Foundation ✅
- Phase 1: Market Data Engine ✅
- Phase 2: Universal Search
- Phase 3: Professional Charts
- Phase 4: Technical Indicators
- Phase 5: Technical Analysis Engine
- Phase 6: Drawing & Price Structure
- Phase 7: Watchlists
- Phase 8: Screener
- Phase 9+: Research, portfolio, risk, derivatives, AI, and production capabilities
