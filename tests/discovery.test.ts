import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vite-plus/test";
import {
  discoverCases,
  findCase,
  loadCaseConfig,
  validateCaseConfig,
} from "../src/cases/discovery.ts";
import { validConfig } from "./helpers.ts";

test("validates case config", () => {
  expect(validateCaseConfig(validConfig).id).toBe("sample-case");
  expect(() => validateCaseConfig({ ...validConfig, title: "" })).toThrow(
    /title must be a non-empty string/,
  );
  expect(() => validateCaseConfig({ ...validConfig, variants: "default" })).toThrow(
    /variants must be an array/,
  );
  expect(() =>
    validateCaseConfig({
      ...validConfig,
      metrics: { ...validConfig.metrics, standard: "measure" },
    }),
  ).toThrow(/metrics.standard must be an array of strings/);
  expect(() => validateCaseConfig({ ...validConfig, experimental: "false" })).toThrow(
    /experimental must be a boolean/,
  );
  expect(() =>
    validateCaseConfig({
      ...validConfig,
      variants: [{ id: "variant", title: "Variant", experimental: "false" }],
    }),
  ).toThrow(/variants\[0\]\.experimental must be a boolean/);
});

test("loads valid case metadata", () => {
  const caseDirectory = mkdtempSync(join(tmpdir(), "benchpress-case-"));
  writeFileSync(join(caseDirectory, "benchpress.case.json"), `${JSON.stringify(validConfig)}\n`);

  expect(loadCaseConfig(caseDirectory).id).toBe("sample-case");
});

test("wraps invalid case metadata with file context", () => {
  const caseDirectory = mkdtempSync(join(tmpdir(), "benchpress-case-"));
  writeFileSync(join(caseDirectory, "benchpress.case.json"), "{ nope");

  expect(() => loadCaseConfig(caseDirectory)).toThrow(/Invalid case metadata/);
});

test("returns no cases when cases root is absent", () => {
  const casesRoot = join(tmpdir(), `benchpress-missing-${Date.now()}`);

  expect(discoverCases(casesRoot)).toEqual([]);
});

test("reports missing case fixture files during discovery", () => {
  const casesRoot = mkdtempSync(join(tmpdir(), "benchpress-cases-"));
  const caseDirectory = join(casesRoot, "missing-fixture");
  mkdirSync(caseDirectory);
  writeFileSync(join(caseDirectory, "benchpress.case.json"), `${JSON.stringify(validConfig)}\n`);
  writeFileSync(join(caseDirectory, "case.js"), "");

  expect(() => discoverCases(casesRoot)).toThrow(/sample-case is missing fixture\.html/);
});

test("reports missing case scripts during discovery", () => {
  const casesRoot = mkdtempSync(join(tmpdir(), "benchpress-cases-"));
  const caseDirectory = join(casesRoot, "missing-script");
  mkdirSync(caseDirectory);
  writeFileSync(join(caseDirectory, "benchpress.case.json"), `${JSON.stringify(validConfig)}\n`);
  writeFileSync(join(caseDirectory, "fixture.html"), "");

  expect(() => discoverCases(casesRoot)).toThrow(/sample-case is missing case\.js/);
});

test("discovers bundled cases and finds a case by id", () => {
  const cases = discoverCases("cases");

  expect(cases.map((benchpressCase) => benchpressCase.config.id)).toContain(
    "has-ancestor-invalidation",
  );
  expect(cases.every((benchpressCase) => benchpressCase.fixturePath.endsWith("fixture.html"))).toBe(
    true,
  );
  expect(findCase("cases", "has-ancestor-invalidation").config.title).toBe(
    ":has() ancestor invalidation",
  );
  expect(() => findCase("cases", "missing")).toThrow(/Unknown case "missing"/);
});
