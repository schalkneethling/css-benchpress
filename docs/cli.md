# CLI Usage

`css-benchpress` has two common execution modes:

- `vp run dev -- ...` runs `src/cli/main.ts` directly through Vite+. Use this while changing the runner, reports, or bundled cases in this repository or a fork.
- `css-benchpress ...` runs the built or installed CLI. Use this when testing the packaged command from this repository, using the package outside the source checkout, or running it as an installed dependency.

The command arguments after `vp run dev --` are the same arguments accepted by `css-benchpress`; only the entry point changes.

## Commands

### `list`

```bash
vp run dev -- list
vp run dev -- list --all
```

Prints bundled case metadata as tab-separated rows:

```text
<case-id>    <title>    <markers>
```

By default, experimental cases are hidden so exploratory placeholders do not look like stable benchmarks. Pass `--all` to include cases whose metadata sets `"experimental": true`.

### `run <case-id>`

```bash
vp run dev -- run has-ancestor-invalidation
vp run dev -- run has-ancestor-invalidation --samples 5
vp run dev -- run custom-property-root-fanout --samples 5 --max-scale 1000
vp run dev -- run paint-heavy-effect --headed
```

Runs one case through its configured scale progression.

Options:

- `--samples <number>` overrides the default 20 measured samples per scale. Smaller values are useful while developing a fixture; larger values make summaries steadier.
- `--max-scale <number>` overrides the case metadata maximum scale. This is useful for quick smoke runs or for pushing a case beyond its default range.
- `--headed` opens a visible Chromium window instead of running headless. Use this to inspect fixture behavior while authoring or debugging a case.

For each scale, the runner:

1. starts a local static server for the case directory;
2. opens `fixture.html?scale=<scale>` in Chromium;
3. installs `defineCase` and PerformanceObserver collectors;
4. calls optional `setup({ scale })`;
5. performs one warmup run;
6. collects measured samples from `run()`;
7. summarizes the scale and checks thresholds;
8. stops after two consecutive threshold-crossing scales or at max scale.

### `report <case-id>`

```bash
vp run dev -- report has-ancestor-invalidation
vp run dev -- report has-ancestor-invalidation --port 4173
```

Finds the newest matching run in `runs/`, starts a localhost server for that run directory, and opens `report.html` in the default browser. The command prints the selected run id, report path, and URL before opening the browser. Keep the command running while viewing the localhost URL; press Ctrl+C when you are done.

By default, the server asks the operating system for an available port to avoid collisions. Pass `--port <number>` when you need a stable URL, for example while comparing reports or using browser tooling that remembers an origin. If the server or browser launch fails, the command reports the underlying error.

## Artifact Layout

Each `run` command writes to:

```text
runs/<timestamp>-<case-id>/
```

Files:

- `summary.json` contains the case metadata, stop reason, scale summaries, thresholds crossed, and artifact references.
- `samples.json` contains every raw sample collected by the browser.
- `trace-<scale>.json` contains selected Chromium traces when trace capture succeeds. The current runner captures the baseline scale and the stop scale.
- `report.html` is the generated human-readable report.
- `repro/` is a copy of the case directory used for the run.

## Interpreting Results

The first scale is the baseline. Later scales report median, p75, p95, min, max, baseline delta in milliseconds, and baseline delta ratio.

When trace capture succeeds, `summary.json` also includes `traceMetrics` entries for the saved trace scales. These are Chromium-only frame, paint, and compositor signals derived from the trace files, including frame event counts, max frame interval, long frame interval count, paint event counts and duration, and compositor event counts and duration. See [performance signals](performance-signals.md) for guidance on reading these values.

A run stops early only after threshold crossings at two consecutive scales. This avoids treating a single noisy sample group as the regression point. If no two-scale crossing occurs, the stop rule is `max-scale` and `smallestRegressionScale` is `null`.

Use the copied `repro/` and selected trace files as starting points for deeper DevTools inspection.
