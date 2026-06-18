# Paint-heavy visual effects

## Intent

This case stresses visual effects that can increase paint or raster work, such as filters and shadows, across a dense grid.

## Hypothesis

As more tiles receive blur, saturation, and shadow effects, the browser should do more rendering work. The cost may show up in duration, frame timing, paint-related signals, or Chromium trace data.

## Scaling Axis

`scale` controls the number of generated tiles.

## Measured Action

`run()` toggles `.heavy` on the tile grid, enabling effects on every third tile, then reads `document.body.offsetHeight`.

The layout read is intentional measurement plumbing. It gives the browser a reason to flush pending work inside the measured sample, even though the case is primarily interested in rendering cost rather than JavaScript execution.

## Signals

Useful signals include `measure` duration, paint entries where available, long tasks, Long Animation Frames when supported, Chromium `ScriptDuration`, Chromium `TaskDuration`, and trace data.

## Limitations

The current case is a general paint-heavy proxy. It does not isolate individual properties such as `filter` versus `box-shadow`, and it does not yet parse detailed paint/compositor trace events.
