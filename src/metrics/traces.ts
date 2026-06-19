import { readFileSync } from "node:fs";
import type { ChromiumTraceMetrics } from "../types.ts";

interface TraceEvent {
  /*
   * Chromium trace events use short Trace Event Format field names:
   * name is the event label, ph is the phase, ts is the timestamp in microseconds,
   * and dur/tdur are wall-clock/thread durations in microseconds.
   */
  name?: unknown;
  ph?: unknown;
  ts?: unknown;
  dur?: unknown;
  tdur?: unknown;
}

/*
 * These event names are a deliberately small starter set from Chromium's
 * rendering pipeline traces. They are not portable browser metrics; they are
 * useful hints that a trace contains frame production or presentation work.
 */
const frameEventNames = new Set([
  "BeginFrame",
  "DrawFrame",
  "PipelineReporter",
  "SubmitCompositorFrame",
  "SwapBuffers",
]);

/*
 * Frame intervals are derived from timestamp gaps between repeated frame-like
 * events. This is a coarse signal, not a replacement for DevTools frame tracks.
 */
const frameIntervalEventNames = new Set([
  "BeginFrame",
  "DrawFrame",
  "SubmitCompositorFrame",
  "SwapBuffers",
]);

/*
 * Paint and compositor event names vary by Chromium version and trace category.
 * Keep these matchers focused on common pipeline labels so the report stays
 * conservative instead of pretending to parse every possible trace event.
 */
const paintEventPattern = /(?:^|::)(Paint|PrePaint|RasterTask|PaintImage|UpdateLayerTree)$/;
const compositorEventPattern =
  /^(?:CompositeLayers|Commit|ActivateLayerTree|BeginMainThreadFrame|SubmitCompositorFrame|SwapBuffers)$/;

function asTraceEvents(trace: unknown): TraceEvent[] {
  if (Array.isArray(trace)) {
    return trace.filter(
      (event): event is TraceEvent => typeof event === "object" && event !== null,
    );
  }

  if (typeof trace === "object" && trace !== null && "traceEvents" in trace) {
    const events = (trace as { traceEvents?: unknown }).traceEvents;

    if (Array.isArray(events)) {
      return events.filter(
        (event): event is TraceEvent => typeof event === "object" && event !== null,
      );
    }
  }

  return [];
}

function durationMs(event: TraceEvent): number {
  const duration = typeof event.dur === "number" ? event.dur : event.tdur;

  return typeof duration === "number" && Number.isFinite(duration) ? duration / 1000 : 0;
}

function summarizeEvents(events: TraceEvent[]): ChromiumTraceMetrics {
  const frameTimestamps: number[] = [];
  let frameEventCount = 0;
  let frameEventDurationMs = 0;
  let paintEventCount = 0;
  let paintEventDurationMs = 0;
  let compositorEventCount = 0;
  let compositorEventDurationMs = 0;

  for (const event of events) {
    if (typeof event.name !== "string") {
      continue;
    }

    if (frameEventNames.has(event.name)) {
      frameEventCount += 1;
      frameEventDurationMs += durationMs(event);
    }

    if (frameIntervalEventNames.has(event.name) && typeof event.ts === "number") {
      frameTimestamps.push(event.ts);
    }

    if (paintEventPattern.test(event.name)) {
      paintEventCount += 1;
      paintEventDurationMs += durationMs(event);
    }

    if (compositorEventPattern.test(event.name)) {
      compositorEventCount += 1;
      compositorEventDurationMs += durationMs(event);
    }
  }

  const sortedTimestamps = [...new Set(frameTimestamps)].sort((left, right) => left - right);
  const frameIntervalsMs = sortedTimestamps
    .slice(1)
    .map((timestamp, index) => (timestamp - (sortedTimestamps[index] ?? timestamp)) / 1000)
    .filter((interval) => Number.isFinite(interval) && interval >= 0);

  return {
    frameEventCount,
    frameEventDurationMs,
    frameIntervalCount: frameIntervalsMs.length,
    maxFrameIntervalMs: Math.max(0, ...frameIntervalsMs),
    longFrameIntervalCount: frameIntervalsMs.filter((interval) => interval > 50).length,
    paintEventCount,
    paintEventDurationMs,
    compositorEventCount,
    compositorEventDurationMs,
  };
}

export function parseChromiumTraceMetrics(traceJson: string): ChromiumTraceMetrics {
  return summarizeEvents(asTraceEvents(JSON.parse(traceJson)));
}

export function readChromiumTraceMetrics(tracePath: string): ChromiumTraceMetrics {
  return parseChromiumTraceMetrics(readFileSync(tracePath, "utf8"));
}
