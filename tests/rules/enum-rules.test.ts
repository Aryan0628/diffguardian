/**
 * tests/rules/enum-rules.test.ts
 *
 * Phase 1: Pure Rule Unit Tests — Enum Rules R27.
 *
 * These tests invoke rule.check() directly with mock EnumSignature objects.
 * NO AST parser is involved. Each describe block follows the 4-case contract:
 *   1. True Positive (Breaking/Safe)
 *   2. True Positive (Safe/Warning — if applicable)
 *   3. False Positive (Noise Reduction — must return null)
 *   4. Edge Case (missing fields, empty arrays — must not throw)
 */

import { describe, it, expect } from 'vitest';
import { mockEnumSig, mockEnumMember, asArray } from '../setup';

import { enumChangedRule } from '../../src/classifier/rules/R27_enum_changed';

// ═══════════════════════════════════════════════════════════════════════════════
// R27: Enum Member Changed
// ═══════════════════════════════════════════════════════════════════════════════

describe('R27 — enumChangedRule', () => {

  it('✅ True Positive: flags when an enum member is removed', () => {
    const oldSig = mockEnumSig({
      members: [
        mockEnumMember({ name: 'Admin', value: '1' }),
        mockEnumMember({ name: 'User', value: '2' }),
      ],
    });
    const newSig = mockEnumSig({
      members: [mockEnumMember({ name: 'Admin', value: '1' })],
    });

    const result = enumChangedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    const results = asArray(result);
    expect(results[0].severity).toBe('breaking');
    expect(results[0].changeType).toBe('enum_member_changed');
    expect(results[0].message).toContain('User');
    expect(results[0].message).toContain('removed or renamed');
  });

  it('✅ True Positive: flags when a member value is re-assigned', () => {
    const oldSig = mockEnumSig({
      members: [mockEnumMember({ name: 'Status', value: '"active"' })],
    });
    const newSig = mockEnumSig({
      members: [mockEnumMember({ name: 'Status', value: '"inactive"' })],
    });

    const result = enumChangedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    const results = asArray(result);
    expect(results[0].severity).toBe('breaking');
    expect(results[0].changeType).toBe('enum_member_changed');
    expect(results[0].message).toContain('Status');
    expect(results[0].message).toContain('"active"');
    expect(results[0].message).toContain('"inactive"');
  });

  it('🚫 False Positive: identical enum members must return null', () => {
    const sig = mockEnumSig({
      members: [mockEnumMember({ name: 'State', value: '10' })],
    });

    const result = enumChangedRule.check(sig, sig);

    expect(result).toBeNull();
  });

  it('🚫 False Positive: completely new member added is safe expansion', () => {
    const oldSig = mockEnumSig({
      members: [mockEnumMember({ name: 'A', value: '1' })],
    });
    const newSig = mockEnumSig({
      members: [
        mockEnumMember({ name: 'A', value: '1' }),
        mockEnumMember({ name: 'B', value: '2' }),
      ],
    });

    const result = enumChangedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });

  it('🔲 Edge Case: implicit values (undefined) that change position are not flagged directly here', () => {
    const oldSig = mockEnumSig({
      members: [mockEnumMember({ name: 'A', value: undefined })],
    });
    const newSig = mockEnumSig({
      members: [mockEnumMember({ name: 'A', value: undefined })],
    });

    const result = enumChangedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });

  it('🔲 Edge Case: both enums have empty members', () => {
    const oldSig = mockEnumSig({ members: [] });
    const newSig = mockEnumSig({ members: [] });

    const result = enumChangedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });
});
