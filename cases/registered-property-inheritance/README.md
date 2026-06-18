# @property inheritance behavior

## Intent

This case explores registered custom properties with inherited and non-inherited behavior across a growing grid.

## Hypothesis

Updating an inherited registered custom property should affect many descendants. Updating non-inherited local properties on a subset of cells should have a narrower invalidation shape. The combined mutation helps expose how registered custom property semantics affect style recalculation.

## Scaling Axis

`scale` controls the number of generated `.cell` elements in the grid.

## Measured Action

`run()` alternates the inherited `--inherited-tone` value on `document.documentElement`, updates `--local-weight` on every ninth cell, then reads `document.body.offsetHeight`.

The layout read is intentional measurement plumbing. It forces the browser to realize pending style and layout work before the sample is closed.

## Signals

Useful signals include `measure` duration, long tasks, Long Animation Frames when supported, and Chromium `RecalcStyleDuration`.

## Limitations

This case mixes inherited and local updates in one measured action. A future paired case could isolate inherited-only and non-inherited-only behavior for a cleaner comparison.
