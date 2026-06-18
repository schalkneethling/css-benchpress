import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Dirent } from "node:fs";
import type {
  CaseConfig,
  CaseVariant,
  DiscoveredCase,
  MetricConfig,
  ScaleConfig,
} from "../types.ts";
import { errorMessage } from "../utils.ts";

const metadataFile = "benchpress.case.json";
const fixtureFile = "fixture.html";
const scriptFile = "case.js";

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }

  return value;
}

function asNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }

  return value;
}

function asStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${label} must be an array of strings`);
  }

  return value;
}

function asOptionalBoolean(value: unknown, label: string): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new Error(`${label} must be a boolean`);
  }

  return value;
}

function validateScale(value: unknown): ScaleConfig {
  const scale = asRecord(value, "scale");
  const validated: ScaleConfig = {
    start: asNumber(scale.start, "scale.start"),
    max: asNumber(scale.max, "scale.max"),
  };

  if (scale.step !== undefined) {
    validated.step = asNumber(scale.step, "scale.step");
  }

  if (scale.multiplier !== undefined) {
    validated.multiplier = asNumber(scale.multiplier, "scale.multiplier");
  }

  return validated;
}

function validateVariants(value: unknown): CaseVariant[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error("variants must be an array");
  }

  return value.map((variant, index) => {
    const record = asRecord(variant, `variants[${index}]`);

    return {
      id: asString(record.id, `variants[${index}].id`),
      title: asString(record.title, `variants[${index}].title`),
      description: typeof record.description === "string" ? record.description : undefined,
      experimental: asOptionalBoolean(record.experimental, `variants[${index}].experimental`),
    };
  });
}

function validateMetrics(value: unknown): MetricConfig {
  const metrics = asRecord(value, "metrics");

  return {
    standard: asStringArray(metrics.standard, "metrics.standard"),
    experimental: asStringArray(metrics.experimental, "metrics.experimental"),
    chromium: asStringArray(metrics.chromium, "metrics.chromium"),
  };
}

export function validateCaseConfig(value: unknown): CaseConfig {
  const config = asRecord(value, "case config");

  return {
    id: asString(config.id, "id"),
    title: asString(config.title, "title"),
    description: asString(config.description, "description"),
    tags: asStringArray(config.tags, "tags"),
    scale: validateScale(config.scale),
    variants: validateVariants(config.variants),
    thresholds: asRecord(config.thresholds, "thresholds"),
    metrics: validateMetrics(config.metrics),
    experimental: asOptionalBoolean(config.experimental, "experimental") ?? false,
  };
}

export function loadCaseConfig(caseDirectory: string): CaseConfig {
  const filePath = join(caseDirectory, metadataFile);
  let raw: string;

  try {
    raw = readFileSync(filePath, "utf8");
  } catch (error) {
    throw new Error(`Could not read case metadata ${filePath}: ${errorMessage(error)}`);
  }

  try {
    return validateCaseConfig(JSON.parse(raw));
  } catch (error) {
    throw new Error(`Invalid case metadata in ${filePath}: ${errorMessage(error)}`);
  }
}

function requireCaseFile(caseId: string, filePath: string, fileName: string): void {
  if (!existsSync(filePath)) {
    throw new Error(`${caseId} is missing ${fileName}`);
  }
}

function discoverCaseDirectory(casesRoot: string, directoryName: string): DiscoveredCase {
  const directory = join(casesRoot, directoryName);
  const fixturePath = join(directory, fixtureFile);
  const scriptPath = join(directory, scriptFile);
  const config = loadCaseConfig(directory);

  requireCaseFile(config.id, fixturePath, fixtureFile);
  requireCaseFile(config.id, scriptPath, scriptFile);

  return {
    config,
    directory,
    fixturePath,
    scriptPath,
  };
}

export function discoverCases(casesRoot: string): DiscoveredCase[] {
  if (!existsSync(casesRoot)) {
    return [];
  }

  let entries: Dirent<string>[];

  try {
    entries = readdirSync(casesRoot, { withFileTypes: true });
  } catch (error) {
    throw new Error(`Could not read cases directory ${casesRoot}: ${errorMessage(error)}`);
  }

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => discoverCaseDirectory(casesRoot, entry.name))
    .sort((left, right) => left.config.id.localeCompare(right.config.id));
}

export function findCase(casesRoot: string, caseId: string): DiscoveredCase {
  const match = discoverCases(casesRoot).find(
    (benchpressCase) => benchpressCase.config.id === caseId,
  );

  if (!match) {
    throw new Error(`Unknown case "${caseId}". Run css-benchpress list to see available cases.`);
  }

  return match;
}
