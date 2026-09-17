export type MarketAssetType = "stock" | "etf" | "index" | "crypto" | "forex" | "commodity";

export interface Quote {
  symbol: string;
  name: string;
  assetType: MarketAssetType;
  currency: string;
  price: number;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  volume: number | null;
  marketCap: number | null;
  timestamp: number;
  provider: string;
  freshness: "live" | "delayed" | "stale";
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketDataProvider {
  readonly name: string;
  getQuote(symbol: string): Promise<Quote>;
  getHistory(symbol: string, range?: string, interval?: string): Promise<Candle[]>;
}
