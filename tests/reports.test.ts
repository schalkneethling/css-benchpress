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
    artifacts: {
      samples: "samples.json",
      report: "report.html",
      repro: "repro",
      traces: [],
    },
  });

  expect(html).toContain("Standard Performance API");
  expect(html).toContain("Chromium-only metrics");
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
});
