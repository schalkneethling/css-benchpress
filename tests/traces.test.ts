import { expect, test } from "vite-plus/test";
import { parseChromiumTraceMetrics } from "../src/metrics/traces.ts";

test("summarizes frame, paint, and compositor events from Chromium traces", () => {
  const metrics = parseChromiumTraceMetrics(
    JSON.stringify({
      traceEvents: [
        { name: "DrawFrame", ph: "X", ts: 1000, dur: 2500 },
        { name: "DrawFrame", ph: "X", ts: 63000, dur: 1500 },
        { name: "Paint", ph: "X", ts: 64000, dur: 2200 },
        { name: "CompositeLayers", ph: "X", ts: 67000, dur: 4200 },
        { name: "EventDispatch", ph: "X", ts: 68000, dur: 9000 },
      ],
    }),
  );

  expect(metrics).toEqual({
    frameEventCount: 2,
    frameEventDurationMs: 4,
    frameIntervalCount: 1,
    maxFrameIntervalMs: 62,
    longFrameIntervalCount: 1,
    paintEventCount: 1,
    paintEventDurationMs: 2.2,
    compositorEventCount: 1,
    compositorEventDurationMs: 4.2,
  });
});

test("accepts trace files whose root value is the event array", () => {
  const metrics = parseChromiumTraceMetrics(
    JSON.stringify([{ name: "SubmitCompositorFrame", ts: 0, dur: 1000 }]),
  );

  expect(metrics.frameEventCount).toBe(1);
  expect(metrics.compositorEventCount).toBe(1);
});
