import type { ScaleSummary, ThresholdConfig } from "../types.ts";

/**
 * Returns human-readable threshold labels crossed by one scale summary.
 *
 * These labels are persisted into reports, so keep them stable and phrased for
 * readers rather than as internal enum-like identifiers.
 */
export function crossedThresholds(summary: ScaleSummary, thresholds: ThresholdConfig): string[] {
  if (thresholds.traceMetricDelta !== undefined) {
    throw new Error("thresholds.traceMetricDelta is not supported yet");
  }

  const crossed: string[] = [];

  if (thresholds.durationMs !== undefined && summary.medianDurationMs >= thresholds.durationMs) {
    crossed.push(`median duration >= ${thresholds.durationMs}ms`);
  }

  if (
    thresholds.durationDeltaMs !== undefined &&
    summary.baselineDeltaMs >= thresholds.durationDeltaMs
  ) {
    crossed.push(`baseline delta >= ${thresholds.durationDeltaMs}ms`);
  }

  if (
    thresholds.durationDeltaRatio !== undefined &&
    summary.baselineDeltaRatio >= thresholds.durationDeltaRatio
  ) {
    crossed.push(`baseline delta ratio >= ${thresholds.durationDeltaRatio}`);
  }

  if (
    thresholds.longTaskCount !== undefined &&
    summary.medianLongTaskCount >= thresholds.longTaskCount
  ) {
    crossed.push(`long task count >= ${thresholds.longTaskCount}`);
  }

  if (thresholds.loafCount !== undefined && summary.medianLoafCount >= thresholds.loafCount) {
    crossed.push(`LoAF count >= ${thresholds.loafCount}`);
  }

  if (
    thresholds.layoutShiftScore !== undefined &&
    summary.medianLayoutShiftScore >= thresholds.layoutShiftScore
  ) {
    crossed.push(`layout shift score >= ${thresholds.layoutShiftScore}`);
  }

  return crossed;
}

/**
 * Stops only after two consecutive scales cross any configured threshold.
 *
 * Requiring two adjacent crossings avoids treating one noisy sample group as
 * the regression point. The reported scale is the first scale in that pair.
 */
export function shouldStopAfterScale(summaries: ScaleSummary[]): {
  stop: boolean;
  smallestRegressionScale: number | null;
} {
  if (summaries.length < 2) {
    return { stop: false, smallestRegressionScale: null };
  }

  const latest = summaries.at(-1);
  const previous = summaries.at(-2);

  if (!latest || !previous) {
    return { stop: false, smallestRegressionScale: null };
  }

  const stop = latest.crossedThresholds.length > 0 && previous.crossedThresholds.length > 0;

  return {
    stop,
    smallestRegressionScale: stop ? previous.scale : null,
  };
}
