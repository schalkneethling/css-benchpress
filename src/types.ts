export type MetricKind = "standard" | "experimental-standard" | "chromium-only";

export interface ScaleConfig {
  start: number;
  step?: number;
  multiplier?: number;
  max: number;
}

export interface ThresholdConfig {
  durationMs?: number;
  durationDeltaMs?: number;
  durationDeltaRatio?: number;
  longTaskCount?: number;
  loafCount?: number;
  layoutShiftScore?: number;
  traceMetricDelta?: Record<string, number>;
}

export interface MetricConfig {
  standard: string[];
  experimental: string[];
  chromium: string[];
}

export interface CaseVariant {
  id: string;
  title: string;
  description?: string;
  experimental?: boolean;
}

export interface CaseConfig {
  id: string;
  title: string;
  description: string;
  tags: string[];
  scale: ScaleConfig;
  variants: CaseVariant[];
  thresholds: ThresholdConfig;
  metrics: MetricConfig;
  experimental: boolean;
}

export interface DiscoveredCase {
  config: CaseConfig;
  directory: string;
  fixturePath: string;
  scriptPath: string;
}

export interface BrowserSample {
  scale: number;
  iteration: number;
  durationMs: number;
  longTaskCount: number;
  longTaskDurationMs: number;
  layoutShiftScore: number;
  paintCount: number;
  loafCount: number;
  loafDurationMs: number;
  cdpMetrics: Record<string, number>;
}

export interface ChromiumTraceMetrics {
  frameEventCount: number;
  frameEventDurationMs: number;
  frameIntervalCount: number;
  maxFrameIntervalMs: number;
  longFrameIntervalCount: number;
  paintEventCount: number;
  paintEventDurationMs: number;
  compositorEventCount: number;
  compositorEventDurationMs: number;
}

export interface ChromiumTraceSummary {
  scale: number;
  trace: string;
  source: "chromium-trace";
  metrics: ChromiumTraceMetrics;
}

export interface ScaleSummary {
  scale: number;
  samples: number;
  minDurationMs: number;
  maxDurationMs: number;
  medianDurationMs: number;
  p75DurationMs: number;
  p95DurationMs: number;
  baselineDeltaMs: number;
  baselineDeltaRatio: number;
  medianLongTaskCount: number;
  medianLoafCount: number;
  medianLayoutShiftScore: number;
  crossedThresholds: string[];
}

export interface RunSummary {
  id: string;
  createdAt: string;
  case: CaseConfig;
  stoppedAtScale: number;
  smallestRegressionScale: number | null;
  thresholdRule: "two-consecutive-scales" | "max-scale";
  scales: ScaleSummary[];
  traceMetrics: ChromiumTraceSummary[];
  artifacts: {
    samples: string;
    report: string;
    repro: string;
    traces: string[];
  };
}
