import type { Candle, MarketDataProvider, Quote } from "./types";

const BASE_URLS = ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"];

const SYMBOL_ALIASES: Record<string, string> = {
  XAUUSD: "GC=F",
  GOLD: "GC=F",
  XAGUSD: "SI=F",
  SILVER: "SI=F",
  WTI: "CL=F",
  BRENT: "BZ=F",
  BTCUSD: "BTC-USD",
  ETHUSD: "ETH-USD",
  SOLUSD: "SOL-USD",
  XRPUSD: "XRP-USD",
  BNBUSD: "BNB-USD",
  DOGEUSD: "DOGE-USD",
  ADAUSD: "ADA-USD",
  AVAXUSD: "AVAX-USD",
  LINKUSD: "LINK-USD",
  DOTUSD: "DOT-USD",
  VEDL: "VEDL.NS",
};

function normalizeYahooSymbol(input: string): string {
  const raw = input.trim().toUpperCase();
  const [exchange, tickerPart] = raw.includes(":") ? raw.split(/:(.*)/, 2) : ["", raw];
  const symbol = tickerPart || raw;

  if (exchange === "OANDA" || exchange === "FX_IDC" || exchange === "FXCM") return symbol.endsWith("=X") ? symbol : symbol + "=X";
  if (exchange === "COINBASE" || exchange === "BINANCE" || exchange === "BYBIT") return symbol.endsWith("-USD") ? symbol : symbol.replace(/USD$/, "") + "-USD";
  if (exchange === "NSE") return symbol + ".NS";
  if (exchange === "BSE") return symbol + ".BO";
  if (exchange === "TVC") {
    const indexAliases: Record<string,string> = { SPX: "^GSPC", NDX: "^NDX", VIX: "^VIX" };
    if (indexAliases[symbol]) return indexAliases[symbol];
  }
  if (exchange === "DJ" && symbol === "DJI") return "^DJI";
  if (symbol === "BRK.B") return "BRK-B";
  if (SYMBOL_ALIASES[symbol]) return SYMBOL_ALIASES[symbol];
  if (symbol.endsWith("=X")) return symbol;
  if (/^[A-Z]{6}$/.test(symbol)) return `${symbol}=X`;
  return symbol;
}

function inferAssetType(symbol: string): Quote["assetType"] {
  if (symbol === "GC=F" || symbol === "SI=F" || symbol === "CL=F" || symbol === "BZ=F") return "commodity";
  if (symbol.endsWith("=X")) return "forex";
  if (symbol.endsWith("=F")) return "commodity";
  if (symbol.startsWith("^") || symbol === "%5EVIX") return "index";
  return "stock";
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        symbol?: string;
        shortName?: string;
        currency?: string;
        regularMarketPrice?: number;
        previousClose?: number;
        chartPreviousClose?: number;
        regularMarketDayHigh?: number;
        regularMarketDayLow?: number;
        regularMarketVolume?: number;
        marketCap?: number;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
    error?: { description?: string } | null;
  };
}

async function fetchChart(symbol: string, range: string, interval: string) {
  let lastError = "No market data";

  for (const base of BASE_URLS) {
    const url = new URL(`${base}/v8/finance/chart/${encodeURIComponent(symbol)}`);
    url.searchParams.set("range", range);
    url.searchParams.set("interval", interval);
    url.searchParams.set("events", "div,splits");

    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "Trade-Box/0.1" },
        next: { revalidate: 30 },
      });

      if (!response.ok) {
        lastError = `HTTP ${response.status}`;
        continue;
      }

      const data = (await response.json()) as YahooChartResponse;
      const result = data.chart?.result?.[0];
      if (result) return result;

      lastError = data.chart?.error?.description ?? "No result";
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Request failed";
    }
  }

  throw new Error(`Yahoo Finance could not load ${symbol} (${lastError})`);
}

export const yahooProvider: MarketDataProvider = {
  name: "Yahoo Finance",

  async getQuote(symbol: string): Promise<Quote> {
    const requestedSymbol = symbol.trim().toUpperCase();
    const yahooSymbol = normalizeYahooSymbol(requestedSymbol);
    const result = await fetchChart(yahooSymbol, "5d", "1d");
    const meta = result.meta ?? {};
    const price = meta.regularMarketPrice;
    if (typeof price !== "number") throw new Error(`No quote available for ${requestedSymbol}`);

    const previousClose = meta.previousClose ?? meta.chartPreviousClose ?? null;
    const change = previousClose === null ? null : price - previousClose;
    const changePercent = previousClose ? (change! / previousClose) * 100 : null;

    return {
      symbol: requestedSymbol,
      name: meta.shortName ?? meta.symbol ?? requestedSymbol,
      assetType: inferAssetType(yahooSymbol),
      currency: meta.currency ?? "USD",
      price,
      previousClose,
      change,
      changePercent,
      dayHigh: meta.regularMarketDayHigh ?? null,
      dayLow: meta.regularMarketDayLow ?? null,
      volume: meta.regularMarketVolume ?? null,
      marketCap: meta.marketCap ?? null,
      timestamp: Date.now(),
      provider: "Yahoo Finance",
      freshness: "delayed",
    };
  },

  async getHistory(symbol: string, range = "1mo", interval = "1d"): Promise<Candle[]> {
    const result = await fetchChart(normalizeYahooSymbol(symbol), range, interval);
    const timestamps = result.timestamp ?? [];
    const quote = result.indicators?.quote?.[0];
    if (!quote) return [];

    return timestamps.flatMap((time, index) => {
      const open = quote.open?.[index];
      const high = quote.high?.[index];
      const low = quote.low?.[index];
      const close = quote.close?.[index];
      const volume = quote.volume?.[index] ?? 0;
      if ([open, high, low, close].some((value) => typeof value !== "number")) return [];
      return [{ time, open: open!, high: high!, low: low!, close: close!, volume: volume ?? 0 }];
    });
  },
};
