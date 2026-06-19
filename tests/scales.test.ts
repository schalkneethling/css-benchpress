import { expect, test } from "vite-plus/test";
import { generateScales } from "../src/runner/scales.ts";

test("generates additive scales", () => {
  expect(generateScales({ start: 100, step: 100, max: 350 })).toEqual([100, 200, 300]);
  expect(() => generateScales({ start: 100, step: 0, max: 350 })).toThrow(
    /scale.step must be positive/,
  );
  expect(() => generateScales({ start: 100, step: Number.NaN, max: 350 })).toThrow(
    /scale.step must be a finite number/,
  );
  expect(() => generateScales({ start: 100, step: 100, multiplier: 2, max: 350 })).toThrow(
    /scale must define either step or multiplier, not both/,
  );
});

test("generates multiplicative scales", () => {
  expect(generateScales({ start: 100, multiplier: 2, max: 900 })).toEqual([100, 200, 400, 800]);
  expect(() => generateScales({ start: 100, multiplier: 1, max: 900 })).toThrow(
    /scale.multiplier must be greater than 1/,
  );
  expect(() =>
    generateScales({ start: 100, multiplier: Number.POSITIVE_INFINITY, max: 900 }),
  ).toThrow(/scale.multiplier must be a finite number/);
});
