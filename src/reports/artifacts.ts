import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import type { BrowserSample, DiscoveredCase, RunSummary } from "../types.ts";
import { errorMessage } from "../utils.ts";
import { renderReport } from "./html.ts";

export function writeRunArtifacts(
  runDirectory: string,
  discoveredCase: DiscoveredCase,
  summary: RunSummary,
  samples: BrowserSample[],
): RunSummary {
  try {
    mkdirSync(runDirectory, { recursive: true });
    const samplesPath = join(runDirectory, "samples.json");
    const summaryPath = join(runDirectory, "summary.json");
    const reportPath = join(runDirectory, "report.html");
    const reproPath = join(runDirectory, "repro");

    cpSync(discoveredCase.directory, reproPath, { recursive: true });
    writeFileSync(
      join(reproPath, "README.md"),
      `# ${discoveredCase.config.title}\n\nRepro copied from \`${basename(discoveredCase.directory)}\` for run \`${summary.id}\`.\n\nSmallest regression scale: ${summary.smallestRegressionScale ?? "not reached"}\n`,
    );

    const relativeSummary: RunSummary = {
      ...summary,
      artifacts: {
        ...summary.artifacts,
        samples: relative(runDirectory, samplesPath),
        report: relative(runDirectory, reportPath),
        repro: relative(runDirectory, reproPath),
      },
    };

    writeFileSync(samplesPath, `${JSON.stringify(samples, null, 2)}\n`);
    writeFileSync(summaryPath, `${JSON.stringify(relativeSummary, null, 2)}\n`);
    writeFileSync(reportPath, renderReport(relativeSummary));

    return relativeSummary;
  } catch (error) {
    throw new Error(`Could not write run artifacts to ${runDirectory}: ${errorMessage(error)}`);
  }
}
