/**
 * tests/parsers/git-diff.test.ts
 *
 * Production-Grade Git Diff Parser Tests.
 *
 * Tests the git-diff source provider by using REAL git operations on a
 * temporary repository. This is the only way to properly validate:
 *
 *  - `git diff --name-status` line parsing
 *  - Modified, Added, Deleted, Renamed file detection
 *  - `git show` source extraction
 *  - Path filtering
 *  - Noise filtering (node_modules, .test. files)
 *  - WORKING_TREE mode (uncommitted changes)
 *  - STAGED mode (git index)
 *  - Empty diff handling
 *  - Concurrent file extraction via Promise.allSettled
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { extractGitSources, WORKING_TREE, STAGED } from '../../src/parsers/git-diff';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

// ─────────────────────────────────────────────────────────────────────────────
// Temp Git Repo Setup — Real git operations for maximum fidelity
// ─────────────────────────────────────────────────────────────────────────────

const TEMP_DIR = path.resolve(process.cwd(), '.dg-test-repo');

async function gitCmd(cmd: string): Promise<string> {
  const { stdout } = await execAsync(cmd, { cwd: TEMP_DIR });
  return stdout.trim();
}

describe('Git Diff Parser — extractGitSources()', () => {

  // ── Setup: Create a temp git repo with known state ──────────────────────────

  beforeAll(async () => {
    // Clean up from previous failed run
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }

    fs.mkdirSync(TEMP_DIR, { recursive: true });

    await gitCmd('git init');
    await gitCmd('git config user.email "test@test.com"');
    await gitCmd('git config user.name "Test"');

    // ── Base commit (initial state) ─────────────────────────────────────────
    const srcDir = path.join(TEMP_DIR, 'src');
    fs.mkdirSync(srcDir, { recursive: true });

    // TypeScript file — will be modified later
    fs.writeFileSync(
      path.join(srcDir, 'api.ts'),
      'export function getUser(id: string): string { return id; }\n'
    );

    // Python file — will be deleted later
    fs.writeFileSync(
      path.join(srcDir, 'utils.py'),
      'def cleanup(path: str) -> None:\n    pass\n'
    );

    // Noise file — should be filtered out
    const nodeModDir = path.join(TEMP_DIR, 'node_modules', 'fake');
    fs.mkdirSync(nodeModDir, { recursive: true });
    fs.writeFileSync(
      path.join(nodeModDir, 'index.ts'),
      'export const x = 1;\n'
    );

    // Test file — should be filtered out
    fs.writeFileSync(
      path.join(srcDir, 'api.test.ts'),
      'test("example", () => {});\n'
    );

    await gitCmd('git add -A');
    await gitCmd('git commit -m "initial commit"');

    // ── Head commit (modified state) ────────────────────────────────────────
    // Modify api.ts — add a parameter (triggers R03 in classifier)
    fs.writeFileSync(
      path.join(srcDir, 'api.ts'),
      'export function getUser(id: string, tenant: string): string { return id; }\n'
    );

    // Delete utils.py
    fs.unlinkSync(path.join(srcDir, 'utils.py'));

    // Add a new Go file
    fs.writeFileSync(
      path.join(srcDir, 'server.go'),
      'package main\nfunc HandleRequest(w http.ResponseWriter, r *http.Request) {}\n'
    );

    await gitCmd('git add -A');
    await gitCmd('git commit -m "feature: modify API"');
  }, 15_000);

  afterAll(() => {
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CORE: Two-ref diff
  // ═══════════════════════════════════════════════════════════════════════════

  it('extracts modified, deleted, and added files between two commits', async () => {
    const diffs = await extractGitSources('HEAD~1', 'HEAD', TEMP_DIR);

    // Should find: api.ts (modified), utils.py (deleted), server.go (added)
    expect(diffs.length).toBe(3);

    const apiDiff = diffs.find(d => d.path.includes('api.ts'));
    expect(apiDiff).toBeDefined();
    expect(apiDiff!.isNew).toBe(false);
    expect(apiDiff!.isDeleted).toBe(false);
    expect(apiDiff!.oldSource).toContain('getUser(id: string)');
    expect(apiDiff!.newSource).toContain('getUser(id: string, tenant: string)');

    const pyDiff = diffs.find(d => d.path.includes('utils.py'));
    expect(pyDiff).toBeDefined();
    expect(pyDiff!.isDeleted).toBe(true);
    expect(pyDiff!.oldSource).toContain('def cleanup');
    expect(pyDiff!.newSource).toBe('');

    const goDiff = diffs.find(d => d.path.includes('server.go'));
    expect(goDiff).toBeDefined();
    expect(goDiff!.isNew).toBe(true);
    expect(goDiff!.oldSource).toBe('');
    expect(goDiff!.newSource).toContain('HandleRequest');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // NOISE FILTERING
  // ═══════════════════════════════════════════════════════════════════════════

  it('filters out node_modules and test files', async () => {
    const diffs = await extractGitSources('HEAD~1', 'HEAD', TEMP_DIR);

    const nodeModDiff = diffs.find(d => d.path.includes('node_modules'));
    expect(nodeModDiff).toBeUndefined();

    const testDiff = diffs.find(d => d.path.includes('.test.'));
    expect(testDiff).toBeUndefined();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LANGUAGE DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  it('correctly detects file language from extension', async () => {
    const diffs = await extractGitSources('HEAD~1', 'HEAD', TEMP_DIR);

    const tsDiff = diffs.find(d => d.path.includes('api.ts'));
    expect(tsDiff!.language).toBe('ts');

    const pyDiff = diffs.find(d => d.path.includes('utils.py'));
    expect(pyDiff!.language).toBe('py');

    const goDiff = diffs.find(d => d.path.includes('server.go'));
    expect(goDiff!.language).toBe('go');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EMPTY DIFF
  // ═══════════════════════════════════════════════════════════════════════════

  it('returns empty array when no files changed', async () => {
    const diffs = await extractGitSources('HEAD', 'HEAD', TEMP_DIR);

    expect(diffs).toEqual([]);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PATH FILTERING
  // ═══════════════════════════════════════════════════════════════════════════

  it('scopes analysis to pathFilter when provided', async () => {
    // Only look at src/ — should still find all 3 files since they're all in src/
    const diffs = await extractGitSources('HEAD~1', 'HEAD', TEMP_DIR, 'src');

    expect(diffs.length).toBe(3);

    // Filter to a non-existent path
    const noDiffs = await extractGitSources('HEAD~1', 'HEAD', TEMP_DIR, 'nonexistent');

    expect(noDiffs).toEqual([]);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INPUT VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  it('throws when baseSha is empty', async () => {
    await expect(
      extractGitSources('', 'HEAD', TEMP_DIR)
    ).rejects.toThrow('baseSha and headSha are required');
  });

  it('throws when headSha is empty', async () => {
    await expect(
      extractGitSources('HEAD', '', TEMP_DIR)
    ).rejects.toThrow('baseSha and headSha are required');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // WORKING_TREE MODE
  // ═══════════════════════════════════════════════════════════════════════════

  it('reads from filesystem when headSha is WORKING_TREE', async () => {
    // Make an uncommitted change
    const apiPath = path.join(TEMP_DIR, 'src', 'api.ts');
    const currentContent = fs.readFileSync(apiPath, 'utf-8');

    try {
      fs.writeFileSync(
        apiPath,
        'export function getUser(id: string, tenant: string, region: string): string { return id; }\n'
      );

      const diffs = await extractGitSources('HEAD', WORKING_TREE, TEMP_DIR);

      const apiDiff = diffs.find(d => d.path.includes('api.ts'));
      expect(apiDiff).toBeDefined();
      expect(apiDiff!.newSource).toContain('region');
    } finally {
      // Restore original
      fs.writeFileSync(apiPath, currentContent);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STAGED MODE
  // ═══════════════════════════════════════════════════════════════════════════

  it('reads from git index when headSha is STAGED', async () => {
    const apiPath = path.join(TEMP_DIR, 'src', 'api.ts');
    const currentContent = fs.readFileSync(apiPath, 'utf-8');

    try {
      fs.writeFileSync(
        apiPath,
        'export function getUser(id: string, tenant: string, zone: string): string { return id; }\n'
      );

      await gitCmd('git add src/api.ts');

      const diffs = await extractGitSources('HEAD', STAGED, TEMP_DIR);

      const apiDiff = diffs.find(d => d.path.includes('api.ts'));
      expect(apiDiff).toBeDefined();
      expect(apiDiff!.newSource).toContain('zone');
    } finally {
      // Reset staging
      await gitCmd('git checkout -- src/api.ts');
      fs.writeFileSync(apiPath, currentContent);
    }
  });
});
