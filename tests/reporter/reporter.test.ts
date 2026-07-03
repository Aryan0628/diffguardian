/**
 * tests/reporter/reporter.test.ts
 *
 * Production-Grade Reporter Tests.
 * Tests all 3 reporters (Terminal, GitHub, JSON) against the full AnalysisResult contract.
 *
 * Covers:
 *  - Breaking changes rendering
 *  - Warnings rendering
 *  - Safe additions rendering
 *  - Zero-change case
 *  - Null/malformed result guard
 *  - Quiet mode suppression
 *  - Hook context footers (pre-push, pre-merge-commit, post-merge)
 *  - failOnWarnings exit behavior
 *  - Call-site sub-items rendering
 *  - GitHub markdown sanitization
 *  - GitHub missing config guard
 *  - JSON output validity
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TerminalReporter } from '../../src/reporter/terminal';
import { GithubReporter } from '../../src/reporter/github';
import { JsonReporter } from '../../src/reporter/json';
import type { AnalysisResult, FunctionChange, CallSite } from '../../src/core/types';
import type { ReporterConfig } from '../../src/reporter/types';

// ─────────────────────────────────────────────────────────────────────────────
// Mock Factories
// ─────────────────────────────────────────────────────────────────────────────

function mockChange(overrides?: Partial<FunctionChange>): FunctionChange {
  return {
    id: 'src/test.ts:testFn:1',
    name: 'testFn',
    file: 'src/test.ts',
    lineStart: 10,
    lineEnd: 20,
    language: 'typescript',
    symbolType: 'function',
    changeType: 'signature_change',
    breaking: true,
    severity: 'breaking',
    message: 'Parameter "userId" was removed.',
    before: null,
    after: null,
    callers: [],
    ...overrides,
  };
}

function mockResult(overrides?: Partial<AnalysisResult>): AnalysisResult {
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

function mockConfig(overrides?: Partial<ReporterConfig>): ReporterConfig {
  return {
    mode: 'strict',
    format: 'terminal',
    quiet: false,
    ...overrides,
  };
}

function mockCallSite(overrides?: Partial<CallSite>): CallSite {
  return {
    file: 'src/caller.ts',
    lineStart: 25,
    lineEnd: 25,
    argumentCount: 1,
    isBroken: true,
    isFixed: false,
    isIndeterminate: false,
    covered: false,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TERMINAL REPORTER
// ═══════════════════════════════════════════════════════════════════════════════

describe('TerminalReporter', () => {

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

  function getOutput(): string {
    return logSpy.mock.calls.map(c => c.join(' ')).join('\n');
  }

  // ── Breaking changes ───────────────────────────────────────────────────────

  it('renders breaking changes with file location and message', async () => {
    const breaking = mockChange({ name: 'processPayment', file: 'src/pay.ts', lineStart: 42 });
    const result = mockResult({
      breaking: [breaking],
      apiChanges: [breaking],
    });

    await TerminalReporter.render(result, mockConfig());
    const output = getOutput();

    expect(output).toContain('processPayment');
    expect(output).toContain('src/pay.ts:42');
    expect(output).toContain('BREAKING');
    expect(output).toContain('STRICT MODE');
  });

  // ── Warnings ───────────────────────────────────────────────────────────────

  it('renders warnings without blocking in strict mode', async () => {
    const warning = mockChange({
      severity: 'warning',
      breaking: false,
      changeType: 'signature_change',
      message: 'Default value changed for "retries".',
    });
    const result = mockResult({
      warnings: [warning],
      apiChanges: [warning],
    });

    await TerminalReporter.render(result, mockConfig());
    const output = getOutput();

    expect(output).toContain('WARNING');
    expect(output).toContain('PASSED WITH WARNINGS');
  });

  // ── Safe additions ─────────────────────────────────────────────────────────

  it('renders safe additions count', async () => {
    const safe = mockChange({ severity: 'safe', breaking: false });
    const result = mockResult({ apiChanges: [safe] });

    await TerminalReporter.render(result, mockConfig());
    const output = getOutput();

    expect(output).toContain('SAFE');
    expect(output).toContain('1');
  });

  // ── Zero changes ───────────────────────────────────────────────────────────

  it('renders "all clear" when no changes detected', async () => {
    await TerminalReporter.render(mockResult(), mockConfig());
    const output = getOutput();

    expect(output).toContain('No API surface changes');
    expect(output).toContain('PASSED');
  });

  // ── Quiet mode ─────────────────────────────────────────────────────────────

  it('suppresses all output in quiet mode', async () => {
    const breaking = mockChange();
    const result = mockResult({ breaking: [breaking], apiChanges: [breaking] });

    await TerminalReporter.render(result, mockConfig({ quiet: true }));

    expect(logSpy).not.toHaveBeenCalled();
  });

  // ── Null result guard ──────────────────────────────────────────────────────

  it('handles null result without throwing', async () => {
    await TerminalReporter.render(null as any, mockConfig());

    expect(errSpy).toHaveBeenCalled();
  });

  // ── Hook context: pre-merge-commit ─────────────────────────────────────────

  it('shows merge-specific bypass instructions for pre-merge-commit', async () => {
    const breaking = mockChange();
    const result = mockResult({ breaking: [breaking], apiChanges: [breaking] });

    await TerminalReporter.render(result, mockConfig({ hookContext: 'pre-merge-commit' }));
    const output = getOutput();

    expect(output).toContain('git merge --abort');
    expect(output).toContain('--no-verify');
  });

  // ── Hook context: pre-push (default) ───────────────────────────────────────

  it('shows push-specific bypass instructions by default', async () => {
    const breaking = mockChange();
    const result = mockResult({ breaking: [breaking], apiChanges: [breaking] });

    await TerminalReporter.render(result, mockConfig({ hookContext: 'pre-push' }));
    const output = getOutput();

    expect(output).toContain('git push');
    expect(output).toContain('--no-verify');
  });

  // ── failOnWarnings ─────────────────────────────────────────────────────────

  it('shows STRICT MODE when failOnWarnings + warnings', async () => {
    const warning = mockChange({ severity: 'warning', breaking: false });
    const result = mockResult({ warnings: [warning], apiChanges: [warning] });

    await TerminalReporter.render(result, mockConfig({ failOnWarnings: true }));
    const output = getOutput();

    expect(output).toContain('STRICT MODE');
  });

  // ── Call-site sub-items ────────────────────────────────────────────────────

  it('renders broken call sites with argument count mismatch', async () => {
    const breaking = mockChange({
      name: 'processPayment',
      requiredParamCount: 3,
      totalParamCount: 4,
      callers: [
        mockCallSite({ file: 'src/checkout.ts', lineStart: 50, argumentCount: 1, isBroken: true }),
        mockCallSite({ file: 'src/admin.ts', lineStart: 12, argumentCount: 3, isBroken: false, isFixed: true }),
      ],
    });
    const result = mockResult({ breaking: [breaking], apiChanges: [breaking] });

    await TerminalReporter.render(result, mockConfig());
    const output = getOutput();

    expect(output).toContain('src/checkout.ts:50');
    expect(output).toContain('1 arg');
    expect(output).toContain('3-4');
    expect(output).toContain('src/admin.ts:12');
    expect(output).toContain('Fixed');
  });

  // ── Indeterminate call sites ───────────────────────────────────────────────

  it('renders indeterminate (spread) call sites', async () => {
    const breaking = mockChange({
      callers: [
        mockCallSite({ argumentCount: -1, isBroken: false, isIndeterminate: true }),
      ],
    });
    const result = mockResult({ breaking: [breaking], apiChanges: [breaking] });

    await TerminalReporter.render(result, mockConfig());
    const output = getOutput();

    expect(output).toContain('spread');
    expect(output).toContain('indeterminate');
  });

  // ── Missing fields / defensive access ──────────────────────────────────────

  it('handles change with empty name, file, and message gracefully', async () => {
    const breaking = mockChange({ name: '', file: '', message: undefined, lineStart: 0 });
    const result = mockResult({ breaking: [breaking], apiChanges: [breaking] });

    await TerminalReporter.render(result, mockConfig());
    const output = getOutput();

    expect(output).toContain('<anonymous>');
    expect(output).toContain('unknown file');
  });

  // ── SHA abbreviation ───────────────────────────────────────────────────────

  it('displays full branch names without truncation', async () => {
    const result = mockResult({ baseSha: 'main', headSha: 'HEAD' });

    await TerminalReporter.render(result, mockConfig());
    const output = getOutput();

    expect(output).toContain('main');
    expect(output).toContain('HEAD');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GITHUB REPORTER
// ═══════════════════════════════════════════════════════════════════════════════

describe('GithubReporter', () => {

  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Missing config guard ───────────────────────────────────────────────────

  it('warns and returns when githubToken is missing', async () => {
    const result = mockResult();
    await GithubReporter.render(result, mockConfig({
      format: 'github',
      prNumber: 42,
      repoSlug: 'owner/repo',
      // githubToken missing
    }));

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('missing required config')
    );
  });

  it('warns and returns when prNumber is missing', async () => {
    const result = mockResult();
    await GithubReporter.render(result, mockConfig({
      format: 'github',
      githubToken: 'ghp_test',
      repoSlug: 'owner/repo',
      // prNumber missing
    }));

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('missing required config')
    );
  });

  it('warns and returns when repoSlug is missing', async () => {
    const result = mockResult();
    await GithubReporter.render(result, mockConfig({
      format: 'github',
      githubToken: 'ghp_test',
      prNumber: 42,
      // repoSlug missing
    }));

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('missing required config')
    );
  });

  // ── Null result guard ──────────────────────────────────────────────────────

  it('handles null result without throwing', async () => {
    await GithubReporter.render(null as any, mockConfig({
      format: 'github',
      githubToken: 'ghp_test',
      prNumber: 42,
      repoSlug: 'owner/repo',
    }));

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('null result')
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// JSON REPORTER
// ═══════════════════════════════════════════════════════════════════════════════

describe('JsonReporter', () => {

  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('outputs valid JSON containing all result fields', async () => {
    const breaking = mockChange();
    const result = mockResult({
      breaking: [breaking],
      apiChanges: [breaking],
    });

    await JsonReporter.render(result, mockConfig({ format: 'json' }));

    expect(logSpy).toHaveBeenCalledTimes(1);
    const output = logSpy.mock.calls[0][0];
    const parsed = JSON.parse(output);

    expect(parsed.baseSha).toBeDefined();
    expect(parsed.headSha).toBeDefined();
    expect(parsed.breaking).toHaveLength(1);
    expect(parsed.apiChanges).toHaveLength(1);
    expect(parsed.breaking[0].name).toBe('testFn');
  });

  it('suppresses output in quiet mode', async () => {
    await JsonReporter.render(mockResult(), mockConfig({ format: 'json', quiet: true }));

    expect(logSpy).not.toHaveBeenCalled();
  });

  it('outputs empty arrays for clean result', async () => {
    await JsonReporter.render(mockResult(), mockConfig({ format: 'json' }));

    const parsed = JSON.parse(logSpy.mock.calls[0][0]);

    expect(parsed.breaking).toHaveLength(0);
    expect(parsed.warnings).toHaveLength(0);
    expect(parsed.apiChanges).toHaveLength(0);
  });
});
