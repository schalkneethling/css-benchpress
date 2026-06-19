# CSS-triggered layout instability

## Intent

This case measures layout movement caused by CSS state changes in a growing feed represented as a list of entries.

## Hypothesis

Increasing the number of feed entries should increase the amount of layout work and may increase Layout Instability API signals when expanding rows shift content.

## Scaling Axis

`scale` controls the number of generated feed entries.

## Measured Action

`run()` toggles `.expanded` on the feed, waits for the next animation frame, then reads `document.body.offsetHeight`.

The animation-frame wait gives Layout Instability entries a chance to be observed. The layout read is measurement plumbing that forces pending layout work into the sample window.

## Signals

Useful signals include `measure` duration, Layout Instability API entries, Long Animation Frames when supported, and Chromium `LayoutDuration`.

## Limitations

Layout Instability API behavior depends on viewport state and recent input rules. This case is useful as a harness signal, but report interpretation should keep browser support and entry timing in mind.
