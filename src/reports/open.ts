import { spawn } from "node:child_process";
import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import type { RunSummary } from "../types.ts";
import { errorMessage } from "../utils.ts";

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
]);

export interface ReportTarget {
  query: string;
  runId: string;
  runDirectory: string;
  reportPath: string;
  summary: RunSummary;
}

export interface ReportServer {
  url: string;
  close: () => Promise<void>;
}

export interface ReportServerOptions {
  port?: number;
}

function readRunSummary(summaryPath: string): RunSummary {
  let rawSummary: string;

  try {
    rawSummary = readFileSync(summaryPath, "utf8");
  } catch (error) {
    throw new Error(`Could not read ${summaryPath}: ${errorMessage(error)}`);
  }

  try {
    return JSON.parse(rawSummary) as RunSummary;
  } catch (error) {
    throw new Error(`Could not parse ${summaryPath}: ${errorMessage(error)}`);
  }
}

function normalizeSearchValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
}

function reportTargetForRun(
  runsRoot: string,
  runId: string,
  query: string,
  summary: RunSummary,
): ReportTarget {
  const runDirectory = join(runsRoot, runId);
  const reportPath = join(runDirectory, summary.artifacts.report || "report.html");

  if (!existsSync(reportPath)) {
    throw new Error(`Could not find ${reportPath}`);
  }

  return {
    query,
    runId,
    runDirectory,
    reportPath,
    summary,
  };
}

export function resolveReportTarget(runsRoot: string, query: string): ReportTarget {
  if (!existsSync(runsRoot)) {
    throw new Error(`Could not find runs directory ${runsRoot}`);
  }

  const normalizedQuery = normalizeSearchValue(query);
  const candidates = readdirSync(runsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const summaryPath = join(runsRoot, entry.name, "summary.json");

      if (!existsSync(summaryPath)) {
        return [];
      }

      const summary = readRunSummary(summaryPath);
      const caseMatches =
        normalizeSearchValue(summary.case.id) === normalizedQuery ||
        normalizeSearchValue(summary.case.title) === normalizedQuery;

      return caseMatches ? [reportTargetForRun(runsRoot, entry.name, query, summary)] : [];
    })
    .sort((left, right) => right.summary.createdAt.localeCompare(left.summary.createdAt));

  const latest = candidates[0];

  if (latest) {
    return latest;
  }

  throw new Error(
    `Could not find a run for case "${query}". Expected runs/<timestamp>-${query}/report.html with a matching summary.json.`,
  );
}

export async function createReportServer(
  runDirectory: string,
  options: ReportServerOptions = {},
): Promise<ReportServer> {
  const root = resolve(runDirectory);
  const port = options.port ?? 0;
  const server = createServer((request, response) => {
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
    const pathname = requestUrl.pathname === "/" ? "/report.html" : requestUrl.pathname;
    const filePath = resolve(root, normalize(decodeURIComponent(pathname)).replace(/^[/\\]+/, ""));
    const insideRoot = filePath === root || filePath.startsWith(`${root}${sep}`);

    if (!insideRoot || !existsSync(filePath) || !statSync(filePath).isFile()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "content-type": contentTypes.get(extname(filePath)) ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    createReadStream(filePath).pipe(response);
  });

  try {
    await new Promise<void>((resolveListen, rejectListen) => {
      server.once("error", rejectListen);
      server.listen(port, "127.0.0.1", () => {
        server.off("error", rejectListen);
        resolveListen();
      });
    });
  } catch (error) {
    throw new Error(
      `Could not start report HTTP server on 127.0.0.1:${port} for ${root}: ${errorMessage(error)}`,
    );
  }

  const address = server.address();

  if (!address || typeof address === "string") {
    await closeServer(server);
    throw new Error(`Could not start report HTTP server for ${root}: unexpected server address`);
  }

  return {
    url: `http://127.0.0.1:${address.port}/report.html`,
    close: () => closeServer(server),
  };
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolveClose, rejectClose) => {
    server.close((error?: Error) => {
      if (error) {
        rejectClose(error);
      } else {
        resolveClose();
      }
    });
  });
}

export async function openInDefaultBrowser(url: string): Promise<void> {
  const command =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];

  await new Promise<void>((resolveOpen, rejectOpen) => {
    const child = spawn(command, args, { detached: true, stdio: "ignore" });

    child.once("error", rejectOpen);
    child.once("spawn", () => {
      child.unref();
      resolveOpen();
    });
  });
}
