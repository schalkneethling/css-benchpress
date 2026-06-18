#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { discoverCases } from "../cases/discovery.ts";
import { renderReport } from "../reports/html.ts";
import { runCase } from "../runner/playwrightRunner.ts";
import type { RunSummary } from "../types.ts";
import { errorMessage } from "../utils.ts";

interface ParsedArgs {
  command: string | undefined;
  positional: string[];
  flags: {
    all?: boolean;
    headed?: boolean;
    help?: boolean;
    "max-scale"?: string;
    samples?: string;
  };
}

function parseCliArgs(argv: string[]): ParsedArgs {
  const parsed = parseArgs({
    args: argv.filter((arg) => arg !== "--"),
    allowPositionals: true,
    options: {
      all: { type: "boolean" },
      headed: { type: "boolean" },
      help: { type: "boolean", short: "h" },
      "max-scale": { type: "string" },
      samples: { type: "string" },
    },
  });
  const [command, ...positional] = parsed.positionals;

  return { command, positional, flags: parsed.values };
}

function numberFlag(value: string | undefined, name: string): number | undefined {
  if (value === undefined) {
    return value;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`--${name} must be a number`);
  }

  return parsed;
}

function printHelp(): void {
  console.log(`css-benchpress

Usage:
  css-benchpress list [--all]
  css-benchpress run <case-id> [--samples 20] [--max-scale 1000] [--headed]
  css-benchpress report <run-id>

Commands:
  list       Print bundled case metadata.
  run        Execute a case growth loop and write runs/<run-id>/ artifacts.
  report     Regenerate report.html from a saved summary.json.`);
}

function defaultRoot(name: string): string {
  return resolve(process.cwd(), name);
}

async function listCommand(flags: ParsedArgs["flags"]): Promise<void> {
  const cases = discoverCases(defaultRoot("cases"));
  const includeExperimental = flags.all === true;

  for (const benchpressCase of cases) {
    const { config } = benchpressCase;

    if (config.experimental && !includeExperimental) {
      continue;
    }

    const markers = [
      config.experimental ? "experimental" : null,
      config.tags.length > 0 ? config.tags.join(",") : null,
    ].filter(Boolean);

    console.log(`${config.id}\t${config.title}\t${markers.join(" | ")}`);
  }
}

async function runCommand(positional: string[], flags: ParsedArgs["flags"]): Promise<void> {
  const caseId = positional[0];

  if (!caseId) {
    throw new Error("run requires a case id");
  }

  const summary = await runCase({
    caseId,
    casesRoot: defaultRoot("cases"),
    runsRoot: defaultRoot("runs"),
    samples: numberFlag(flags.samples, "samples"),
    maxScale: numberFlag(flags["max-scale"], "max-scale"),
    headless: flags.headed !== true,
  });

  console.log(`Run complete: ${summary.id}`);
  console.log(`Report: runs/${summary.id}/${summary.artifacts.report}`);
  console.log(`Smallest regression scale: ${summary.smallestRegressionScale ?? "not reached"}`);
}

async function reportCommand(positional: string[]): Promise<void> {
  const runId = positional[0];

  if (!runId) {
    throw new Error("report requires a run id");
  }

  const summaryPath = join(defaultRoot("runs"), runId, "summary.json");

  if (!existsSync(summaryPath)) {
    throw new Error(`Could not find ${summaryPath}`);
  }

  let rawSummary: string;

  try {
    rawSummary = readFileSync(summaryPath, "utf8");
  } catch (error) {
    throw new Error(`Could not read ${summaryPath}: ${errorMessage(error)}`);
  }

  let summary: RunSummary;

  try {
    summary = JSON.parse(rawSummary) as RunSummary;
  } catch (error) {
    throw new Error(`Could not parse ${summaryPath}: ${errorMessage(error)}`);
  }

  console.log(renderReport(summary));
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const args = parseCliArgs(argv);

  if (!args.command || args.command === "help" || args.flags.help === true) {
    printHelp();
    return;
  }

  if (args.command === "list") {
    await listCommand(args.flags);
    return;
  }

  if (args.command === "run") {
    await runCommand(args.positional, args.flags);
    return;
  }

  if (args.command === "report") {
    await reportCommand(args.positional);
    return;
  }

  throw new Error(`Unknown command "${args.command}"`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
