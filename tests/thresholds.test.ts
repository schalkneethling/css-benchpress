import { expect, test } from "vite-plus/test";
import { crossedThresholds, shouldStopAfterScale } from "../src/runner/thresholds.ts";
import { emptyScaleSummary } from "./helpers.ts";

test("reports threshold names for direct checks", () => {
  expect(
    crossedThresholds(
      {
        ...emptyScaleSummary(10),
        medianDurationMs: 50,
        baselineDeltaMs: 25,
        baselineDeltaRatio: 2,
        medianLongTaskCount: 1,
        medianLoafCount: 2,
        medianLayoutShiftScore: 0.2,
      },
      {
        durationMs: 50,
        durationDeltaMs: 20,
        durationDeltaRatio: 1.5,
        longTaskCount: 1,
        loafCount: 2,
        layoutShiftScore: 0.1,
      },
    ),
  ).toEqual([
    "median duration >= 50ms",
    "baseline delta >= 20ms",
    "baseline delta ratio >= 1.5",
    "long task count >= 1",
    "LoAF count >= 2",
    "layout shift score >= 0.1",
  ]);
});

test("detects two consecutive threshold crossings", () => {
  const first = {
    ...emptyScaleSummary(100),
    crossedThresholds: [],
  };
  const second = {
    ...emptyScaleSummary(200),
    crossedThresholds: ["median duration >= 20ms"],
  };
  const third = {
    ...emptyScaleSummary(300),
    crossedThresholds: ["median duration >= 20ms"],
  };

  expect(shouldStopAfterScale([first, second])).toEqual({
    stop: false,
    smallestRegressionScale: null,
  });
  expect(shouldStopAfterScale([first, second, third])).toEqual({
    stop: true,
    smallestRegressionScale: 200,
  });
});
