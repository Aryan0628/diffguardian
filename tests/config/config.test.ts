/**
 * tests/config/config.test.ts
 *
 * Config Loading & Validation Tests.
 *
 * Uses real files on disk in a scratch temp directory (matching the real-fs
 * approach elsewhere in tests/) rather than mocking `fs`, since
 * loadConfig()/saveConfig() are thin, deterministic file wrappers.
 *
 * Covers:
 *  - validateConfig(): valid fields pass through untouched
 *  - validateConfig(): wrong-type known fields are dropped + warned
 *  - validateConfig(): numeric fields fail the positive-integer constraint
 *  - validateConfig(): unknown keys are warned about but don't break the rest
 *  - validateConfig(): non-object top-level values (array/string/null)
 *  - loadConfig(): missing file returns {}
 *  - loadConfig(): malformed JSON warns and returns {} (existing behavior)
 *  - loadConfig(): invalid fields warn and are dropped, valid fields kept
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { loadConfig, saveConfig, validateConfig, CONFIG_FILE } from '../../src/config';

// ── validateConfig() — pure function, no filesystem ─────────────────────────

describe('validateConfig', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('accepts a fully valid config unchanged, no warnings', () => {
    const input = {
      baseBranch: 'main',
      failOnWarnings: true,
      enableTracer: false,
      maxGrepResults: 250,
      maxBarrelDepth: 5,
      maxTracerFiles: 50,
    };

    expect(validateConfig(input)).toEqual(input);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('accepts a partial config with only some fields set', () => {
    expect(validateConfig({ baseBranch: 'develop' })).toEqual({ baseBranch: 'develop' });
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('drops a known field with the wrong type and warns', () => {
    const result = validateConfig({ maxGrepResults: '500' });

    expect(result.maxGrepResults).toBeUndefined();
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('"maxGrepResults"'));
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('must be a number'));
  });

  it('drops a boolean field given a non-boolean value', () => {
    const result = validateConfig({ failOnWarnings: 'true' });

    expect(result.failOnWarnings).toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('"failOnWarnings"'));
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('must be a boolean'));
  });

  it('rejects zero and negative numbers for positive-integer fields', () => {
    const zero = validateConfig({ maxBarrelDepth: 0 });
    expect(zero.maxBarrelDepth).toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('positive integer'));

    vi.clearAllMocks();

    const negative = validateConfig({ maxTracerFiles: -10 });
    expect(negative.maxTracerFiles).toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('positive integer'));
  });

  it('rejects non-integer numbers for positive-integer fields', () => {
    const result = validateConfig({ maxGrepResults: 12.5 });

    expect(result.maxGrepResults).toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('positive integer'));
  });

  it('warns on unknown keys without dropping valid known fields', () => {
    const result = validateConfig({
      baseBranch: 'main',
      basebranch: 'main', // typo of baseBranch
    });

    expect(result).toEqual({ baseBranch: 'main' });
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('unknown key "basebranch"'));
  });

  it('handles multiple simultaneous problems independently', () => {
    const result = validateConfig({
      baseBranch: 'main',
      maxGrepResults: 'not-a-number',
      typoKey: true,
    });

    expect(result).toEqual({ baseBranch: 'main' });
    expect(console.warn).toHaveBeenCalledTimes(2);
  });

  it('warns once and returns {} for a non-object top level', () => {
    for (const bad of [['not', 'an', 'object'], 'just a string', null]) {
      vi.clearAllMocks();
      expect(validateConfig(bad)).toEqual({});
      expect(console.warn).toHaveBeenCalledTimes(1);
    }
  });
});

// ── loadConfig() / saveConfig() — real filesystem, scratch temp dir ────────

describe('loadConfig', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-config-test-'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('returns an empty config when no config file exists', () => {
    expect(loadConfig(tmpDir)).toEqual({});
  });

  it('loads a fully valid config file', () => {
    fs.writeFileSync(path.join(tmpDir, CONFIG_FILE), JSON.stringify({ baseBranch: 'develop', maxGrepResults: 100 }));

    expect(loadConfig(tmpDir)).toEqual({ baseBranch: 'develop', maxGrepResults: 100 });
  });

  it('warns and returns {} on malformed JSON (existing behavior preserved)', () => {
    fs.writeFileSync(path.join(tmpDir, CONFIG_FILE), '{ not valid json');

    const result = loadConfig(tmpDir);

    expect(result).toEqual({});
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to parse'));
  });

  it('drops invalid fields, keeps valid ones, and warns per problem', () => {
    fs.writeFileSync(
      path.join(tmpDir, CONFIG_FILE),
      JSON.stringify({ baseBranch: 'main', maxGrepResults: 'five-hundred' })
    );

    const result = loadConfig(tmpDir);

    expect(result).toEqual({ baseBranch: 'main' });
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('"maxGrepResults"'));
  });

  it('round-trips through saveConfig without warnings', () => {
    saveConfig({ baseBranch: 'main', maxTracerFiles: 75 }, tmpDir);

    const result = loadConfig(tmpDir);

    expect(result).toEqual({ baseBranch: 'main', maxTracerFiles: 75 });
    expect(console.warn).not.toHaveBeenCalled();
  });
});

// ── versioningOverrides (issue #34) ─────────────────────────────────────────

describe('validateConfig — versioningOverrides', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('accepts a valid rule-ID → bump map', () => {
    const result = validateConfig({ versioningOverrides: { R23: 'major', R10: 'patch' } });
    expect(result.versioningOverrides).toEqual({ R23: 'major', R10: 'patch' });
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('drops entries with a non-rule-ID key and warns, keeping valid entries', () => {
    const result = validateConfig({ versioningOverrides: { R23: 'major', notARule: 'minor' } });
    expect(result.versioningOverrides).toEqual({ R23: 'major' });
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('notARule'));
  });

  it('drops entries with an invalid bump value and warns, keeping valid entries', () => {
    const result = validateConfig({ versioningOverrides: { R23: 'huge', R10: 'patch' } });
    expect(result.versioningOverrides).toEqual({ R10: 'patch' });
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('R23'));
  });

  it('ignores the whole field (with a warning) if it is not an object', () => {
    const result = validateConfig({ versioningOverrides: 'major' as any });
    expect(result.versioningOverrides).toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('versioningOverrides'));
  });

  it('ignores the whole field if it is an array', () => {
    const result = validateConfig({ versioningOverrides: ['major'] as any });
    expect(result.versioningOverrides).toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('an array'));
  });

  it('omits versioningOverrides entirely when every entry is invalid', () => {
    const result = validateConfig({ versioningOverrides: { notARule: 'huge' } as any });
    expect(result.versioningOverrides).toBeUndefined();
  });

  it('does not flag versioningOverrides itself as an unknown key', () => {
    const result = validateConfig({ versioningOverrides: { R23: 'major' } });
    const unknownKeyWarning = (console.warn as any).mock.calls.find((call: any[]) =>
      String(call[0]).includes('unknown key')
    );
    expect(unknownKeyWarning).toBeUndefined();
  });
});
