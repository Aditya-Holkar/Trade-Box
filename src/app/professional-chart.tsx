"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AreaSeries,
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  LineSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";

type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };
type ChartMode = "candles" | "line" | "area";
type Timeframe = { label: string; range: string; interval: string };

const timeframes: Timeframe[] = [
  { label: "1D", range: "1d", interval: "5m" },
  { label: "5D", range: "5d", interval: "15m" },
  { label: "1M", range: "1mo", interval: "1d" },
  { label: "3M", range: "3mo", interval: "1d" },
  { label: "6M", range: "6mo", interval: "1d" },
  { label: "1Y", range: "1y", interval: "1wk" },
  { label: "5Y", range: "5y", interval: "1mo" },
];

const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

function formatVolume(value: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export default function ProfessionalChart({ symbol = "AAPL" }: { symbol?: string }) {
  const normalizedSymbol = symbol.trim().toUpperCase() || "AAPL";
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | ISeriesApi<"Line"> | ISeriesApi<"Area"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const requestIdRef = useRef(0);
  const [mode, setMode] = useState<ChartMode>("candles");
  const [timeframe, setTimeframe] = useState(timeframes[2]);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [cursor, setCursor] = useState<Candle | null>(null);

  const loadHistory = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    setCursor(null);
    setCandles([]);

    try {
      const response = await fetch(
        `/api/market/history?symbol=${encodeURIComponent(normalizedSymbol)}&range=${timeframe.range}&interval=${timeframe.interval}`,
        { cache: "no-store" },
      );
      const body = await response.json();
      if (requestId !== requestIdRef.current) return;
      if (!response.ok) throw new Error(body.error ?? `Chart data unavailable for ${normalizedSymbol}`);
      setCandles((body.data as Candle[]) ?? []);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setCandles([]);
      setError(err instanceof Error ? err.message : "Chart data unavailable");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [normalizedSymbol, timeframe]);

  // Load whenever either the selected instrument OR timeframe changes.
  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  // Create the chart exactly once for this mounted component. Data changes must
  // update the existing series rather than destroying/recreating the chart.
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth,
      height: 430,
      layout: { background: { type: ColorType.Solid, color: "#0c1118" }, textColor: "#7f8da1" },
      grid: { vertLines: { color: "#151e29" }, horzLines: { color: "#151e29" } },
      crosshair: { mode: 0 },
      rightPriceScale: { borderColor: "#263444" },
      timeScale: { borderColor: "#263444", timeVisible: true, secondsVisible: false },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
    });
    chartRef.current = chart;

    const resize = new ResizeObserver(() => chart.applyOptions({ width: container.clientWidth }));
    resize.observe(container);

    const handler = (param: { time?: Time }) => {
      if (!param.time) {
        setCursor(null);
        return;
      }
      const item = candlesRef.current.find((c) => c.time === Number(param.time));
      setCursor(item ?? null);
    };
    chart.subscribeCrosshairMove(handler);

    return () => {
      resize.disconnect();
      chart.unsubscribeCrosshairMove(handler);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      volumeRef.current = null;
    };
  }, []);

  const candlesRef = useRef<Candle[]>([]);
  useEffect(() => {
    candlesRef.current = candles;
  }, [candles]);

  // Replace the data in the existing chart series when the selected symbol,
  // timeframe, or chart mode changes. Lightweight Charts documents setData()
  // as the API for replacing a series' complete dataset.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (seriesRef.current) {
      chart.removeSeries(seriesRef.current);
      seriesRef.current = null;
    }
    if (volumeRef.current) {
      chart.removeSeries(volumeRef.current);
      volumeRef.current = null;
    }
    if (!candles.length) return;

    if (mode === "candles") {
      const series = chart.addSeries(CandlestickSeries, {
        upColor: "#5eead4",
        downColor: "#f08a9a",
        borderVisible: false,
        wickUpColor: "#5eead4",
        wickDownColor: "#f08a9a",
      });
      series.setData(candles.map((c) => ({ time: c.time as Time, open: c.open, high: c.high, low: c.low, close: c.close })));
      seriesRef.current = series;
    } else if (mode === "line") {
      const series = chart.addSeries(LineSeries, { color: "#5eead4", lineWidth: 2, crosshairMarkerRadius: 3 });
      series.setData(candles.map((c) => ({ time: c.time as Time, value: c.close })));
      seriesRef.current = series;
    } else {
      const series = chart.addSeries(AreaSeries, {
        lineColor: "#5eead4",
        topColor: "rgba(94,234,212,0.22)",
        bottomColor: "rgba(94,234,212,0.02)",
        lineWidth: 2,
      });
      series.setData(candles.map((c) => ({ time: c.time as Time, value: c.close })));
      seriesRef.current = series;
    }

    const volume = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
      color: "#334155",
      base: 0,
    });
    volume.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    volume.setData(candles.map((c) => ({
      time: c.time as Time,
      value: c.volume,
      color: c.close >= c.open ? "#285b56" : "#5b3039",
    })));
    volumeRef.current = volume;

    chart.timeScale().fitContent();
  }, [candles, mode]);

  useEffect(() => {
    setFullscreen(Boolean(document.fullscreenElement));
    const onFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);

  const latest = candles[candles.length - 1];
  const previous = candles[candles.length - 2];
  const active = cursor ?? latest;
  const change = latest && previous ? latest.close - previous.close : null;
  const changePct = latest && previous && previous.close ? (change! / previous.close) * 100 : null;

  const title = useMemo(() => normalizedSymbol, [normalizedSymbol]);

  function toggleFullscreen() {
    const el = containerRef.current?.parentElement;
    if (!el) return;
    if (!document.fullscreenElement) void el.requestFullscreen?.();
    else void document.exitFullscreen?.();
  }

  return <section className="mt-4 overflow-hidden rounded border border-[#1b2532] bg-[#0c1118]">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1b2532] px-4 py-3">
      <div><div className="text-xs font-bold tracking-[0.16em] text-[#5eead4]">PHASE 3 · PROFESSIONAL CHART</div><div className="mt-1 flex items-center gap-3"><span className="text-lg font-semibold">{title}</span>{latest && <span className="text-sm tabular-nums">{number.format(latest.close)}</span>}{changePct !== null && <span className={`text-xs ${changePct >= 0 ? "text-[#5eead4]" : "text-[#f08a9a]"}`}>{changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%</span>}</div></div>
      <div className="flex flex-wrap items-center gap-1">
        {timeframes.map((item) => <button key={item.label} onClick={() => setTimeframe(item)} className={`rounded px-2.5 py-1.5 text-[10px] font-bold ${timeframe.label === item.label ? "bg-[#17302d] text-[#5eead4]" : "text-[#7f8da1] hover:bg-[#101722] hover:text-white"}`}>{item.label}</button>)}
        <span className="mx-1 h-5 w-px bg-[#263444]" />
        {(["candles", "line", "area"] as ChartMode[]).map((item) => <button key={item} onClick={() => setMode(item)} className={`rounded px-2.5 py-1.5 text-[10px] font-bold uppercase ${mode === item ? "bg-[#17302d] text-[#5eead4]" : "text-[#7f8da1] hover:bg-[#101722] hover:text-white"}`}>{item}</button>)}
        <button onClick={toggleFullscreen} className="ml-1 rounded border border-[#263444] px-2.5 py-1.5 text-[10px] text-[#9aa8ba] hover:border-[#5eead4] hover:text-[#5eead4]">{fullscreen ? "EXIT" : "FULL"}</button>
      </div>
    </div>

    <div className="grid grid-cols-2 border-b border-[#1b2532] text-[10px] md:grid-cols-6">
      {[['O', active?.open], ['H', active?.high], ['L', active?.low], ['C', active?.close], ['VOL', active?.volume], ['TF', timeframe.label]].map(([label, value]) => <div key={label as string} className="border-r border-[#1b2532] px-3 py-2"><span className="text-[#617086]">{label}</span><span className="ml-2 tabular-nums text-[#c4cfdd]">{label === "VOL" && typeof value === "number" ? formatVolume(value) : typeof value === "number" ? number.format(value) : value ?? "—"}</span></div>)}
    </div>

    <div className="relative min-h-[430px]">
      <div ref={containerRef} className="h-[430px] w-full" />
      {loading && <div className="absolute inset-0 flex items-center justify-center bg-[#0c1118]/80 text-xs text-[#7f8da1]">Loading {title} · {timeframe.label} chart…</div>}
      {error && !loading && <div className="absolute inset-0 flex items-center justify-center bg-[#0c1118]/90"><div className="rounded border border-[#4a2930] bg-[#171016] px-4 py-3 text-sm text-[#f0a8b2]">{error}</div></div>}
    </div>
    <div className="flex flex-wrap justify-between gap-2 border-t border-[#1b2532] px-4 py-2 text-[10px] text-[#617086]"><span>Scroll / pinch to zoom · drag to pan · crosshair for OHLC</span><span>{candles.length} bars · {normalizedSymbol} · server-side market data</span></div>
  </section>;
}
