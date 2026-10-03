import { config } from "./config";
import type { Candle, XauTick } from "./features";

export interface Mt5Account {
  login: number;
  balance: number;
  equity: number;
  profit: number;
  margin: number;
  freeMargin: number;
  currency: string;
}

export interface Mt5Position {
  ticket: number;
  symbol: string;
  type: "buy" | "sell";
  volume: number;
  priceOpen: number;
  priceCurrent: number;
  profit: number;
  sl: number;
  tp: number;
}

export interface Mt5OrderResult {
  success: boolean;
  retcode?: number;
  order?: number;
  deal?: number;
  price?: number;
  volume?: number;
  comment?: string;
  error?: string;
}

export class Mt5Bridge {
  private readonly baseUrl = config.mt5BridgeUrl.replace(/\/$/, "");

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.mt5RequestTimeoutMs);
    try {
      const response = await fetch(this.baseUrl + path, {
        ...init,
        signal: controller.signal,
        headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
        cache: "no-store",
      });
      const text = await response.text();
      let body: any = {};
      try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
      if (!response.ok) throw new Error(body?.detail ?? body?.error ?? `MT5 bridge HTTP ${response.status}`);
      return body as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  health() {
    return this.request<{ ok: boolean; symbol: string }>("/health");
  }

  getTick(symbol = config.symbol) {
    return this.request<XauTick & { last: number; volume: number }>(`/tick/${encodeURIComponent(symbol)}`);
  }

  getCandles(symbol = config.symbol, timeframe = config.timeframe, count = config.candles) {
    return this.request<{ candles: Candle[] }>(
      `/candles/${encodeURIComponent(symbol)}?timeframe=${encodeURIComponent(timeframe)}&count=${count}`
    );
  }

  getAccount() {
    return this.request<Mt5Account>("/account");
  }

  getPositions(symbol = config.symbol) {
    return this.request<{ positions: Mt5Position[] }>(`/positions?symbol=${encodeURIComponent(symbol)}`);
  }

  order(payload: {
    symbol: string;
    side: "buy" | "sell";
    volume: number;
    sl?: number;
    tp?: number;
    deviation?: number;
    comment?: string;
  }) {
    return this.request<Mt5OrderResult>("/order", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
}
