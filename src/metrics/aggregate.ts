import type { BrowserSample, ScaleSummary, ThresholdConfig } from "../types.ts";
import { crossedThresholds } from "../runner/thresholds.ts";

export function percentile(values: number[], percentileValue: number): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1),
  );

  return sorted[index] ?? 0;
}

export function median(values: number[]): number {
  return percentile(values, 50);
}

export function summarizeScale(
  scale: number,
  samples: BrowserSample[],
  baselineMedianMs: number,
  thresholds: ThresholdConfig,
): ScaleSummary {
  if (samples.length === 0) {
    throw new Error("summarizeScale requires at least one sample");
  }

  const durations = samples.map((sample) => sample.durationMs);
  const medianDurationMs = median(durations);
  const baselineDeltaMs = medianDurationMs - baselineMedianMs;
  const baselineDeltaRatio = baselineMedianMs === 0 ? 0 : baselineDeltaMs / baselineMedianMs;

  const summaryWithoutCrossings: ScaleSummary = {
    scale,
    samples: samples.length,
    minDurationMs: Math.min(...durations),
    maxDurationMs: Math.max(...durations),
    medianDurationMs,
    p75DurationMs: percentile(durations, 75),
    p95DurationMs: percentile(durations, 95),
    baselineDeltaMs,
    baselineDeltaRatio,
    medianLongTaskCount: median(samples.map((sample) => sample.longTaskCount)),
    medianLoafCount: median(samples.map((sample) => sample.loafCount)),
    medianLayoutShiftScore: median(samples.map((sample) => sample.layoutShiftScore)),
    crossedThresholds: [],
  };

  return {
    ...summaryWithoutCrossings,
    crossedThresholds: crossedThresholds(summaryWithoutCrossings, thresholds),
  };
}
