import { expect, test } from "vite-plus/test";
import { validateCaseConfig } from "../src/cases/discovery.ts";
import { renderReport } from "../src/reports/html.ts";
import { emptyScaleSummary, validConfig } from "./helpers.ts";

test("renders report data with metric categories", () => {
  const html = renderReport({
    id: "run-1",
    createdAt: "2026-06-17T00:00:00.000Z",
    case: validateCaseConfig(validConfig),
    stoppedAtScale: 30,
    smallestRegressionScale: null,
    thresholdRule: "max-scale",
    scales: [emptyScaleSummary(10)],
    traceMetrics: [
      {
        scale: 10,
        trace: "trace-10.json",
        source: "chromium-trace",
        metrics: {
          frameEventCount: 2,
          frameEventDurationMs: 3,
          frameIntervalCount: 1,
          maxFrameIntervalMs: 60,
          longFrameIntervalCount: 1,
          paintEventCount: 1,
          paintEventDurationMs: 2,
          compositorEventCount: 1,
          compositorEventDurationMs: 4,
        },
      },
    ],
    artifacts: {
      samples: "samples.json",
      report: "report.html",
      repro: "repro",
      traces: [],
    },
  });

  expect(html).toContain("Standard Performance API");
  expect(html).toContain("Chromium-only metrics");
  expect(html).toContain("Chromium Trace Metrics");
  expect(html).toContain("Trace-backed frame, paint, and compositor signals are Chromium-only.");
  expect(html).toContain("trace-10.json");
  expect(html).toContain("<h2>Regression</h2>");
});

test("escapes report data", () => {
  const html = renderReport({
    id: "run-<1>",
    createdAt: "2026-06-17T00:00:00.000Z",
    case: {
      ...validateCaseConfig(validConfig),
      title: "Case <script>",
      description: 'Uses "quotes" & tags',
    },
    stoppedAtScale: 30,
    smallestRegressionScale: null,
    thresholdRule: "max-scale",
    scales: [{ ...emptyScaleSummary(10), crossedThresholds: ["x < y"] }],
    traceMetrics: [],
    artifacts: {
      samples: "samples.json",
      report: "report.html",
      repro: "repro",
      traces: [],
    },
  });

  expect(html).toContain("Case &lt;script&gt;");
  expect(html).toContain("Uses &quot;quotes&quot; &amp; tags");
  expect(html).toContain("x &lt; y");
  expect(html).toContain("run-&lt;1&gt;");
  expect(html).toContain("<code>max-scale</code>");
});

test("omits chromium trace metrics when traces have no useful signal", () => {
  const html = renderReport({
    id: "run-1",
    createdAt: "2026-06-17T00:00:00.000Z",
    case: validateCaseConfig(validConfig),
    stoppedAtScale: 30,
    smallestRegressionScale: null,
    thresholdRule: "max-scale",
    scales: [emptyScaleSummary(10)],
    traceMetrics: [
      {
        scale: 10,
        trace: "trace-10.json",
        source: "chromium-trace",
        metrics: {
          frameEventCount: 0,
          frameEventDurationMs: 0,
          frameIntervalCount: 0,
          maxFrameIntervalMs: 0,
          longFrameIntervalCount: 0,
          paintEventCount: 1,
          paintEventDurationMs: 0,
          compositorEventCount: 0,
          compositorEventDurationMs: 0,
        },
      },
    ],
    artifacts: {
      samples: "samples.json",
      report: "report.html",
      repro: "repro",
      traces: [],
    },
  });

  expect(html).not.toContain("Chromium Trace Metrics");
  expect(html).not.toContain("trace-10.json");
});
