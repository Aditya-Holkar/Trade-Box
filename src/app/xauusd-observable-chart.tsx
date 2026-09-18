"use client";

import { useEffect, useRef } from "react";
import * as Plot from "@observablehq/plot";

type Point = {
  horizon: string;
  score: number;
};

export default function XauusdObservableChart({ data }: { data: Point[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const chart = Plot.plot({
      width: Math.max(520, ref.current.clientWidth || 520),
      height: 220,
      marginLeft: 48,
      marginBottom: 42,
      x: { label: null, tickRotate: 0 },
      y: { grid: true, label: "Confluence score" },
      marks: [
        Plot.ruleY([0]),
        Plot.barY(data, {
          x: "horizon",
          y: "score",
          inset: 8,
          title: (d: Point) => `${d.horizon}: ${d.score}`,
        }),
        Plot.dot(data, {
          x: "horizon",
          y: "score",
          r: 4,
        }),
      ],
    });

    ref.current.replaceChildren(chart);
    return () => chart.remove();
  }, [data]);

  return (
    <div className="overflow-x-auto">
      <div ref={ref} className="min-w-[520px] text-[#9aa8ba]" />
    </div>
  );
}
