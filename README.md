# Trade Box

A modular, self-hosted financial research terminal for stocks, ETFs, indices, forex, crypto, commodities, and derivatives.

## Phase 3 — Professional Charts

Phase 3 adds a real interactive chart workstation on top of the server-side OHLCV boundary. The chart engine uses TradingView's open-source Lightweight Charts library, a pattern also used by OpenTerminal and other open-source financial terminals.

### Reference projects

- OpenTerminal — professional charting with candlesticks, line/area views, multiple timeframes, volume, and indicator overlays.
- OpenTerminalUI — multi-panel chart workstation patterns, Lightweight Charts v5, crosshair linking, and multi-timeframe workflows.
- Lightweight Charts documentation — candlestick, line, area, histogram, crosshair, panes, zoom and chart interaction APIs.
- India Stock Dashboard — practical market-terminal workflows and market-data presentation patterns.
- StockView — real-time market-analysis architecture with a dedicated data layer.

These projects are references for product patterns and architecture, not code to copy.

### Implemented in Phase 3

- `lightweight-charts` client chart engine.
- Candlestick, line, and area price views.
- OHLCV volume histogram.
- 1D, 5D, 1M, 3M, 6M, 1Y and 5Y timeframes.
- Crosshair with synchronized OHLC/volume readout.
- Mouse-wheel/pinch zoom and drag-to-pan.
- Responsive chart resizing.
- Fullscreen workstation mode.
- Loading and provider-error states.
- Existing `/api/market/history` route remains the only browser-facing OHLCV boundary.
- Universal search selection routes directly into the professional chart symbol.

## Phase 1 — Market Data Engine

Phase 1 introduced a normalized, server-side market-data boundary. The dashboard reads quotes through the provider layer and exposes historical OHLCV through an API route.

### Implemented in Phase 1

- Normalized `Quote` and `Candle` contracts.
- `MarketDataProvider` interface so vendors remain replaceable.
- Yahoo Finance provider for quotes and historical OHLCV.
- Server-side provider service with a provider loop ready for future fallbacks.
- In-memory quote/history caching to reduce repeated upstream requests.
- `/api/market/quote?symbol=AAPL` endpoint.
- `/api/market/history?symbol=AAPL&range=1mo&interval=1d` endpoint.
- Terminal-style quote monitor with dynamic symbols.
- Explicit provider and freshness metadata in the UI.
- Yahoo symbol normalization for common FX and commodity aliases such as `EURUSD`, `XAUUSD`, `XAGUSD`, `WTI`, and `BRENT`.

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

Yahoo Finance is used as the first provider for development. Market data may be delayed, rate-limited, stale, incomplete, or unavailable. `XAUUSD` currently maps to Yahoo's `GC=F` gold-futures symbol as a compatibility fallback; that is not the same thing as an OTC spot XAU/USD feed. A dedicated multi-provider FX/commodities layer is planned for later phases.

## Roadmap

- Phase 0: Foundation ✅
- Phase 1: Market Data Engine ✅
- Phase 2: Universal Search ✅
- Phase 3: Professional Charts ✅
- Phase 4: Technical Indicators
- Phase 5: Technical Analysis Engine
- Phase 6: Drawing & Price Structure
- Phase 7: Watchlists
- Phase 8: Screener
- Phase 9+: Research, portfolio, risk, derivatives, AI, and production capabilities
