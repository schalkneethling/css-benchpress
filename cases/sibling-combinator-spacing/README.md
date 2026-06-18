# Sibling combinator spacing selector

## Intent

This case stresses a framework-free stack spacing selector that uses child, negation, and subsequent-sibling combinators.

## Hypothesis

Spacing selectors such as `.stack > :not([hidden]) ~ :not([hidden])` are convenient, but changing hidden state across a large sibling set can require selector re-evaluation across many adjacent relationships. The cost should grow with sibling count and mutation breadth.

## Scaling Axis

`scale` controls the number of rows in a single sibling list.

## Measured Action

`run()` toggles the `.compact` class on the stack, flips `hidden` on selected rows, then reads `document.body.offsetHeight`.

The layout read is intentional measurement plumbing. It forces style and layout work from the class and hidden-state changes into the measured sample.

## Signals

Useful signals include `measure` duration, long tasks, Long Animation Frames when supported, and Chromium `RecalcStyleDuration`.

## Limitations

This case covers one common stack-spacing shape. It does not yet compare against simpler margin application strategies or isolated sibling-combinator variants.
