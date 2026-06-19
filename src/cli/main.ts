#!/usr/bin/env node
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { discoverCases } from "../cases/discovery.ts";
import {
  createReportServer,
  openInDefaultBrowser,
  resolveReportTarget,
  type ReportServer,
} from "../reports/open.ts";
import { runCase } from "../runner/playwrightRunner.ts";
import { errorMessage } from "../utils.ts";

interface ParsedArgs {
  command: string | undefined;
  positional: string[];
  flags: {
    all?: boolean;
    headed?: boolean;
    help?: boolean;
    "max-scale"?: string;
    port?: string;
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
      port: { type: "string" },
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

function portFlag(value: string | undefined): number | undefined {
  const parsed = numberFlag(value, "port");

  if (parsed === undefined) {
    return parsed;
  }

  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65_535) {
    throw new Error("--port must be an integer from 0 to 65535");
  }

  return parsed;
}

function printHelp(): void {
  console.log(`css-benchpress

Usage:
  css-benchpress list [--all]
  css-benchpress run <case-id> [--samples 20] [--max-scale 1000] [--headed]
  css-benchpress report <case-id> [--port 0]

Commands:
  list       Print bundled case metadata.
  run        Execute a case growth loop and write runs/<run-id>/ artifacts.
  report     Open the latest generated report for a case.`);
}

function findPackageRoot(startDirectory: string): string {
  let directory = startDirectory;

  while (true) {
    if (existsSync(join(directory, "package.json")) && existsSync(join(directory, "cases"))) {
      return directory;
    }

    const parent = dirname(directory);

    if (parent === directory) {
      return startDirectory;
    }

    directory = parent;
  }
}

const packageRoot = findPackageRoot(dirname(fileURLToPath(import.meta.url)));

function defaultRoot(name: string): string {
  const root = name === "cases" ? packageRoot : process.cwd();

  return resolve(root, name);
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

async function reportCommand(positional: string[], flags: ParsedArgs["flags"]): Promise<void> {
  const query = positional[0];

  if (!query) {
    throw new Error("report requires a case id");
  }

  const target = resolveReportTarget(defaultRoot("runs"), query);

  console.log(`Opening report for case "${target.summary.case.id}"`);
  console.log(`Run: ${target.runId}`);
  console.log(`Report: ${target.reportPath}`);

  let server: ReportServer | undefined;

  try {
    server = await createReportServer(target.runDirectory, { port: portFlag(flags.port) });
    await openInDefaultBrowser(server.url);
    console.log(`URL: ${server.url}`);
    console.log("Serving report. Press Ctrl+C to stop.");
    await waitForShutdown();
  } catch (error) {
    throw new Error(`Could not open report: ${errorMessage(error)}`);
  } finally {
    await server?.close().catch(() => undefined);
  }
}

function waitForShutdown(): Promise<void> {
  return new Promise((resolveShutdown) => {
    const cleanup = (): void => {
      process.off("SIGINT", cleanup);
      process.off("SIGTERM", cleanup);
      resolveShutdown();
    };

    process.once("SIGINT", cleanup);
    process.once("SIGTERM", cleanup);
  });
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
    await reportCommand(args.positional, args.flags);
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
