import type { RunSummary } from "../types.ts";
import { escapeHtml, formatMs } from "../utils.ts";

function renderMetricList(label: string, metrics: string[]): string {
  const value = escapeHtml(metrics.join(", ") || "none");

  return `<li><strong>${escapeHtml(label)}:</strong> ${value}</li>`;
}

function renderValue(value: unknown): string {
  return escapeHtml(String(value));
}

function renderDuration(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value)
    ? renderValue(formatMs(value))
    : renderValue(value);
}

function hasUsefulTraceMetrics(summary: RunSummary): boolean {
  return (summary.traceMetrics ?? []).some(({ metrics }) => {
    return (
      metrics.frameEventCount > 0 ||
      metrics.frameIntervalCount > 0 ||
      metrics.maxFrameIntervalMs > 0 ||
      metrics.longFrameIntervalCount > 0 ||
      metrics.paintEventDurationMs > 0 ||
      metrics.compositorEventCount > 0 ||
      metrics.compositorEventDurationMs > 0
    );
  });
}

function renderTraceMetrics(summary: RunSummary): string {
  if (!hasUsefulTraceMetrics(summary)) {
    return "";
  }

  const traceRows = (summary.traceMetrics ?? [])
    .map(
      (trace) => `<tr>
        <td>${renderValue(trace.scale)}</td>
        <td><code>${renderValue(trace.trace)}</code></td>
        <td>${renderValue(trace.metrics.frameEventCount)}</td>
        <td>${renderDuration(trace.metrics.maxFrameIntervalMs)}</td>
        <td>${renderValue(trace.metrics.longFrameIntervalCount)}</td>
        <td>${renderValue(trace.metrics.paintEventCount)}</td>
        <td>${renderDuration(trace.metrics.paintEventDurationMs)}</td>
        <td>${renderValue(trace.metrics.compositorEventCount)}</td>
        <td>${renderDuration(trace.metrics.compositorEventDurationMs)}</td>
      </tr>`,
    )
    .join("\n");

  return `<h2>Chromium Trace Metrics</h2>
    <p>Trace-backed frame, paint, and compositor signals are Chromium-only.</p>
    <table>
      <thead>
        <tr>
          <th>Scale</th>
          <th>Trace</th>
          <th>Frame events</th>
          <th>Max frame interval</th>
          <th>Long frame intervals</th>
          <th>Paint events</th>
          <th>Paint duration</th>
          <th>Compositor events</th>
          <th>Compositor duration</th>
        </tr>
      </thead>
      <tbody>
        ${traceRows}
      </tbody>
    </table>`;
}

export function renderReport(summary: RunSummary): string {
  const rows = summary.scales
    .map(
      (scale) => `<tr>
        <td>${renderValue(scale.scale)}</td>
        <td>${renderValue(scale.samples)}</td>
        <td>${renderDuration(scale.medianDurationMs)}</td>
        <td>${renderDuration(scale.p75DurationMs)}</td>
        <td>${renderDuration(scale.p95DurationMs)}</td>
        <td>${renderDuration(scale.baselineDeltaMs)}</td>
        <td>${escapeHtml(scale.crossedThresholds.join(", ") || "none")}</td>
      </tr>`,
    )
    .join("\n");

  // TODO: Move the report shell to a packaged HTML template once the report UI grows.
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(summary.case.title)} | css-benchpress</title>
  <style>
    body {
      color: #1d252c;
      font: 1rem/1.5 system-ui, sans-serif;
      margin: 0;
      background: #f7f8f8;
    }
    header, main {
      box-sizing: border-box;
      max-inline-size: 70rem;
      margin-inline: auto;
      padding-block: 2rem;
      padding-inline: 1.5rem;
    }
    header {
      background: #ffffff;
      border-block-end: 0.0625rem solid #d8dddf;
    }
    h1 {
      font-size: 2rem;
      line-height: 1.2;
      margin-block: 0 0.5rem;
      margin-inline: 0;
    }
    .meta {
      color: #53616b;
      margin: 0;
    }
    ul {
      padding-inline-start: 1.25rem;
    }
    table {
      inline-size: 100%;
      border-collapse: collapse;
      background: #ffffff;
      border: 0.0625rem solid #d8dddf;
    }
    th, td {
      padding-block: 0.625rem;
      padding-inline: 0.75rem;
      text-align: start;
      border-block-end: 0.0625rem solid #e5e9eb;
      vertical-align: top;
    }
    th {
      background: #eef2f3;
      font-size: 0.8125rem;
      text-transform: uppercase;
    }
    code {
      background: #eef2f3;
      padding-block: 0.125rem;
      padding-inline: 0.25rem;
    }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(summary.case.title)}</h1>
    <p class="meta">Run <code>${escapeHtml(summary.id)}</code> created ${escapeHtml(summary.createdAt)}</p>
    <p>${escapeHtml(summary.case.description)}</p>
  </header>
  <main>
    <h2>Regression</h2>
    <ul>
      <li>Smallest regression scale: <strong>${renderValue(summary.smallestRegressionScale ?? "not reached")}</strong></li>
      <li>Stopped at scale: <strong>${renderValue(summary.stoppedAtScale)}</strong></li>
      <li>Stop rule: <code>${renderValue(summary.thresholdRule)}</code></li>
    </ul>
    <h2>Metrics</h2>
    <ul>
      ${renderMetricList("Standard Performance API", summary.case.metrics.standard)}
      ${renderMetricList("Experimental standard APIs", summary.case.metrics.experimental)}
      ${renderMetricList("Chromium-only metrics", summary.case.metrics.chromium)}
    </ul>
    ${renderTraceMetrics(summary)}
    <h2>Scale Samples</h2>
    <table>
      <thead>
        <tr>
          <th>Scale</th>
          <th>Samples</th>
          <th>Median</th>
          <th>P75</th>
          <th>P95</th>
          <th>Baseline delta</th>
          <th>Thresholds</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </main>
</body>
</html>`;
}
