export interface PerformanceEntrySupport {
  standard: string[];
  experimentalStandard: string[];
  unsupported: string[];
}

const standardEntries = ["mark", "measure", "paint"];
const experimentalStandardEntries = ["layout-shift", "long-animation-frame", "longtask"];

/**
 * Classifies the harness's known PerformanceObserver entry types against the
 * entry types supported by the current browser.
 */
export function classifyPerformanceEntrySupport(
  supportedEntryTypes: readonly string[],
): PerformanceEntrySupport {
  const supported = new Set(supportedEntryTypes);

  return {
    standard: standardEntries.filter((entry) => supported.has(entry)).sort(),
    experimentalStandard: experimentalStandardEntries
      .filter((entry) => supported.has(entry))
      .sort(),
    unsupported: [...standardEntries, ...experimentalStandardEntries]
      .filter((entry) => !supported.has(entry))
      .sort(),
  };
}
