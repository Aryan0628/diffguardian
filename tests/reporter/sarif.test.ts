/**
 * tests/reporter/sarif.test.ts
 *
 * SARIF Reporter Tests — validates SARIF 2.1.0 log generation.
 *
 * Covers:
 *  - Top-level SARIF envelope shape (version, $schema, runs)
 *  - Breaking / warning / safe severity → error / warning / note level mapping
 *  - One rule entry per unique changeType (no duplicates)
 *  - Result locations (artifactLocation.uri, region.startLine)
 *  - Line 0 / missing lineStart → region omitted
 *  - Missing file → falls back to 'unknown' URI
 *  - Missing name/message → falls back to safe defaults
 *  - Zero-change result → valid SARIF log with empty rules/results
 *  - Null result → valid, empty SARIF log (never throws)
 *  - Quiet mode suppression
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SarifReporter } from '../../src/reporter/sarif';
import type { AnalysisResult, FunctionChange } from '../../src/core/types';
import type { ReporterConfig } from '../../src/reporter/types';

// ─────────────────────────────────────────────────────────────────────────────
// Test helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeConfig(overrides?: Partial<ReporterConfig>): ReporterConfig {
  return {
    mode: 'strict',
    format: 'sarif',
    quiet: false,
    ...overrides,
  };
}

function makeResult(overrides?: Partial<AnalysisResult>): AnalysisResult {
  return {
    from: 'main',
    to: 'HEAD',
    baseSha: 'abc1234567890abcdef1234567890abcdef123456',
    headSha: 'def4567890abcdef1234567890abcdef456789ab',
    breaking: [],
    warnings: [],
    apiChanges: [],
    testGaps: [],
    riskFiles: [],
    ...overrides,
  };
}

function makeChange(overrides?: Partial<FunctionChange>): FunctionChange {
  return {
    id: 'src/api/payments.ts:processPayment:42',
    name: 'processPayment',
    file: 'src/api/payments.ts',
    lineStart: 42,
    lineEnd: 50,
    language: 'typescript',
    symbolType: 'function',
    changeType: 'signature_change',
    breaking: true,
    severity: 'breaking',
    message: "Parameter 'currency' was removed.",
    before: null,
    after: null,
    callers: [],
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Capture helper
// ─────────────────────────────────────────────────────────────────────────────

let logSpy: ReturnType<typeof vi.spyOn>;
let errSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  logSpy.mockRestore();
  errSpy.mockRestore();
});

function getSarifOutput(): any {
  const printed = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
  return JSON.parse(printed);
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('SarifReporter', () => {

  it('emits a valid SARIF 2.1.0 envelope', async () => {
    await SarifReporter.render(makeResult(), makeConfig());
    const sarif = getSarifOutput();

    expect(sarif.version).toBe('2.1.0');
    expect(sarif.$schema).toContain('sarif-schema-2.1.0.json');
    expect(Array.isArray(sarif.runs)).toBe(true);
    expect(sarif.runs).toHaveLength(1);
    expect(sarif.runs[0].tool.driver.name).toBe('Diff-Guardian');
  });

  it('maps a breaking change to SARIF level "error"', async () => {
    const change = makeChange({ severity: 'breaking' });
    const result = makeResult({ breaking: [change], apiChanges: [change] });

    await SarifReporter.render(result, makeConfig());
    const sarif = getSarifOutput();

    expect(sarif.runs[0].results).toHaveLength(1);
    expect(sarif.runs[0].results[0].level).toBe('error');
    expect(sarif.runs[0].results[0].ruleId).toBe('signature_change');
  });

  it('maps a warning change to SARIF level "warning"', async () => {
    const change = makeChange({
      severity: 'warning',
      breaking: false,
      changeType: 'default_value_changed',
      message: "Default value for 'retries' changed.",
    });
    const result = makeResult({ warnings: [change], apiChanges: [change] });

    await SarifReporter.render(result, makeConfig());
    const sarif = getSarifOutput();

    expect(sarif.runs[0].results[0].level).toBe('warning');
  });

  it('maps a safe change to SARIF level "note"', async () => {
    const change = makeChange({ severity: 'safe', breaking: false, changeType: 'symbol_added' });
    const result = makeResult({ apiChanges: [change] });

    await SarifReporter.render(result, makeConfig());
    const sarif = getSarifOutput();

    expect(sarif.runs[0].results[0].level).toBe('note');
  });

  it('produces exactly one rule entry per unique changeType', async () => {
    const changeA = makeChange({ id: 'a', changeType: 'signature_change' });
    const changeB = makeChange({ id: 'b', changeType: 'signature_change' });
    const changeC = makeChange({ id: 'c', changeType: 'symbol_deleted', severity: 'breaking' });
    const result = makeResult({ apiChanges: [changeA, changeB, changeC] });

    await SarifReporter.render(result, makeConfig());
    const sarif = getSarifOutput();

    const ruleIds = sarif.runs[0].tool.driver.rules.map((r: any) => r.id);
    expect(ruleIds).toEqual(['signature_change', 'symbol_deleted']);
    expect(sarif.runs[0].results).toHaveLength(3);
  });

  it('sets rule defaultConfiguration to the WORST severity seen for that changeType, not the first', async () => {
    // Same changeType, different severities — 'signature_change' really can be
    // both breaking (R01-R05) and safe (R12 param widened) depending on the
    // specific rule that fired. The safe one is listed FIRST here on purpose,
    // to prove the rule's default level isn't just "whichever came first".
    const safeChange = makeChange({
      id: 'safe-1',
      severity: 'safe',
      breaking: false,
      changeType: 'signature_change',
    });
    const breakingChange = makeChange({
      id: 'breaking-1',
      severity: 'breaking',
      changeType: 'signature_change',
    });
    const result = makeResult({ apiChanges: [safeChange, breakingChange] });

    await SarifReporter.render(result, makeConfig());
    const sarif = getSarifOutput();

    const rule = sarif.runs[0].tool.driver.rules.find((r: any) => r.id === 'signature_change');
    expect(rule.defaultConfiguration.level).toBe('error');

    // Both individual results still carry their own correct level regardless
    // of the shared rule's aggregated default.
    const levels = sarif.runs[0].results.map((r: any) => r.level).sort();
    expect(levels).toEqual(['error', 'note']);
  });

  it('includes file path and line number in the result location', async () => {
    const change = makeChange({ file: 'src/checkout/handler.ts', lineStart: 17 });
    const result = makeResult({ apiChanges: [change] });

    await SarifReporter.render(result, makeConfig());
    const sarif = getSarifOutput();

    const location = sarif.runs[0].results[0].locations[0].physicalLocation;
    expect(location.artifactLocation.uri).toBe('src/checkout/handler.ts');
    expect(location.region.startLine).toBe(17);
  });

  it('omits the region when lineStart is 0', async () => {
    const change = makeChange({ lineStart: 0 });
    const result = makeResult({ apiChanges: [change] });

    await SarifReporter.render(result, makeConfig());
    const sarif = getSarifOutput();

    const location = sarif.runs[0].results[0].locations[0].physicalLocation;
    expect(location.region).toBeUndefined();
  });

  it('falls back to "unknown" when file is empty', async () => {
    const change = makeChange({ file: '' });
    const result = makeResult({ apiChanges: [change] });

    await SarifReporter.render(result, makeConfig());
    const sarif = getSarifOutput();

    expect(sarif.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri).toBe('unknown');
  });

  it('normalizes Windows-style backslashes in file paths', async () => {
    const change = makeChange({ file: 'src\\payments\\processor.ts' });
    const result = makeResult({ apiChanges: [change] });

    await SarifReporter.render(result, makeConfig());
    const sarif = getSarifOutput();

    expect(sarif.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri).toBe('src/payments/processor.ts');
  });

  it('falls back to a generated message when change.message is missing', async () => {
    const change = makeChange({ message: undefined, changeType: 'symbol_deleted' });
    const result = makeResult({ apiChanges: [change] });

    await SarifReporter.render(result, makeConfig());
    const sarif = getSarifOutput();

    expect(sarif.runs[0].results[0].message.text).toContain('processPayment');
    expect(sarif.runs[0].results[0].message.text.toLowerCase()).toContain('removed');
  });

  it('produces a valid, empty SARIF log for zero changes', async () => {
    await SarifReporter.render(makeResult(), makeConfig());
    const sarif = getSarifOutput();

    expect(sarif.runs[0].results).toEqual([]);
    expect(sarif.runs[0].tool.driver.rules).toEqual([]);
  });

  it('never throws on a null result and still emits valid SARIF', async () => {
    await expect(SarifReporter.render(null as any, makeConfig())).resolves.not.toThrow();
    const sarif = getSarifOutput();

    expect(sarif.version).toBe('2.1.0');
    expect(sarif.runs[0].results).toEqual([]);
  });

  it('suppresses all output in quiet mode', async () => {
    await SarifReporter.render(makeResult(), makeConfig({ quiet: true }));
    expect(logSpy).not.toHaveBeenCalled();
  });
});
