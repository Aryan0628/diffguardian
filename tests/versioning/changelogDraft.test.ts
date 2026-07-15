/**
 * tests/versioning/changelogDraft.test.ts
 *
 * Covers issue #34's changelog acceptance criteria:
 *  - Keep-a-Changelog-style grouped output (Breaking Changes / Deprecated / Added / Fixed)
 *  - human-readable line items (not raw rule-code dumps as the headline)
 *  - rule IDs still present, but parenthetically, for traceability
 *  - empty input produces a clear "nothing to report" draft rather than empty headers
 */

import { describe, it, expect } from 'vitest';
import { generateChangelogDraft } from '../../src/versioning/changelogDraft';
import { FunctionChange } from '../../src/core/types';

function makeChange(overrides: Partial<FunctionChange> = {}): FunctionChange {
  return {
    id: overrides.id || `change-${Math.random()}`,
    file: 'src/api/users.ts',
    name: 'getUser',
    language: 'typescript',
    symbolType: 'function',
    changeType: 'signature_change',
    breaking: false,
    severity: 'safe',
    message: 'Some change',
    ruleId: undefined,
    callers: [],
    lineStart: 1,
    lineEnd: 1,
    before: null,
    after: null,
    ...overrides,
  } as FunctionChange;
}

describe('generateChangelogDraft', () => {
  it('produces a placeholder draft when there are no changes', () => {
    const draft = generateChangelogDraft([]);
    expect(draft.markdown).toContain('No API surface changes');
    expect(draft.entries).toEqual([]);
  });

  it('groups a breaking change under "Breaking Changes"', () => {
    const changes = [
      makeChange({
        severity: 'breaking',
        ruleId: 'R03',
        message: "Removed parameter 'tenant' from getUser()",
      }),
    ];
    const draft = generateChangelogDraft(changes);
    expect(draft.markdown).toContain('### Breaking Changes');
    expect(draft.entries[0].category).toBe('Breaking Changes');
  });

  it('groups a newly added symbol under "Added"', () => {
    const changes = [
      makeChange({ severity: 'safe', changeType: 'symbol_added', ruleId: undefined, name: 'newHelper' }),
    ];
    const draft = generateChangelogDraft(changes);
    expect(draft.markdown).toContain('### Added');
    expect(draft.entries[0].category).toBe('Added');
  });

  it('groups other warning/safe changes under "Fixed"', () => {
    const changes = [
      makeChange({ severity: 'warning', changeType: 'return_type_narrowed', ruleId: 'R07' }),
    ];
    const draft = generateChangelogDraft(changes);
    expect(draft.markdown).toContain('### Fixed');
    expect(draft.entries[0].category).toBe('Fixed');
  });

  it('uses a human-readable message as the line item headline, not the raw rule code', () => {
    const changes = [
      makeChange({
        severity: 'breaking',
        ruleId: 'R03',
        message: "Removed parameter 'tenant' from getUser()",
      }),
    ];
    const draft = generateChangelogDraft(changes);
    const line = draft.markdown.split('\n').find(l => l.startsWith('- '));
    expect(line).toBeDefined();
    // The human message should appear as the primary text...
    expect(line).toContain("Removed parameter 'tenant' from getUser()");
    // ...the rule ID should be present too, but parenthetically, not as the headline.
    expect(line).toMatch(/\(R03\)$/);
    expect(line?.startsWith('- R03:')).toBe(false);
  });

  it('groups multiple changes across categories independently and preserves all entries', () => {
    const changes = [
      makeChange({ id: 'a', severity: 'breaking', ruleId: 'R03', name: 'getUser' }),
      makeChange({ id: 'b', severity: 'safe', changeType: 'symbol_added', name: 'newHelper' }),
      makeChange({ id: 'c', severity: 'warning', ruleId: 'R07', name: 'listUsers' }),
    ];
    const draft = generateChangelogDraft(changes);
    expect(draft.entries).toHaveLength(3);
    const categories = draft.entries.map(e => e.category).sort();
    expect(categories).toEqual(['Added', 'Breaking Changes', 'Fixed']);
  });

  it('omits empty category headers entirely rather than printing them blank', () => {
    const changes = [makeChange({ severity: 'breaking', ruleId: 'R03' })];
    const draft = generateChangelogDraft(changes);
    expect(draft.markdown).not.toContain('### Added');
    expect(draft.markdown).not.toContain('### Deprecated');
    expect(draft.markdown).not.toContain('### Fixed');
  });
});
