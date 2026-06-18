import { expect, test } from "vite-plus/test";
import { runCase } from "../src/runner/playwrightRunner.ts";

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
