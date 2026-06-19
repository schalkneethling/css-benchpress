# :has() ancestor invalidation

## Intent

This case stresses broad `:has()` selectors that depend on descendant state. It represents authoring patterns where a parent or section changes styling when one of many descendants becomes active, selected, invalid, or otherwise stateful.

## Hypothesis

As the number of sections grows, toggling descendant classes should require more selector invalidation and style recalculation. Broad ancestor selectors are expected to become more expensive than narrowly scoped selectors because the browser has more ancestor/descendant relationships to re-evaluate after each mutation.

## Scaling Axis

`scale` controls the number of generated sections. Each section contains two `.item` descendants, so the number of possible descendant state changes grows with the section count.

## Measured Action

`run()` toggles `.is-active` on every seventeenth `.item`, then reads `document.body.offsetHeight`. The stride is intentionally uneven relative to the two-item section structure so each run mutates a stable subset spread through the whole fixture without toggling every descendant.

The layout read is intentional measurement plumbing. It forces pending style and layout work caused by the class toggles into the measured sample window. The JavaScript read itself is not the behavior under test.

## Signals

Useful signals include `measure` duration, long tasks, Long Animation Frames when supported, Chromium `RecalcStyleDuration`, and Chromium `LayoutDuration`.

## Limitations

This is a deliberately broad `:has()` case. It does not compare against a narrowly anchored selector or a JavaScript-managed parent class yet, so absolute timings should be interpreted as a stress signal rather than a complete authoring recommendation.
