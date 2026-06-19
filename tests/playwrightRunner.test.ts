import { expect, test } from "vite-plus/test";
import { createRunId, runCase } from "../src/runner/playwrightRunner.ts";

test("rejects invalid sample counts before running a case", async () => {
  await expect(
    runCase({
      caseId: "missing",
      casesRoot: "missing-cases-root",
      runsRoot: "runs",
      samples: 0,
    }),
  ).rejects.toThrow(/samples must be a positive integer/);
});

test("sanitizes run ids for filesystem paths", () => {
  expect(createRunId("../nested\\case", new Date("2026-06-17T00:00:00.000Z"))).toBe(
    "2026-06-17T000000000Z-nested-case",
  );
});
