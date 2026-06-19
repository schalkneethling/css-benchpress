# css-benchpress

`css-benchpress` is a framework-free CSS performance stress harness. It runs plain HTML, CSS, and JavaScript fixtures at increasing scale until a configured performance threshold is crossed, then saves the measurements and a reduced repro for inspection.

The prototype is meant to answer practical questions such as:

- How large can this CSS pattern get before style, layout, paint, or frame timing becomes suspicious?
- Which scale first crossed the threshold?
- Which browser-visible signals changed: standard Performance API entries, experimental entries, or Chromium-only metrics?
- What reduced fixture can a developer, DevTools author, or browser engineer open next?

The broader goal is to prove that CSS performance risk can be explored systematically before building a CSS profiler or CSS query explainer/planner.

## What This Is

Each benchmark case defines:

- a fixture page;
- a scale progression, such as DOM size or sibling count;
- the measured mutation or interaction;
- the metrics to collect;
- the thresholds that mark a suspicious regression.

The runner loads the fixture in Chromium with Playwright, warms up each scale once, runs repeated samples, records summary statistics, and stops when a threshold is crossed for two consecutive scales or when the configured maximum scale is reached.

Standard Performance APIs are treated as first-class signals. Chromium CDP metrics and traces provide deeper engine-specific attribution when needed.

## What This Is Not

- It is not a general benchmark leaderboard.
- It is not a framework benchmark suite.
- It is not a replacement for DevTools, Lighthouse, WebPageTest, or browser profilers.

## Quick Start

Install dependencies:

```bash
vp install
```

This repository keeps npm lifecycle scripts disabled by default, so `vp install` is the required setup command. It installs dependencies and prepares the Playwright browser runtime used by the benchmarks.

List available cases:

```bash
vp run dev -- list
```

Run a case with a smaller sample count while iterating:

```bash
vp run dev -- run has-ancestor-invalidation --samples 3 --max-scale 400
```

Open the generated report from `runs/<timestamp>-<case-id>/report.html`.

The package also exposes an installed CLI named `css-benchpress` after build or package installation:

```bash
css-benchpress list
css-benchpress run has-ancestor-invalidation
css-benchpress report <run-id>
```

Use `vp run dev -- ...` while editing this repository because it executes the TypeScript CLI source directly. Use `css-benchpress ...` when running the built or installed command.

See [CLI usage](docs/cli.md) for commands, flags, artifact paths, and examples.

## Generated Artifacts

Each run writes a directory under `runs/<timestamp>-<case-id>/`:

- `summary.json`: run metadata, thresholds, scale summaries, and artifact references.
- `samples.json`: every collected sample.
- `trace-<scale>.json`: selected Chromium traces, currently baseline and stop scale when available.
- `report.html`: a human-readable report.
- `repro/`: a copied fixture directory for the case that was run.

## Case Authoring

A case lives in `cases/<case-id>/` and contains:

- `benchpress.case.json`: metadata, scaling, metrics, and thresholds.
- `fixture.html`: the page Playwright loads.
- `case.js`: the author-defined setup, measured action, and cleanup hooks.

`case.js` registers its hooks with the author-facing `defineCase` function:

```js
defineCase({
  setup({ scale }) {
    // Build DOM and CSS for this scale.
  },
  run() {
    // Perform the measured mutation.
  },
  cleanup() {
    // Remove generated state.
  },
});
```

The runner installs `defineCase` before the fixture loads, so case authors can focus on the web-platform scenario instead of Playwright or CDP wiring.

See [case authoring](docs/cases.md) for the metadata schema, bundled cases, and research-informed fixture ideas.

## Metrics

`css-benchpress` labels metrics by portability:

- Standard Performance API metrics: marks, measures, and paint timing.
- Experimental standard metrics: Long Tasks, Layout Instability, and Long Animation Frames when supported.
- Chromium-only metrics: `Performance.getMetrics` values and trace data collected through CDP.

Reports keep those categories separate so portable browser signals are not confused with Chromium-only attribution.

See [performance signals](docs/performance-signals.md) for guidance on reading report metrics and links to the underlying browser documentation.

## Bundled Cases

Current bundled cases:

- `has-ancestor-invalidation`
- `custom-property-root-fanout`
- `sibling-combinator-spacing`
- `registered-property-inheritance`
- `layout-instability-shift`
- `paint-heavy-effect`
- `css-function-computation`

Experimental placeholders are skipped by default in `list`; pass `--all` to include them:

- `if-function-branching`

## Development

Run validation:

```bash
vp check
vp test
```

Build:

```bash
vp run build
```

Publishing setup and release steps are documented in [publishing](docs/publishing.md).

## Research and Citations

- Bluesky discussion: https://bsky.app/profile/did:plc:l4m7ynxc47wzkgvlyyunx5n2/post/3modfjnjah226
- GoogleChromeLabs css-selector-benchmark: https://github.com/GoogleChromeLabs/css-selector-benchmark
- web.dev `@property` performance article: https://web.dev/blog/at-property-performance
- Edge selector stats docs: https://learn.microsoft.com/en-us/microsoft-edge/devtools/performance/selector-stats
- Edge CSS selector performance article: https://blogs.windows.com/msedgedev/2023/01/17/the-truth-about-css-selector-performance/
- Playwright CDPSession docs: https://playwright.dev/docs/api/class-cdpsession
- Chrome DevTools Protocol Performance domain: https://chromedevtools.github.io/devtools-protocol/tot/Performance/
- Chrome DevTools Protocol Tracing domain: https://chromedevtools.github.io/devtools-protocol/tot/Tracing/
- MDN Performance API: https://developer.mozilla.org/en-US/docs/Web/API/Performance_API
- Layout Instability API: https://wicg.github.io/layout-instability/
- Long Tasks API: https://w3c.github.io/longtasks/
- Paint Timing API: https://w3c.github.io/paint-timing/
- Long Animation Frames API: https://w3c.github.io/long-animation-frames/
- Tachometer historical reference: https://github.com/google/tachometer
- Firefox DevTools CSS explainers bug: https://bugzilla.mozilla.org/show_bug.cgi?id=1800085
- CSS crash bug discussed in thread: https://bugzilla.mozilla.org/show_bug.cgi?id=2047443#c7
