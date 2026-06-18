import { createServer } from "node:http";
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { extname, join, normalize, relative, resolve, sep } from "node:path";
import { findCase } from "../cases/discovery.ts";
import { summarizeScale } from "../metrics/aggregate.ts";
import { writeRunArtifacts } from "../reports/artifacts.ts";
import type { BrowserSample, RunSummary, ScaleSummary } from "../types.ts";
import { errorMessage } from "../utils.ts";
import { generateScales } from "./scales.ts";
import { shouldStopAfterScale } from "./thresholds.ts";

export interface RunCaseOptions {
  caseId: string;
  casesRoot: string;
  runsRoot: string;
  samples?: number;
  maxScale?: number;
  headless?: boolean;
}

interface PlaywrightModule {
  chromium: {
    launch(options: { headless: boolean }): Promise<unknown>;
  };
}

interface StaticServer {
  origin: string;
  close: () => Promise<void>;
}

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
]);

function createRunId(caseId: string, date = new Date()): string {
  const stamp = date.toISOString().replaceAll(":", "").replaceAll(".", "");
  return `${stamp}-${caseId}`;
}

async function importPlaywright(): Promise<PlaywrightModule> {
  try {
    return (await import("playwright")) as PlaywrightModule;
  } catch (error) {
    throw new Error(
      `Playwright is required to run cases. Install dependencies with "vp install". ${String(error)}`,
    );
  }
}

async function createCaseServer(rootDirectory: string): Promise<StaticServer> {
  const root = resolve(rootDirectory);
  const server = createServer((request, response) => {
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
    const pathname = requestUrl.pathname === "/" ? "/fixture.html" : requestUrl.pathname;
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
      server.listen(0, "127.0.0.1", () => {
        server.off("error", rejectListen);
        resolveListen();
      });
    });
  } catch (error) {
    throw new Error(`Could not start case HTTP server for ${root}: ${errorMessage(error)}`);
  }

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error(`Could not start case HTTP server for ${root}: unexpected server address`);
  }

  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolveClose, rejectClose) => {
        server.close((error?: Error) => {
          if (error) {
            rejectClose(error);
          } else {
            resolveClose();
          }
        });
      }),
  };
}

async function readTraceStream(client: any, stream: string): Promise<string> {
  let trace = "";
  let eof = false;

  while (!eof) {
    const chunk = await client.send("IO.read", { handle: stream });
    trace += chunk.data ?? "";
    eof = Boolean(chunk.eof);
  }

  await client.send("IO.close", { handle: stream });

  return trace;
}

async function captureTrace(
  page: any,
  runDirectory: string,
  scale: number,
): Promise<string | null> {
  const client = await page.context().newCDPSession(page);
  const tracePath = join(runDirectory, `trace-${scale}.json`);

  try {
    const tracingComplete = new Promise<string>((resolve) => {
      client.once("Tracing.tracingComplete", (event: { stream: string }) => {
        resolve(event.stream);
      });
    });

    await client.send("Tracing.start", {
      categories: "devtools.timeline,blink,disabled-by-default-devtools.timeline",
      transferMode: "ReturnAsStream",
    });
    await page.evaluate(async () => {
      await globalThis.__benchpressCase.run();
    });
    await client.send("Tracing.end");

    const stream = await tracingComplete;
    const trace = await readTraceStream(client, stream);
    writeFileSync(tracePath, trace);

    return tracePath;
  } catch (error) {
    console.warn(`Could not capture Chromium trace for scale ${scale}: ${errorMessage(error)}`);
    return null;
  } finally {
    await client.detach().catch(() => undefined);
  }
}

async function collectSample(page: any, scale: number, iteration: number): Promise<BrowserSample> {
  const browserMetrics = await page.evaluate(
    async ({ sampleName }: { sampleName: string }) => {
      const startMark = `${sampleName}:start`;
      const endMark = `${sampleName}:end`;
      const entryStart = globalThis.__benchpressEntries.length;

      performance.mark(startMark);
      await globalThis.__benchpressCase.run();
      performance.mark(endMark);
      performance.measure(sampleName, startMark, endMark);

      const measure = performance.getEntriesByName(sampleName, "measure").at(-1);
      const entries = globalThis.__benchpressEntries.slice(entryStart);
      const longTasks = entries.filter((entry) => entry.entryType === "longtask");
      const layoutShifts = entries.filter((entry) => {
        const layoutShift = entry as PerformanceEntry & {
          hadRecentInput?: boolean;
          value?: number;
        };

        return entry.entryType === "layout-shift" && !layoutShift.hadRecentInput;
      });
      const paints = entries.filter((entry) => entry.entryType === "paint");
      const loafs = entries.filter((entry) => entry.entryType === "long-animation-frame");

      return {
        durationMs: measure?.duration ?? 0,
        longTaskCount: longTasks.length,
        longTaskDurationMs: longTasks.reduce((total, entry) => total + entry.duration, 0),
        layoutShiftScore: layoutShifts.reduce((total, entry) => {
          const layoutShift = entry as PerformanceEntry & { value?: number };

          return total + (layoutShift.value ?? 0);
        }, 0),
        paintCount: paints.length,
        loafCount: loafs.length,
        loafDurationMs: loafs.reduce((total, entry) => total + entry.duration, 0),
      };
    },
    { sampleName: `benchpress:${scale}:${iteration}` },
  );

  const client = await page.context().newCDPSession(page);
  const cdpMetrics: Record<string, number> = {};

  try {
    await client.send("Performance.enable");
    const response = await client.send("Performance.getMetrics");

    for (const metric of response.metrics ?? []) {
      if (typeof metric.name === "string" && typeof metric.value === "number") {
        cdpMetrics[metric.name] = metric.value;
      }
    }
  } finally {
    await client.detach().catch(() => undefined);
  }

  return {
    scale,
    iteration,
    ...browserMetrics,
    cdpMetrics,
  };
}

async function preparePage(browser: any, fixtureUrl: string, scale: number): Promise<any> {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.addInitScript((initialScale: number) => {
    globalThis.__benchpressScale = initialScale;
    globalThis.__benchpressEntries = [];
    globalThis.defineCase = (caseDefinition) => {
      globalThis.__benchpressCase = caseDefinition;
    };

    const supported = globalThis.PerformanceObserver?.supportedEntryTypes ?? [];

    for (const type of ["longtask", "layout-shift", "paint", "long-animation-frame"]) {
      if (!supported.includes(type)) {
        continue;
      }

      try {
        const observer = new PerformanceObserver((list) => {
          globalThis.__benchpressEntries.push(...list.getEntries());
        });
        observer.observe({ type, buffered: true });
      } catch {
        // Unsupported observer options vary by browser and channel.
      }
    }
  }, scale);

  await page.goto(`${fixtureUrl}?scale=${scale}`);
  await page.waitForFunction(() => Boolean(globalThis.__benchpressCase));
  await page.evaluate(async () => {
    await globalThis.__benchpressCase.setup?.({ scale: globalThis.__benchpressScale });
  });

  return page;
}

async function captureTraceForScale(
  browser: any,
  fixtureUrl: string,
  runDirectory: string,
  scale: number,
): Promise<string | null> {
  const tracePage = await preparePage(browser, fixtureUrl, scale);

  try {
    return await captureTrace(tracePage, runDirectory, scale);
  } finally {
    await tracePage.context().close();
  }
}

export async function runCase(options: RunCaseOptions): Promise<RunSummary> {
  const sampleCount = options.samples ?? 20;

  if (!Number.isInteger(sampleCount) || sampleCount < 1) {
    throw new Error("samples must be a positive integer");
  }

  const discoveredCase = findCase(options.casesRoot, options.caseId);
  const scaleConfig =
    options.maxScale === undefined
      ? discoveredCase.config.scale
      : { ...discoveredCase.config.scale, max: options.maxScale };
  const scales = generateScales(scaleConfig);
  const runId = createRunId(discoveredCase.config.id);
  const runDirectory = join(options.runsRoot, runId);
  const samples: BrowserSample[] = [];
  const summaries: ScaleSummary[] = [];
  const traces: string[] = [];
  const playwright = await importPlaywright();
  const browser = await playwright.chromium.launch({ headless: options.headless ?? true });
  const caseServer = await createCaseServer(discoveredCase.directory);
  const fixtureUrl = `${caseServer.origin}/fixture.html`;

  mkdirSync(runDirectory, { recursive: true });

  try {
    let baselineMedianMs = 0;
    let smallestRegressionScale: number | null = null;

    for (const scale of scales) {
      const page = await preparePage(browser, fixtureUrl, scale);

      await collectSample(page, scale, -1);

      if (summaries.length === 0) {
        const tracePath = await captureTraceForScale(browser, fixtureUrl, runDirectory, scale);

        if (tracePath) {
          traces.push(relative(runDirectory, tracePath));
        }
      }

      const scaleSamples: BrowserSample[] = [];

      for (let iteration = 0; iteration < sampleCount; iteration += 1) {
        const sample = await collectSample(page, scale, iteration);
        scaleSamples.push(sample);
        samples.push(sample);
      }

      await page.evaluate(async () => {
        await globalThis.__benchpressCase.cleanup?.();
      });
      await page.context().close();

      if (summaries.length === 0) {
        baselineMedianMs = summarizeScale(
          scale,
          scaleSamples,
          0,
          discoveredCase.config.thresholds,
        ).medianDurationMs;
      }

      const scaleSummary = summarizeScale(
        scale,
        scaleSamples,
        baselineMedianMs,
        discoveredCase.config.thresholds,
      );
      summaries.push(scaleSummary);

      const stopCheck = shouldStopAfterScale(summaries);

      if (stopCheck.stop) {
        smallestRegressionScale = stopCheck.smallestRegressionScale;
        const tracePath = await captureTraceForScale(browser, fixtureUrl, runDirectory, scale);

        if (tracePath) {
          traces.push(relative(runDirectory, tracePath));
        }
        break;
      }
    }

    const summary: RunSummary = {
      id: runId,
      createdAt: new Date().toISOString(),
      case: discoveredCase.config,
      stoppedAtScale: summaries.at(-1)?.scale ?? scales.at(-1) ?? 0,
      smallestRegressionScale,
      thresholdRule: smallestRegressionScale === null ? "max-scale" : "two-consecutive-scales",
      scales: summaries,
      artifacts: {
        samples: "samples.json",
        report: "report.html",
        repro: "repro",
        traces,
      },
    };

    return writeRunArtifacts(runDirectory, discoveredCase, summary, samples);
  } finally {
    await caseServer.close();
    await (browser as { close(): Promise<void> }).close();
  }
}

declare global {
  /*
   * The runner injects these properties into the browser page before the case
   * module loads. They must live on the page global so fixture scripts can call
   * defineCase() and Playwright page.evaluate() can later invoke the registered
   * hooks from outside the module scope.
   */
  interface Window {
    __benchpressCase: {
      setup?: (context: { scale: number }) => Promise<void> | void;
      run: () => Promise<void> | void;
      cleanup?: () => Promise<void> | void;
    };
    __benchpressEntries: PerformanceEntry[];
    __benchpressScale: number;
    defineCase: (caseDefinition: Window["__benchpressCase"]) => void;
  }

  /*
   * Ambient global declarations use `var` so TypeScript adds the names to
   * globalThis. This describes browser globals installed by addInitScript; it
   * does not emit JavaScript or create mutable Node-side bindings.
   */
  var __benchpressCase: Window["__benchpressCase"];
  var __benchpressEntries: PerformanceEntry[];
  var __benchpressScale: number;
  var defineCase: Window["defineCase"];
}
