export type DrawingKind = "horizontal" | "trendline" | "ray" | "fibonacci";

export type Drawing = {
  id: string;
  kind: DrawingKind;
  symbol: string;
  startTime?: number;
  startPrice?: number;
  endTime?: number;
  endPrice?: number;
  price?: number;
  createdAt: number;
};

const KEY = "trade-box-drawings";

export function loadDrawings(symbol: string): Drawing[] {
  if (typeof window === "undefined") return [];
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, Drawing[]>;
    return Array.isArray(all[symbol]) ? all[symbol] : [];
  } catch {
    return [];
  }
}

export function saveDrawings(symbol: string, drawings: Drawing[]) {
  if (typeof window === "undefined") return;
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, Drawing[]>;
    all[symbol] = drawings.slice(-100);
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
}

export function makeDrawing(input: Omit<Drawing, "id" | "createdAt">): Drawing {
  return { ...input, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: Date.now() };
}
