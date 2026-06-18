import type { BrowserSample, ScaleSummary } from "../src/types.ts";

export const validConfig = {
  id: "sample-case",
  title: "Sample case",
  description: "A sample case",
  tags: ["sample"],
  scale: { start: 10, step: 10, max: 30 },
  variants: [{ id: "default", title: "Default" }],
  thresholds: { durationDeltaRatio: 1 },
  metrics: {
    standard: ["mark", "measure"],
    experimental: ["longtask"],
    chromium: ["RecalcStyleDuration"],
  },
  experimental: false,
};

export function sample(scale: number, iteration: number, durationMs: number): BrowserSample {
  return {
    scale,
    iteration,
    durationMs,
    longTaskCount: 0,
    longTaskDurationMs: 0,
    layoutShiftScore: 0,
    paintCount: 0,
    loafCount: 0,
    loafDurationMs: 0,
    cdpMetrics: {},
  };
}

export function emptyScaleSummary(scale: number): ScaleSummary {
  return {
    scale,
    samples: 1,
    minDurationMs: 0,
    maxDurationMs: 0,
    medianDurationMs: 0,
    p75DurationMs: 0,
    p95DurationMs: 0,
    baselineDeltaMs: 0,
    baselineDeltaRatio: 0,
    medianLongTaskCount: 0,
    medianLoafCount: 0,
    medianLayoutShiftScore: 0,
    crossedThresholds: [],
  };
}
