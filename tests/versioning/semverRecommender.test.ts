/**
 * tests/versioning/semverRecommender.test.ts
 *
 * Covers issue #34's semver recommendation acceptance criteria:
 *  - breaking → major, warning-only → minor, safe-only → patch
 *  - justification references specific rule IDs
 *  - per-rule overrides take priority over the default severity mapping
 *  - empty change list → patch with a clear "no changes" justification
 *  - only changes matching the overall bump are surfaced as justification
 */

import { describe, it, expect } from 'vitest';
import { recommendVersion } from '../../src/versioning/semverRecommender';
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

describe('recommendVersion', () => {
  it('recommends patch when there are no changes at all', () => {
    const rec = recommendVersion([]);
    expect(rec.bump).toBe('patch');
    expect(rec.justification.length).toBeGreaterThan(0);
    expect(rec.drivingChanges).toEqual([]);
  });

  it('recommends patch when only safe changes are present', () => {
    const changes = [makeChange({ severity: 'safe', ruleId: 'R20' })];
    const rec = recommendVersion(changes);
    expect(rec.bump).toBe('patch');
  });

  it('recommends minor when a warning is present with no breaking changes', () => {
    const changes = [
      makeChange({ severity: 'safe', ruleId: 'R20' }),
      makeChange({ severity: 'warning', ruleId: 'R10', message: 'Optional parameter added' }),
    ];
    const rec = recommendVersion(changes);
    expect(rec.bump).toBe('minor');
  });

  it('recommends major when any breaking change is present, regardless of other changes', () => {
    const changes = [
      makeChange({ severity: 'safe', ruleId: 'R20' }),
      makeChange({ severity: 'warning', ruleId: 'R10' }),
      makeChange({
        severity: 'breaking',
        ruleId: 'R03',
        message: "Parameter 'currency' was removed",
        name: 'getUser',
        file: 'src/api/users.ts',
      }),
    ];
    const rec = recommendVersion(changes);
    expect(rec.bump).toBe('major');
  });

  it('justification references the specific rule ID that drove the decision', () => {
    const changes = [
      makeChange({
        severity: 'breaking',
        ruleId: 'R03',
        message: "Parameter 'currency' was removed",
        name: 'getUser',
        file: 'src/api/users.ts',
      }),
    ];
    const rec = recommendVersion(changes);
    expect(rec.justification[0]).toContain('R03');
    expect(rec.justification[0]).toContain('getUser');
    expect(rec.justification[0]).toContain('src/api/users.ts');
  });

  it('only surfaces driving changes matching the overall bump, not lower-severity ones', () => {
    const changes = [
      makeChange({ id: 'safe-1', severity: 'safe', ruleId: 'R20' }),
      makeChange({
        id: 'breaking-1',
        severity: 'breaking',
        ruleId: 'R03',
        message: 'Removed param',
      }),
    ];
    const rec = recommendVersion(changes);
    expect(rec.drivingChanges).toHaveLength(1);
    expect(rec.drivingChanges[0].changeId).toBe('breaking-1');
  });

  it('applies a per-rule override that upgrades a warning-severity rule to major', () => {
    const changes = [
      makeChange({
        severity: 'warning',
        ruleId: 'R23',
        message: 'Parameter deprecated',
      }),
    ];
    const withoutOverride = recommendVersion(changes);
    expect(withoutOverride.bump).toBe('minor');

    const withOverride = recommendVersion(changes, { R23: 'major' });
    expect(withOverride.bump).toBe('major');
  });

  it('does not apply an override to a change with no ruleId (synthetic changes)', () => {
    const changes = [
      makeChange({ severity: 'safe', ruleId: undefined, changeType: 'symbol_added' }),
    ];
    // Even a maximal override map has nothing to key off without a ruleId.
    const rec = recommendVersion(changes, { R20: 'major' });
    expect(rec.bump).toBe('patch');
  });

  it('an override can also downgrade a rule that would otherwise be breaking-level -- to whatever bump is configured', () => {
    const changes = [
      makeChange({ severity: 'breaking', ruleId: 'R99', message: 'Something' }),
    ];
    const rec = recommendVersion(changes, { R99: 'minor' });
    expect(rec.bump).toBe('minor');
  });
});
