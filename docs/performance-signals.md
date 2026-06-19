# Performance Signals

`css-benchpress` reports combine portable browser signals with Chromium-specific signals. The goal is to help readers understand what scaled, which threshold stopped the run, and which browser subsystem may be worth inspecting next.

## Signal Categories

### Standard Performance API

Standard signals come from the browser Performance API and should be the easiest to compare across engines. Current reports use `mark` and `measure` entries to time the case action at each scale.

The median, p75, and p95 values in the scale table are based on repeated `measure` durations. The baseline delta columns compare each scale to the first scale in the run.

### Experimental Standard APIs

Some useful browser performance APIs are standardized or in progress but not equally supported in every engine. The runner currently records supported entries such as Long Tasks, Layout Instability, and Long Animation Frames when the browser exposes them.

Treat these as strong browser-observable signals when present, but do not assume every case or browser run will include them.

### Chromium CDP Metrics

Chromium-only metrics come from Chrome DevTools Protocol `Performance.getMetrics`. Case metadata lists the CDP metrics expected to be useful, such as `RecalcStyleDuration` for style recalculation-heavy cases.

These metrics are useful for Chromium investigation and DevTools-oriented debugging. They should not be described as portable web-platform results.

### Chromium Trace Metrics

Trace metrics are derived from saved Chromium trace files. They are useful when a case may involve frame production, painting, raster work, compositing, or presentation timing.

The current parser intentionally summarizes a conservative subset:

- Frame events: common Chromium pipeline events such as `BeginFrame`, `DrawFrame`, `PipelineReporter`, `SubmitCompositorFrame`, and `SwapBuffers`.
- Frame intervals: timestamp gaps between repeated frame-like events. These are coarse hints for long frame gaps, not a replacement for inspecting the DevTools Performance panel.
- Paint events: common paint, pre-paint, raster, image paint, and layer tree update events.
- Compositor events: common commit, layer activation, compositor submission, and buffer swap events.

Reports omit the trace metrics section when the captured trace summaries do not contain useful data. For example, a trace with no frame or compositor events and only a zero-duration paint marker is not enough evidence to show a full table.

## Reading A Report

Start with the regression summary. `smallestRegressionScale` is the first scale in the pair of consecutive threshold-crossing scales. This avoids treating one noisy sample group as the regression point.

Then read the scale table:

- `Median`, `P75`, and `P95` show the measured case action duration at that scale.
- `Baseline delta` shows the median difference from the first scale.
- `Thresholds` shows which configured rules were crossed.

Use Chromium-only sections as attribution hints, not as standalone proof. For example, a CSS `@function` case may show a clear duration increase while having no useful frame/compositor trace data. In that situation, a style recalculation metric is more relevant than a frame table.

## Further Reading

- MDN Performance APIs: https://developer.mozilla.org/en-US/docs/Web/API/Performance_API
- MDN Long Animation Frame Timing: https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongAnimationFrameTiming
- Layout Instability API: https://wicg.github.io/layout-instability/
- Long Tasks API: https://w3c.github.io/longtasks/
- Chrome DevTools Protocol Performance domain: https://chromedevtools.github.io/devtools-protocol/tot/Performance/
- Chrome DevTools Protocol Tracing domain: https://chromedevtools.github.io/devtools-protocol/tot/Tracing/
