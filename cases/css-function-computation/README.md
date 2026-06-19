# CSS @function computation

## Intent

This case stresses CSS custom functions in Chromium by calling the same `@function` across many declarations and elements.

## Hypothesis

When many elements call a CSS custom function whose result depends on a shared custom property, changing that input should force the browser to recompute the affected declarations. The cost should grow with the number of function calls and affected elements.

## Scaling Axis

`scale` controls the number of generated `.function-item` elements. Each item calls `--bench-space()` in multiple declarations, so function call count grows with element count.

## Measured Action

`run()` toggles `.computed` on the grid, which changes `--bench-intensity`. That shared input is used by `--bench-space()` calls across the generated items. The case then reads `document.body.offsetHeight`.

The layout read is measurement plumbing. It forces pending browser work into the measured sample window; the CSS custom function recomputation is the behavior under test.

## Signals

Useful signals include `measure` duration, long tasks, Long Animation Frames when supported, and Chromium `RecalcStyleDuration`.

## Limitations

This case targets the Chromium runner used by the current prototype. It does not yet compare CSS `@function` against equivalent raw `calc()` declarations or isolate function call count from affected element count.
