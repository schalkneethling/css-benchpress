import { expect, test } from "vite-plus/test";
import { median, percentile, summarizeScale } from "../src/metrics/aggregate.ts";
import { sample } from "./helpers.ts";

test("calculates percentiles and median", () => {
  expect(percentile([], 95)).toBe(0);
  expect(percentile([30, 10, 20, 40], 75)).toBe(30);
  expect(percentile([30, 10, 20, 40], 95)).toBe(40);
  expect(median([30, 10, 20, 40])).toBe(20);
});

test("summarizes scale samples and thresholds", () => {
  const summary = summarizeScale(
    200,
    [sample(200, 0, 10), sample(200, 1, 20), sample(200, 2, 30), sample(200, 3, 40)],
    10,
    { durationDeltaRatio: 1, durationMs: 20 },
  );

  expect(summary).toMatchObject({
    scale: 200,
    samples: 4,
    minDurationMs: 10,
    maxDurationMs: 40,
    medianDurationMs: 20,
    p75DurationMs: 30,
    p95DurationMs: 40,
    baselineDeltaMs: 10,
    baselineDeltaRatio: 1,
    crossedThresholds: ["median duration >= 20ms", "baseline delta ratio >= 1"],
  });
});

test("summarizes zero-baseline ratios without division noise", () => {
  const summary = summarizeScale(100, [sample(100, 0, 5)], 0, { durationDeltaRatio: 1 });

  expect(summary.baselineDeltaRatio).toBe(0);
  expect(summary.crossedThresholds).toEqual([]);
});

test("rejects empty scale sample sets", () => {
  expect(() => summarizeScale(100, [], 0, {})).toThrow(/requires at least one sample/);
});
