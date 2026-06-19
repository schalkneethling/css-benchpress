import type { ScaleConfig } from "../types.ts";

export function generateScales(scale: ScaleConfig): number[] {
  if (!Number.isFinite(scale.start) || !Number.isFinite(scale.max)) {
    throw new Error("scale.start and scale.max must be finite numbers");
  }

  if (scale.start <= 0 || scale.max < scale.start) {
    throw new Error("scale.start must be positive and scale.max must be >= scale.start");
  }

  if (scale.step === undefined && scale.multiplier === undefined) {
    throw new Error("scale must define either step or multiplier");
  }

  if (scale.step !== undefined && scale.multiplier !== undefined) {
    throw new Error("scale must define either step or multiplier, not both");
  }

  if (scale.step !== undefined && !Number.isFinite(scale.step)) {
    throw new Error("scale.step must be a finite number");
  }

  if (scale.step !== undefined && scale.step <= 0) {
    throw new Error("scale.step must be positive");
  }

  const multiplier = scale.multiplier ?? 0;

  if (scale.multiplier !== undefined && !Number.isFinite(scale.multiplier)) {
    throw new Error("scale.multiplier must be a finite number");
  }

  if (scale.step === undefined && multiplier <= 1) {
    throw new Error("scale.multiplier must be greater than 1");
  }

  const step = scale.step;
  const values: number[] = [];
  let current = scale.start;

  while (current <= scale.max) {
    values.push(Math.round(current));

    if (step !== undefined) {
      current += step;
    } else {
      current *= multiplier;
    }
  }

  return Array.from(new Set(values));
}
