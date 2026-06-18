# :root custom property fanout

## Intent

This case measures the cost of updating a custom property on `:root` when many descendants consume that value in computed styles.

## Hypothesis

A root-scoped custom property used by many elements should fan out through the style tree. As the number of consuming descendants grows, changing the property should increase style recalculation work.

## Scaling Axis

`scale` controls the number of `.node` elements that consume `--benchpress-accent` through color, background, and border declarations.

## Measured Action

`run()` alternates `--benchpress-accent` between two numeric values on `document.documentElement`, then reads `document.body.offsetHeight`.

The layout read is intentional measurement plumbing. It makes the browser realize the pending style work before the sample ends.

## Signals

Useful signals include `measure` duration, long tasks, Long Animation Frames when supported, and Chromium `RecalcStyleDuration`.

## Limitations

The case focuses on root fanout. It does not yet include a matched control for narrower custom property scoping, which would make the delta easier to interpret.
