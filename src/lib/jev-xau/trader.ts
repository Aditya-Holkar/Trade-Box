import { config } from "./config";
import { calculateXauusdFeatures, type FeatureState } from "./features";
import { Mt5Bridge, type Mt5Account, type Mt5Position } from "./mt5";

export type Action = "buy" | "sell" | "hold";

export interface Decision {
  action: Action;
  probabilities: { buy: number; sell: number; hold: number };
  reason: string;
}

export interface TraderSnapshot {
  timestamp: string;
  symbol: string;
  mode: "DRY_RUN" | "LIVE";
  price: { bid: number; ask: number; mid: number; spread: number };
  features: FeatureState;
  decision: Decision;
  risk: { allowed: boolean; reason: string };
  account?: Mt5Account;
  positions?: Mt5Position[];
  execution?: {
    success: boolean;
    side?: "buy" | "sell";
    volume?: number;
    price?: number;
    sl?: number;
    tp?: number;
    ticket?: number;
    error?: string;
  };
}

/**
 * Deterministic local decision engine used by the route until a Jev
 * provider/model is connected. It is intentionally a demo signal,
 * not a profitability claim.
 */
export async function jevDecision(features: FeatureState): Promise<Decision> {
  if (!config.jevApiKey) return mockDecision(features);
  const state = {
    market: "XAUUSD",
    horizonMinutes: config.horizonMinutes,
    price: { bid: features.bid, ask: features.ask, mid: features.mid, spread: features.spread, spreadBps: features.spreadBps },
    returnsBps: features.returnsBps,
    technical: features.technical,
    market: features.market,
    volume: features.volume,
    recentPrices: features.recentPrices,
  };

  const response = await fetch(config.jevEndpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.jevApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.jevModelId,
      state,
      questions: {
        direction: {
          type: "choice",
          instructions: "For XAUUSD, which direction has the strongest evidence over the configured horizon after considering spread, momentum, trend, RSI, EMAs, ATR, volume, session and volatility? This is a decision signal, not a guarantee.",
          criteria: {
            buy: "XAUUSD is more likely to rise enough to justify a long entry after the spread.",
            sell: "XAUUSD is more likely to fall enough to justify a short entry after the spread.",
            hold: "Evidence is insufficient, conflicting, or market conditions make a trade unattractive.",
          },
        },
      },
    }),
    cache: "no-store",
  });

  const json: any = await response.json();
  if (!response.ok) throw new Error(json?.error?.message ?? "Jev API request failed");

  const answer = json?.answers?.direction;
  const probabilities = answer?.probabilities ?? {};
  const buy = Number(probabilities.buy ?? 0);
  const sell = Number(probabilities.sell ?? 0);
  const hold = Number(probabilities.hold ?? Math.max(0, 1 - Math.max(buy, sell)));
  const action: Action = answer?.choice === "buy" ? "buy" : answer?.choice === "sell" ? "sell" : "hold";

  return {
    action,
    probabilities: { buy, sell, hold },
    reason: `Jev ${json?.model ?? config.jevModelId}: ${answer?.choice ?? "hold"} (confidence ${Number(answer?.confidence ?? Math.max(buy, sell)).toFixed(3)})`,
  };
}

export function mockDecision(features: FeatureState): Decision {
  const trend = features.market.trend === "up" ? 0.10 : features.market.trend === "down" ? -0.10 : 0;
  const momentum = Math.tanh(features.returnsBps.last15m / 10) * 0.20;
  const rsiSignal = features.technical.rsi14 > 70 ? -0.08 : features.technical.rsi14 < 30 ? 0.08 : 0;
  const signal = trend + momentum + rsiSignal;
  const buy = 1 / (1 + Math.exp(-signal * 4));
  const sell = 1 - buy;
  const action: Action =
    buy >= config.minProbability && buy - sell >= config.minProbabilityEdge ? "buy" :
    sell >= config.minProbability && sell - buy >= config.minProbabilityEdge ? "sell" : "hold";
  return {
    action,
    probabilities: { buy, sell, hold: Math.max(0, 1 - Math.max(buy, sell)) },
    reason: `trend=${features.market.trend}, RSI=${features.technical.rsi14.toFixed(1)}, 15m=${features.returnsBps.last15m.toFixed(2)}bps`,
  };
}

function riskCheck(
  features: FeatureState,
  decision: Decision,
  account: Mt5Account,
  positions: Mt5Position[],
) {
  if (decision.action === "hold") return { allowed: false, reason: "HOLD signal" };
  const spreadPoints = features.spread / 0.01;
  if (spreadPoints > config.maxSpreadPoints) return { allowed: false, reason: "Spread limit exceeded" };
  if (decision.probabilities[decision.action] < config.minProbability) return { allowed: false, reason: "Probability threshold not met" };
  if (Math.abs(decision.probabilities.buy - decision.probabilities.sell) < config.minProbabilityEdge) {
    return { allowed: false, reason: "Probability edge not met" };
  }
  if (account.profit <= -Math.abs(config.maxDailyLoss)) return { allowed: false, reason: "Daily loss limit reached" };
  if (positions.length >= config.maxPositions) return { allowed: false, reason: "Maximum positions reached" };
  const lots = positions.reduce((sum, p) => sum + p.volume, 0);
  if (lots + config.lotSize > config.maxLots) return { allowed: false, reason: "Maximum lot exposure reached" };
  if (!features.technical.atr5m) return { allowed: false, reason: "ATR unavailable" };
  return { allowed: true, reason: "Risk checks passed" };
}

export async function getXauusdSnapshot(): Promise<TraderSnapshot> {
  const bridge = new Mt5Bridge();
  const [tick, candlesResult, account, positionsResult] = await Promise.all([
    bridge.getTick(),
    bridge.getCandles(),
    bridge.getAccount(),
    bridge.getPositions(),
  ]);

  const features = calculateXauusdFeatures(candlesResult.candles, tick);
  const decision = config.model === "jev" ? await jevDecision(features) : mockDecision(features);
  const risk = riskCheck(features, decision, account, positionsResult.positions);

  let execution: TraderSnapshot["execution"];

  if (risk.allowed) {
    const side = decision.action as "buy" | "sell";
    const entry = side === "buy" ? tick.ask : tick.bid;
    const atr = features.technical.atr5m;
    const sl = Number((side === "buy" ? entry - atr * config.stopLossAtr : entry + atr * config.stopLossAtr).toFixed(2));
    const tp = Number((side === "buy" ? entry + atr * config.takeProfitAtr : entry - atr * config.takeProfitAtr).toFixed(2));

    if (config.dryRun) {
      execution = { success: true, side, volume: config.lotSize, price: entry, sl, tp };
    } else {
      const result = await bridge.order({
        symbol: config.symbol,
        side,
        volume: config.lotSize,
        sl,
        tp,
        deviation: 20,
        comment: "Trade-Box JEV-XAUUSD",
      });
      execution = {
        success: result.success,
        side,
        volume: result.volume ?? config.lotSize,
        price: result.price ?? entry,
        sl,
        tp,
        ticket: result.order ?? result.deal,
        error: result.error,
      };
    }
  }

  return {
    timestamp: new Date().toISOString(),
    symbol: config.symbol,
    mode: config.dryRun ? "DRY_RUN" : "LIVE",
    price: { bid: tick.bid, ask: tick.ask, mid: (tick.bid + tick.ask) / 2, spread: tick.ask - tick.bid },
    features,
    decision,
    risk,
    account,
    positions: positionsResult.positions,
    execution,
  };
}
