# Case Authoring

A `css-benchpress` case is a small web-platform fixture with explicit scaling rules. It should isolate one CSS pattern or browser pipeline concern closely enough that another person can inspect the output and understand what changed as scale increased.

## Directory Layout

```text
cases/<case-id>/
  README.md
  benchpress.case.json
  fixture.html
  case.js
```

`fixture.html` is served from the case directory by a local static server. The runner opens it with a `?scale=<number>` query parameter and also passes the same value to `setup({ scale })`.

`README.md` should explain the case intent, the hypothesis being tested, the scaling axis, the measured action, the expected signals, and any known limitations.

## Metadata

`benchpress.case.json` describes what the case is, how it scales, and which signals matter.

```json
{
  "id": "has-ancestor-invalidation",
  "title": ":has() ancestor invalidation",
  "description": "Broad ancestor :has() selectors are stressed by toggling state classes deep in a growing DOM tree.",
  "tags": ["selectors", "has", "invalidation"],
  "scale": { "start": 200, "step": 200, "max": 2000 },
  "variants": [{ "id": "default", "title": "Broad ancestor match" }],
  "thresholds": {
    "durationDeltaRatio": 1.5,
    "durationMs": 50,
    "longTaskCount": 1
  },
  "metrics": {
    "standard": ["mark", "measure"],
    "experimental": ["longtask", "long-animation-frame"],
    "chromium": ["RecalcStyleDuration", "LayoutDuration"]
  },
  "experimental": false
}
```

Fields:

- `id` is used by `run <case-id>`. Keep it aligned with the directory name so paths, reports, and review diffs stay predictable.
- `title` and `description` should describe the CSS behavior being stressed, not just the implementation detail.
- `tags` make `list` output easier to scan.
- `scale.start`, `scale.step`, and `scale.max` define additive scale growth. `scale.multiplier` can be used for multiplicative growth instead of `step`.
- `variants` names the scenario shape. The prototype currently runs the default fixture path; variants are metadata for report clarity and future expansion.
- `thresholds` defines suspicious conditions. Supported threshold keys include `durationMs`, `durationDeltaMs`, `durationDeltaRatio`, `longTaskCount`, `loafCount`, and `layoutShiftScore`. `loafCount` means Long Animation Frame count, from the browser's `long-animation-frame` PerformanceObserver entries.
- `metrics.standard`, `metrics.experimental`, and `metrics.chromium` document which signals the case expects to be useful.
- `experimental` hides exploratory or not-yet-actionable cases from `list` unless `--all` is passed.

Saved Chromium traces are also summarized into Chromium-only `traceMetrics` in `summary.json` and `report.html` when trace capture succeeds. These signals are useful for compositor-sensitive cases because they can expose frame, paint, and compositing work separately from portable Performance API samples. See [performance signals](performance-signals.md) for more detail on how report metrics are categorized.

## Case Script

`case.js` registers hooks through `defineCase`.

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

Guidelines:

- Keep setup deterministic for a given scale.
- Put expensive construction in `setup`, not `run`, unless construction is the behavior being measured.
- Keep `run` focused on the mutation or interaction whose cost should scale.
- Avoid network fetches from `run`; the built-in server is intended to load static fixture files before sampling, not to be part of the measured behavior.
- Clean up generated DOM, timers, and global state in `cleanup` when needed.
- Do not call Playwright or CDP APIs from the fixture. The runner owns browser automation and metric collection.
- If a case reads a layout-dependent property such as `document.body.offsetHeight`, treat that as measurement plumbing. The read forces pending style or layout work into the measured sample window instead of letting the browser defer it until after `performance.measure()`. A microtask is not a replacement because it still runs before the browser has to render, and `requestAnimationFrame()` schedules work before repaint rather than directly forcing style/layout realization.

References:

- MDN `offsetHeight`: https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/offsetHeight
- MDN `requestAnimationFrame()`: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
- MDN microtask guide: https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide
- MDN Long Animation Frame timing: https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/Long_animation_frame_timing

## Current Bundled Cases

- `has-ancestor-invalidation`: grows a DOM under broad `:has()` selectors and toggles state deep in the tree.
- `custom-property-root-fanout`: updates a root custom property consumed by many descendants.
- `sibling-combinator-spacing`: applies child, negation, and subsequent-sibling spacing selectors over growing sibling lists.
- `registered-property-inheritance`: compares registered inherited and non-inherited custom property updates.
- `layout-instability-shift`: measures CSS-triggered layout movement with Layout Instability API entries when supported.
- `paint-heavy-effect`: toggles blur, filter, and shadow-like effects across a dense tile grid.
- `css-function-computation`: calls CSS custom functions across many declarations while a shared input changes.

Experimental placeholders:

- `if-function-branching`: waits for enough browser support to make CSS `if()` branch computation meaningful.

## Fixture Backlog

The project should stay grounded in real CSS features, browser-observable failure modes, and patterns that plausibly occur in production pages. Prefer cases based on common authoring patterns, framework output, design-system primitives, DevTools investigations, browser bugs, field reports, or community-submitted real project examples. Highly speculative edge cases can wait until the core corpus is useful, unless someone contributes a reduced case from a real project.

Promising future cases include:

- `:has()` sibling or relative combinators under insertion and removal.
- `:nth-child(... of S)` and quantity-query patterns across large sibling lists.
- Container query overhead at component scale.
- Nested containers under resize-driven query re-evaluation.
- Style queries driven by custom property changes.
- Scroll-driven animations that compare compositable properties such as `transform` with layout or paint-affecting properties such as `width`, `top`, `filter`, or `box-shadow`.
- Many `view()` timelines in a long list.
- Anchor positioning chains with multiple fallback options.
- Many anchored elements that re-evaluate fallback placement near viewport boundaries.
- `content-visibility: auto` with inaccurate `contain-intrinsic-size` hints.
- `text-wrap: balance` or `pretty` under repeated width changes.
- `backdrop-filter` layers during scroll.
- `color-mix()` or relative color syntax across many animated elements.
- Deeply nested subgrid layouts under content reflow.
- View transitions with many named captured elements.

For each new feature case, prefer a matched control that represents the older or simpler way to do the same job. A delta between two understandable fixtures is easier to interpret than an isolated absolute number.
