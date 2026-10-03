const env = (key: string, fallback?: string) => process.env[key] ?? fallback;
const num = (key: string, fallback: number) => {
  const value = process.env[key];
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const bool = (key: string, fallback: boolean) => {
  const value = process.env[key];
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

export const config = {
  symbol: env("MT5_SYMBOL", "XAUUSD")!,
  timeframe: env("MT5_TIMEFRAME", "M5")!,
  horizonMinutes: num("HORIZON_MINUTES", 15),
  mt5BridgeUrl: env("MT5_BRIDGE_URL", "http://127.0.0.1:8765")!,
  mt5RequestTimeoutMs: num("MT5_REQUEST_TIMEOUT_MS", 5000),
  model: env("MODEL", "mock") as "mock" | "jev",
  dryRun: bool("DRY_RUN", true),
  lotSize: num("LOT_SIZE", 0.01),
  maxPositions: Math.max(1, Math.floor(num("MAX_POSITIONS", 1))),
  maxLots: num("MAX_LOTS", 0.10),
  maxSpreadPoints: num("MAX_SPREAD_POINTS", 30),
  minProbability: num("MIN_PROBABILITY", 0.60),
  minProbabilityEdge: num("MIN_PROBABILITY_EDGE", 0.15),
  newsBlackoutMinutes: num("NEWS_BLACKOUT_MINUTES", 10),
  stopLossAtr: num("STOP_LOSS_ATR", 1.5),
  takeProfitAtr: num("TAKE_PROFIT_ATR", 2.0),
  maxDailyLoss: num("MAX_DAILY_LOSS", 100),
  pollIntervalMs: num("POLL_INTERVAL_MS", 5000),
  candles: Math.max(250, Math.floor(num("CANDLES", 500))),
  historySize: Math.max(100, Math.floor(num("HISTORY_SIZE", 1000))),
  dataDirectory: env("DATA_DIRECTORY", "data")!,
} as const;
