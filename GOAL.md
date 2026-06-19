# Project Goal

## North Star

`css-benchpress` exists to help developers and tooling authors discover where CSS patterns become performance problems by growing realistic web-platform test cases until measurable regressions appear.

## Who This Is For

`css-benchpress` is primarily for people investigating CSS performance:

- DevTools and performance-tooling authors exploring what CSS profiling and explanation tools should show.
- CSS authors and framework maintainers who want evidence about which platform patterns scale poorly and why.
- Web platform and browser engineers who need reduced, repeatable cases to understand CSS performance behavior.

## Core Goals

1. Discover CSS performance regressions.

   Grow controlled fixtures across DOM size, selector shape, custom property fanout, visual effects, layout movement, and mutation frequency until a configured performance threshold is crossed.

2. Produce reproducible artifacts.

   Save the smallest threshold-crossing case, samples, summaries, traces, and human-readable reports so others can inspect or reproduce the result.

3. Keep cases web-platform focused.

   Use plain HTML, CSS, and JavaScript fixtures. Framework-inspired patterns may be represented as platform CSS, but bundled cases should not depend on framework runtimes.

4. Combine portable and engine-specific signals.

   Use standard Performance APIs where possible, and Chromium trace data where deeper rendering-pipeline detail is needed.

5. Inform future CSS tooling and authoring guidance.

   Use discovered regressions to clarify what a CSS profiler or CSS query explainer/planner should surface, and to help authors understand which CSS patterns deserve caution, scoping, containment, or alternative approaches.

## Success Looks Like

The prototype is successful when it can:

- Run a fixture through increasing scale steps.
- Detect and report a clear regression point.
- Save a reduced repro for the smallest bad scale.
- Distinguish standard Performance API metrics from Chromium-only trace metrics.
- Produce reports that explain what scaled, what regressed, and where to inspect next.
- Provide enough real examples to start a concrete tooling and authoring-practice discussion with the wider web community.

Longer-term success looks like a shared corpus of CSS performance cases that DevTools teams, framework authors, and CSS practitioners can contribute to and learn from.

## Non-Goals

`css-benchpress` is not:

- A generic website performance audit tool.
- A benchmark leaderboard for comparing sites, frameworks, or browsers.
- A replacement for DevTools, Lighthouse, WebPageTest, or browser profilers.
- A framework benchmark suite.
- A polished CSS profiler UI in its first milestone.
- A lab-grade benchmarking system before the basic regression-discovery model has proven useful.

## Principles and Constraints

- Prefer realistic, understandable cases over artificial worst cases.
- Keep bundled fixtures framework-free to avoid introducing extra variables.
- Treat standard web APIs as first-class signals, even when Chromium traces are needed for deeper detail.
- Label metrics clearly as standard, experimental standard, or browser-specific.
- Make generated artifacts easy to share with DevTools authors, browser engineers, and CSS practitioners.
- Optimize first for credible discovery and reproducibility, then for statistical sophistication.
- Design fixture and runner boundaries so Firefox and WebKit can be added later, even if Chromium has the richest metrics first.
- Document research sources in the README so the project’s motivation and methodology are traceable.

## Current Focus

The first milestone is a Node.js and TypeScript CLI prototype with Playwright automation that can:

- list available cases;
- run one case through a growth loop;
- collect Performance API and Chromium CDP metrics;
- detect threshold crossings;
- write JSON and HTML reports;
- save a smallest-scale repro;
- ship an initial framework-free case corpus covering `:has()`, custom property fanout, sibling combinator selectors, `@property`, layout instability, and paint-heavy effects.

Speculative features such as `if()` and `@function` should remain experimental and skipped by default until browser support makes meaningful testing possible.

## Open Questions

- Which thresholds should each case use once initial reports can be compared with real user-impact research and field-performance expectations?
- Which Chromium trace details matter most after generated reports have been reviewed by DevTools authors, browser engineers, and CSS practitioners?
- What issue and pull request templates will keep the barrier to contributing a first case low while still encouraging clean code, instructive examples, and clear documentation?
