# CSS if() function branching

## Intent

This is an experimental placeholder for a future CSS `if()` branch computation case.

## Hypothesis

Once browser support is suitable, conditional CSS function branches may have measurable style computation costs when applied across many elements or when branch inputs change frequently.

## Scaling Axis

`scale` currently controls the number of placeholder elements. The final case should define a more meaningful axis based on branch count, dependent declarations, or affected element count.

## Measured Action

`run()` currently toggles a placeholder `.branch` class and reads `document.body.offsetHeight`.

The layout read is measurement plumbing, but this placeholder should not be treated as evidence about CSS `if()` performance yet.

## Signals

The likely first useful signals will be `measure` duration, long tasks, and Chromium `RecalcStyleDuration`.

## Limitations

This case is marked experimental because it does not yet exercise real CSS `if()` behavior. It exists to reserve the case shape until browser support and syntax stability make the fixture meaningful.
