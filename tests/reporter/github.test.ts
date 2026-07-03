/**
 * tests/reporter/github.test.ts
 *
 * GitHub Reporter Tests — validates PR comment generation and API flow.
 *
 * Uses a mocked `fetch` to verify:
 *   - Markdown body structure (headings, tables, call-site details)
 *   - Comment upsert logic (create new vs update existing)
 *   - Missing config guards (token, prNumber, repoSlug)
 *   - Null/empty result handling
 *   - Error isolation (API failure doesn't crash pipeline)
 *   - Sanitization of pipe characters in table cells
 *   - SHA abbreviation logic
 *   - Strict mode vs advisory mode footer
 *   - Warning rendering
 *   - Call-site detail blocks (broken, fixed, indeterminate)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GithubReporter } from '../../src/reporter/github';
import type { ReporterConfig } from '../../src/reporter/types';
import type { AnalysisResult, FunctionChange, CallSite } from '../../src/core/types';

// ─────────────────────────────────────────────────────────────────────────────
// Test helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeConfig(overrides?: Partial<ReporterConfig>): ReporterConfig {
  return {
    mode: 'strict',
    format: 'github',
    quiet: false,
    githubToken: 'ghp_test_token_123',
    prNumber: 42,
    repoSlug: 'org/repo',
    ...overrides,
  };
}

function makeResult(overrides?: Partial<AnalysisResult>): AnalysisResult {
  return {
    breaking: [],
    warnings: [],
    apiChanges: [],
    baseSha: 'abc123def456abc123def456abc123def456abc1',
    headSha: 'def456abc123def456abc123def456abc123def4',
    ...overrides,
  };
}

function makeBreakingChange(overrides?: Partial<FunctionChange>): FunctionChange {
  return {
    id: 'src/api.ts:getUser:10',
    name: 'getUser',
    file: 'src/api.ts',
    lineStart: 10,
    severity: 'breaking',
    changeType: 'required_param_added',
    message: 'New required parameter added',
    ...overrides,
  };
}

function makeCallSite(overrides?: Partial<CallSite>): CallSite {
  return {
    file: 'src/consumer.ts',
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

// ─────────────────────────────────────────────────────────────────────────────
// Mock fetch
// ─────────────────────────────────────────────────────────────────────────────

let fetchMock: ReturnType<typeof vi.fn>;
let capturedBodies: string[] = [];

beforeEach(() => {
  capturedBodies = [];

  fetchMock = vi.fn().mockImplementation(async (url: string, opts?: any) => {
    if (opts?.body) {
      capturedBodies.push(opts.body);
    }

    // LIST comments — return empty array (no existing comment)
    if (url.includes('?per_page')) {
      return { ok: true, json: async () => [] };
    }

    // CREATE comment
    if (opts?.method === 'POST') {
      return { ok: true, json: async () => ({ id: 999 }) };
    }

    // PATCH comment
    if (opts?.method === 'PATCH') {
      return { ok: true, json: async () => ({ id: 1 }) };
    }

    return { ok: true, json: async () => ({}) };
  });

  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('GitHub Reporter — PR Comment Generation & API', () => {

  // ═══════════════════════════════════════════════════════════════════════════
  // Guard tests
  // ═══════════════════════════════════════════════════════════════════════════

  it('does not call fetch when githubToken is missing', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await GithubReporter.render(makeResult(), makeConfig({ githubToken: undefined }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(spy.mock.calls.flat().join()).toContain('MISSING');
    spy.mockRestore();
  });

  it('does not call fetch when prNumber is missing', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await GithubReporter.render(makeResult(), makeConfig({ prNumber: undefined }));

    expect(fetchMock).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('does not call fetch when repoSlug is missing', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await GithubReporter.render(makeResult(), makeConfig({ repoSlug: undefined }));

    expect(fetchMock).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('handles null result gracefully', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await GithubReporter.render(null as any, makeConfig());

    expect(fetchMock).not.toHaveBeenCalled();
    expect(spy.mock.calls.flat().join()).toContain('null result');
    spy.mockRestore();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // API flow — create new comment
  // ═══════════════════════════════════════════════════════════════════════════

  it('creates a new PR comment when none exists', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await GithubReporter.render(makeResult(), makeConfig());

    // First call = LIST, second call = POST
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const postCall = fetchMock.mock.calls[1];
    expect(postCall[1].method).toBe('POST');
    expect(postCall[0]).toContain('/repos/org/repo/issues/42/comments');

    spy.mockRestore();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // API flow — update existing comment
  // ═══════════════════════════════════════════════════════════════════════════

  it('updates existing comment when marker is found', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Return an existing comment with the DG marker
    fetchMock.mockImplementation(async (url: string, opts?: any) => {
      if (opts?.body) capturedBodies.push(opts.body);

      if (url.includes('?per_page')) {
        return {
          ok: true,
          json: async () => [
            { id: 777, url: 'https://api.github.com/repos/org/repo/issues/comments/777', body: '<!-- dg-report -->\nold content' },
          ],
        };
      }
      if (opts?.method === 'PATCH') {
        return { ok: true, json: async () => ({ id: 777 }) };
      }
      return { ok: true, json: async () => ({}) };
    });

    await GithubReporter.render(makeResult(), makeConfig());

    // Should PATCH, not POST
    const patchCall = fetchMock.mock.calls.find(c => c[1]?.method === 'PATCH');
    expect(patchCall).toBeDefined();
    expect(patchCall![0]).toContain('comments/777');

    spy.mockRestore();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Markdown body content — breaking changes
  // ═══════════════════════════════════════════════════════════════════════════

  it('generates markdown with breaking change table', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const change = makeBreakingChange();
    const result = makeResult({
      breaking: [change],
      apiChanges: [change],
    });

    await GithubReporter.render(result, makeConfig());

    const body = JSON.parse(capturedBodies[0]).body;
    expect(body).toContain('<!-- dg-report -->');
    expect(body).toContain('[BREAKING] Changes (1)');
    expect(body).toContain('getUser');
    expect(body).toContain('required_param_added');
    expect(body).toContain('[STRICT MODE]');

    spy.mockRestore();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Markdown body — safe (no breaking)
  // ═══════════════════════════════════════════════════════════════════════════

  it('generates SAFE heading when no breaking changes', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await GithubReporter.render(makeResult(), makeConfig());

    const body = JSON.parse(capturedBodies[0]).body;
    expect(body).toContain('[SAFE] No Breaking API Changes');
    expect(body).toContain('[PASSED]');
    expect(body).not.toContain('[STRICT MODE]');

    spy.mockRestore();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Markdown body — warnings
  // ═══════════════════════════════════════════════════════════════════════════

  it('renders warning changes in markdown', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const warning: FunctionChange = makeBreakingChange({
      severity: 'warning',
      changeType: 'default_value_changed',
      message: 'Default value changed from 3 to 1',
    });

    await GithubReporter.render(
      makeResult({ warnings: [warning], apiChanges: [warning] }),
      makeConfig(),
    );

    const body = JSON.parse(capturedBodies[0]).body;
    expect(body).toContain('[WARNING] Non-Breaking Issues (1)');
    expect(body).toContain('default_value_changed');

    spy.mockRestore();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Call-site details in markdown
  // ═══════════════════════════════════════════════════════════════════════════

  it('renders call-site details for breaking changes with callers', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const change = makeBreakingChange({
      callers: [
        makeCallSite({ isBroken: true, argumentCount: 1 }),
        makeCallSite({ isBroken: false, isFixed: true, file: 'src/fixed.ts', argumentCount: 2 }),
        makeCallSite({ isBroken: false, isIndeterminate: true, file: 'src/spread.ts' }),
        makeCallSite({ isBroken: false, isFixed: false, isIndeterminate: false, file: 'src/ok.ts', argumentCount: 2 }),
      ],
      requiredParamCount: 2,
      totalParamCount: 2,
    });

    await GithubReporter.render(
      makeResult({ breaking: [change], apiChanges: [change] }),
      makeConfig(),
    );

    const body = JSON.parse(capturedBodies[0]).body;
    expect(body).toContain('Affected Call Sites');
    expect(body).toContain('❌');        // broken
    expect(body).toContain('✅');        // fixed
    expect(body).toContain('⚠️');       // indeterminate
    expect(body).toContain('correct arguments'); // ok count

    spy.mockRestore();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SHA abbreviation
  // ═══════════════════════════════════════════════════════════════════════════

  it('abbreviates long SHAs to 7 chars in footer', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await GithubReporter.render(makeResult(), makeConfig());

    const body = JSON.parse(capturedBodies[0]).body;
    expect(body).toContain('abc123d'); // first 7 of baseSha
    expect(body).toContain('def456a'); // first 7 of headSha

    spy.mockRestore();
  });

  it('does not truncate short branch names', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await GithubReporter.render(
      makeResult({ baseSha: 'main', headSha: 'HEAD' }),
      makeConfig(),
    );

    const body = JSON.parse(capturedBodies[0]).body;
    expect(body).toContain('main');
    expect(body).toContain('HEAD');

    spy.mockRestore();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Pipe sanitization
  // ═══════════════════════════════════════════════════════════════════════════

  it('sanitizes pipe characters in table cells', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const change = makeBreakingChange({
      message: 'Type changed from string | number to string',
    });

    await GithubReporter.render(
      makeResult({ breaking: [change], apiChanges: [change] }),
      makeConfig(),
    );

    const body = JSON.parse(capturedBodies[0]).body;
    // Pipe should be escaped
    expect(body).not.toMatch(/string \| number/);
    expect(body).toContain('string \\| number');

    spy.mockRestore();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // API error isolation
  // ═══════════════════════════════════════════════════════════════════════════

  it('does not throw when GitHub API returns an error', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    fetchMock.mockImplementation(async () => ({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    }));

    // Should NOT throw — reporter swallows API errors
    await expect(
      GithubReporter.render(makeResult(), makeConfig()),
    ).resolves.toBeUndefined();

    expect(spy.mock.calls.flat().join()).toContain('Failed to post PR comment');
    spy.mockRestore();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Auth header
  // ═══════════════════════════════════════════════════════════════════════════

  it('sends Authorization header with token', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await GithubReporter.render(makeResult(), makeConfig());

    const listCall = fetchMock.mock.calls[0];
    expect(listCall[1].headers.Authorization).toBe('token ghp_test_token_123');

    spy.mockRestore();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Advisory mode footer
  // ═══════════════════════════════════════════════════════════════════════════

  it('does not show STRICT MODE footer in advisory mode', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const change = makeBreakingChange();
    await GithubReporter.render(
      makeResult({ breaking: [change], apiChanges: [change] }),
      makeConfig({ mode: 'warn' }),
    );

    const body = JSON.parse(capturedBodies[0]).body;
    expect(body).not.toContain('[STRICT MODE]');
    expect(body).toContain('advisory');

    spy.mockRestore();
  });
});
