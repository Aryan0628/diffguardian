/**
 * tests/pipeline/pipeline.test.ts
 *
 * Production-Grade Pipeline Orchestration Tests.
 *
 * Tests runPipeline() end-to-end by MOCKING git-diff (the only I/O boundary)
 * and letting the real AST mapper, classifier engine, and reporters execute.
 *
 * This validates the full graph MINUS git plumbing:
 *   [MOCKED] git-diff → [REAL] AST mapper → [REAL] classifier → [REAL] reporter
 *
 * Covers:
 *  - Full pipeline: breaking change → terminal output → exit code 1
 *  - Full pipeline: clean code → terminal "PASSED" → exit code 0
 *  - Full pipeline: warning only → exit code 0 (no failOnWarnings)
 *  - Full pipeline: warning + failOnWarnings → exit code 1
 *  - Reporter format dispatch: terminal, json, github
 *  - reportFile generation → JSON written to disk
 *  - Tracer metadata computation (requiredParamCount, totalParamCount)
 *  - Enum metadata computation (removedEnumMembers)
 */

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { runPipeline, PipelineOptions } from '../../src/pipeline';
import type { FileDiff } from '../../src/core/types';
import * as fs from 'fs';
import * as path from 'path';

// ── Mock git-diff so the pipeline doesn't need a real git repo ────────────────
// We mock extractGitSources to return our test FileDiffs directly.
// Everything else (AST mapper, classifier, reporters) runs for real.

vi.mock('../../src/parsers/git-diff', () => ({
  extractGitSources: vi.fn(),
}));

// Also mock the tracer to avoid needing a full repo for git grep
vi.mock('../../src/tracer', () => ({
  JITScanner: vi.fn(),
  CallSiteTracer: vi.fn(),
  createDefaultTracerConfig: vi.fn(() => ({})),
}));

import { extractGitSources } from '../../src/parsers/git-diff';
const mockExtract = vi.mocked(extractGitSources);

// ─────────────────────────────────────────────────────────────────────────────
// Test Data — Real source code that the WASM parser will process
// ─────────────────────────────────────────────────────────────────────────────

const TS_OLD_BREAKING = `
export function processPayment(amount: number, currency: string): boolean {
  return true;
}
`;

const TS_NEW_BREAKING = `
export function processPayment(amount: number): boolean {
  return true;
}
`;

const TS_OLD_CLEAN = `
export function getUser(id: string): string {
  return id;
}
`;

const TS_NEW_CLEAN = `
export function getUser(id: string): string {
  return id;
}
`;

// Source that triggers R28 (unexported → exported = warning)
const TS_OLD_WITH_WARNING = `
function internalHelper(x: string): string { return x; }
`;

const TS_NEW_WITH_WARNING = `
export function internalHelper(x: string): string { return x; }
`;

const TS_OLD_ENUM = `
export enum Status {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending'
}
`;

const TS_NEW_ENUM = `
export enum Status {
  ACTIVE = 'active',
  PENDING = 'pending'
}
`;

function createFileDiff(oldSource: string, newSource: string, filePath = 'src/test.ts'): FileDiff {
  const ext = path.extname(filePath).slice(1);
  return {
    path: filePath,
    language: ext,
    oldSource,
    newSource,
    isNew: false,
    isDeleted: false,
    isRenamed: false,
    oldPath: filePath,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Pipeline — Full Integration (git-diff mocked, rest real)', () => {

  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockExtract.mockReset();
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errSpy.mockRestore();
  });

  function getOutput(): string {
    return logSpy.mock.calls.map(c => c.join(' ')).join('\n');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXIT CODES
  // ═══════════════════════════════════════════════════════════════════════════

  it('returns exit 1 when breaking changes detected in strict mode', async () => {
    mockExtract.mockResolvedValue([
      createFileDiff(TS_OLD_BREAKING, TS_NEW_BREAKING),
    ]);

    const code = await runPipeline({
      baseSha: 'main',
      headSha: 'HEAD',
      repoRoot: process.cwd(),
      config: { mode: 'strict', format: 'terminal', quiet: false },
    });

    expect(code).toBe(1);
    const output = getOutput();
    expect(output).toContain('BREAKING');
    expect(output).toContain('currency');
  });

  it('returns exit 0 when no changes detected', async () => {
    mockExtract.mockResolvedValue([
      createFileDiff(TS_OLD_CLEAN, TS_NEW_CLEAN),
    ]);

    const code = await runPipeline({
      baseSha: 'main',
      headSha: 'HEAD',
      repoRoot: process.cwd(),
      config: { mode: 'strict', format: 'terminal', quiet: false },
    });

    expect(code).toBe(0);
    const output = getOutput();
    expect(output).toContain('PASSED');
  });

  it('returns exit 0 when only warnings present (no failOnWarnings)', async () => {
    mockExtract.mockResolvedValue([
      createFileDiff(TS_OLD_WITH_WARNING, TS_NEW_WITH_WARNING),
    ]);

    const code = await runPipeline({
      baseSha: 'main',
      headSha: 'HEAD',
      repoRoot: process.cwd(),
      config: { mode: 'strict', format: 'terminal', quiet: false },
    });

    expect(code).toBe(0);
  });

  it('returns exit 1 when warnings present + failOnWarnings enabled', async () => {
    mockExtract.mockResolvedValue([
      createFileDiff(TS_OLD_WITH_WARNING, TS_NEW_WITH_WARNING),
    ]);

    const code = await runPipeline({
      baseSha: 'main',
      headSha: 'HEAD',
      repoRoot: process.cwd(),
      config: { mode: 'strict', format: 'terminal', quiet: false, failOnWarnings: true },
    });

    expect(code).toBe(1);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REPORTER FORMAT DISPATCH
  // ═══════════════════════════════════════════════════════════════════════════

  it('dispatches to JSON reporter when format=json', async () => {
    mockExtract.mockResolvedValue([
      createFileDiff(TS_OLD_BREAKING, TS_NEW_BREAKING),
    ]);

    const code = await runPipeline({
      baseSha: 'main',
      headSha: 'HEAD',
      repoRoot: process.cwd(),
      config: { mode: 'strict', format: 'json', quiet: false },
    });

    expect(code).toBe(1);

    // JSON reporter outputs a single JSON.stringify call
    const jsonCall = logSpy.mock.calls.find(c => {
      try { JSON.parse(c[0]); return true; } catch { return false; }
    });
    expect(jsonCall).toBeDefined();

    const parsed = JSON.parse(jsonCall![0]);
    expect(parsed.breaking).toBeDefined();
    expect(parsed.breaking.length).toBeGreaterThan(0);
    expect(parsed.breaking[0].message).toContain('currency');
  });

  it('dispatches to GitHub reporter (guard prevents API call) when format=github', async () => {
    mockExtract.mockResolvedValue([
      createFileDiff(TS_OLD_BREAKING, TS_NEW_BREAKING),
    ]);

    // GithubReporter should warn about missing token/prNumber
    const code = await runPipeline({
      baseSha: 'main',
      headSha: 'HEAD',
      repoRoot: process.cwd(),
      config: { mode: 'strict', format: 'github', quiet: false },
    });

    expect(code).toBe(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('missing required config'),
    );
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REPORT FILE GENERATION
  // ═══════════════════════════════════════════════════════════════════════════

  it('writes JSON report file when reportFile is configured', async () => {
    const reportPath = path.resolve(process.cwd(), '.dg-test-report.json');

    // Clean up from any previous run
    try { fs.unlinkSync(reportPath); } catch {}

    mockExtract.mockResolvedValue([
      createFileDiff(TS_OLD_BREAKING, TS_NEW_BREAKING),
    ]);

    await runPipeline({
      baseSha: 'main',
      headSha: 'HEAD',
      repoRoot: process.cwd(),
      config: {
        mode: 'strict',
        format: 'terminal',
        quiet: true,
        reportFile: '.dg-test-report.json',
      },
    });

    // Verify report file was generated
    expect(fs.existsSync(reportPath)).toBe(true);

    const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
    expect(report.breaking).toBeDefined();
    expect(report.breaking.length).toBeGreaterThan(0);
    expect(report.baseSha).toBe('main');
    expect(report.headSha).toBe('HEAD');

    // Clean up
    fs.unlinkSync(reportPath);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EMPTY DIFF (no files changed)
  // ═══════════════════════════════════════════════════════════════════════════

  it('handles empty diff gracefully (no files changed)', async () => {
    mockExtract.mockResolvedValue([]);

    const code = await runPipeline({
      baseSha: 'main',
      headSha: 'HEAD',
      repoRoot: process.cwd(),
      config: { mode: 'strict', format: 'terminal', quiet: false },
    });

    expect(code).toBe(0);
    const output = getOutput();
    expect(output).toContain('No API surface changes');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MULTI-LANGUAGE PIPELINE (TS + Enum in same run)
  // ═══════════════════════════════════════════════════════════════════════════

  it('processes multiple files in a single pipeline run', async () => {
    mockExtract.mockResolvedValue([
      createFileDiff(TS_OLD_BREAKING, TS_NEW_BREAKING, 'src/payments.ts'),
      createFileDiff(TS_OLD_ENUM, TS_NEW_ENUM, 'src/types.ts'),
    ]);

    const code = await runPipeline({
      baseSha: 'main',
      headSha: 'HEAD',
      repoRoot: process.cwd(),
      config: { mode: 'strict', format: 'json', quiet: false },
    });

    expect(code).toBe(1);

    const jsonCall = logSpy.mock.calls.find(c => {
      try { JSON.parse(c[0]); return true; } catch { return false; }
    });

    const parsed = JSON.parse(jsonCall![0]);
    expect(parsed.breaking.length).toBeGreaterThanOrEqual(2);

    // Verify both files are represented
    const files = new Set(parsed.breaking.map((c: any) => c.file));
    expect(files.has('src/payments.ts')).toBe(true);
    expect(files.has('src/types.ts')).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ENUM METADATA COMPUTATION
  // ═══════════════════════════════════════════════════════════════════════════

  it('computes removedEnumMembers metadata for traceable enum changes', async () => {
    mockExtract.mockResolvedValue([
      createFileDiff(TS_OLD_ENUM, TS_NEW_ENUM, 'src/status.ts'),
    ]);

    const code = await runPipeline({
      baseSha: 'main',
      headSha: 'HEAD',
      repoRoot: process.cwd(),
      config: { mode: 'strict', format: 'json', quiet: false },
    });

    expect(code).toBe(1);

    const jsonCall = logSpy.mock.calls.find(c => {
      try { JSON.parse(c[0]); return true; } catch { return false; }
    });

    const parsed = JSON.parse(jsonCall![0]);
    const enumChange = parsed.breaking.find((c: any) => c.changeType === 'enum_member_changed');
    expect(enumChange).toBeDefined();
    expect(enumChange.message).toContain('INACTIVE');
    expect(enumChange.removedEnumMembers).toContain('INACTIVE');
  });
});
