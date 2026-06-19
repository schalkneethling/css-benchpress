import { expect, test } from "vite-plus/test";
import { classifyPerformanceEntrySupport } from "../src/metrics/support.ts";

test("classifies supported and missing PerformanceObserver entries used by the harness", () => {
  expect(classifyPerformanceEntrySupport(["measure", "mark", "paint", "layout-shift"])).toEqual({
    standard: ["mark", "measure", "paint"],
    experimentalStandard: ["layout-shift"],
    unsupported: ["long-animation-frame", "longtask"],
  });
});
