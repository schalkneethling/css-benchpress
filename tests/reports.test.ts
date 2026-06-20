import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vite-plus/test";
import { validateCaseConfig } from "../src/cases/discovery.ts";
import { renderReport } from "../src/reports/html.ts";
import { createReportServer, resolveReportTarget } from "../src/reports/open.ts";
import type { RunSummary } from "../src/types.ts";
import { emptyScaleSummary, validConfig } from "./helpers.ts";

function reportSummary(id: string, caseId: string, createdAt: string): RunSummary {
  return {
    id,
    createdAt,
    case: validateCaseConfig({
      ...validConfig,
      id: caseId,
      title: `${caseId} title`,
    }),
    stoppedAtScale: 30,
    smallestRegressionScale: null,
    thresholdRule: "max-scale",
    scales: [emptyScaleSummary(10)],
    traceMetrics: [],
    artifacts: {
      samples: "samples.json",
      report: "report.html",
      repro: "repro",
      traces: [],
    },
  };
}

function writeRun(runsRoot: string, summary: RunSummary): void {
  const runDirectory = join(runsRoot, summary.id);

  mkdirSync(runDirectory, { recursive: true });
  writeFileSync(join(runDirectory, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  writeFileSync(join(runDirectory, "report.html"), "<!doctype html><title>report</title>");
}

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

test("resolves the newest report for a case id", () => {
  const runsRoot = join(tmpdir(), `benchpress-runs-${Date.now()}-case`);
  const older = reportSummary(
    "2026-06-17T120000000Z-sample-case",
    "sample-case",
    "2026-06-17T12:00:00.000Z",
  );
  const newer = reportSummary(
    "2026-06-18T120000000Z-sample-case",
    "sample-case",
    "2026-06-18T12:00:00.000Z",
  );
  const unrelated = reportSummary(
    "2026-06-19T120000000Z-other-case",
    "other-case",
    "2026-06-19T12:00:00.000Z",
  );

  writeRun(runsRoot, older);
  writeRun(runsRoot, newer);
  writeRun(runsRoot, unrelated);

  const target = resolveReportTarget(runsRoot, "sample-case");

  expect(target.runId).toBe(newer.id);
  expect(target.reportPath).toBe(join(runsRoot, newer.id, "report.html"));
});

test("resolves a report by normalized case title", () => {
  const runsRoot = join(tmpdir(), `benchpress-runs-${Date.now()}-title`);
  const summary = reportSummary(
    "2026-06-17T120000000Z-has-ancestor-invalidation",
    "has-ancestor-invalidation",
    "2026-06-17T12:00:00.000Z",
  );

  writeRun(runsRoot, summary);

  const target = resolveReportTarget(runsRoot, "Has Ancestor Invalidation Title");

  expect(target.runId).toBe(summary.id);
});

test("reports a clear error when no case run matches", () => {
  const runsRoot = join(tmpdir(), `benchpress-runs-${Date.now()}-missing`);

  mkdirSync(runsRoot);

  expect(() => resolveReportTarget(runsRoot, "missing-case")).toThrow(
    /Expected runs\/<timestamp>-missing-case\/report\.html/,
  );
});

test("starts the report server on a requested port", async () => {
  const runsRoot = join(tmpdir(), `benchpress-runs-${Date.now()}-port`);
  const summary = reportSummary(
    "2026-06-17T120000000Z-sample-case",
    "sample-case",
    "2026-06-17T12:00:00.000Z",
  );

  writeRun(runsRoot, summary);

  const target = resolveReportTarget(runsRoot, "sample-case");
  const server = await createReportServer(target.runDirectory, { port: 0 });

  try {
    expect(server.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/report\.html$/);
    const response = await fetch(server.url);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("<title>report</title>");
  } finally {
    await server.close();
  }
});

test("reports the selected port when the report server cannot start", async () => {
  const runsRoot = join(tmpdir(), `benchpress-runs-${Date.now()}-collision`);
  const summary = reportSummary(
    "2026-06-17T120000000Z-sample-case",
    "sample-case",
    "2026-06-17T12:00:00.000Z",
  );

  writeRun(runsRoot, summary);

  const target = resolveReportTarget(runsRoot, "sample-case");
  const server = await createReportServer(target.runDirectory, { port: 0 });
  const port = Number(new URL(server.url).port);

  try {
    await expect(createReportServer(target.runDirectory, { port })).rejects.toThrow(
      new RegExp(`Could not start report HTTP server on 127\\.0\\.0\\.1:${port}`),
    );
  } finally {
    await server.close();
  }
});
