/**
 * tests/rules/type-alias-rules.test.ts
 *
 * Phase 1: Pure Rule Unit Tests — Type Alias Rules R29.
 *
 * These tests invoke rule.check() directly with mock TypeAliasSignature
 * objects. NO AST parser is involved. Each describe block follows the
 * 4-case contract: True Positive / Safe Expansion / False Positive / Edge Case.
 */

import { describe, it, expect } from 'vitest';
import { mockTypeAliasSig, asArray } from '../setup';

import { unionLiteralRemovedRule } from '../../src/classifier/rules/R29_union_literal_removed';

describe('R29 — unionLiteralRemovedRule', () => {

  it('✅ True Positive: flags when a string literal union loses a member', () => {
    const oldSig = mockTypeAliasSig({ value: "'active' | 'inactive' | 'pending'" });
    const newSig = mockTypeAliasSig({ value: "'active' | 'pending'" });

    const result = unionLiteralRemovedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    const results = asArray(result);
    expect(results[0].severity).toBe('breaking');
    expect(results[0].changeType).toBe('type_alias_changed');
    expect(results[0].message).toContain("'inactive'");
  });

  it('✅ True Positive: flags when a numeric literal union loses a member', () => {
    const oldSig = mockTypeAliasSig({ value: '1 | 2 | 3' });
    const newSig = mockTypeAliasSig({ value: '1 | 3' });

    const result = unionLiteralRemovedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    const results = asArray(result);
    expect(results[0].severity).toBe('breaking');
    expect(results[0].message).toContain('2');
  });

  it('🚫 Safe Expansion: adding a new literal member is not flagged', () => {
    const oldSig = mockTypeAliasSig({ value: "'active' | 'inactive'" });
    const newSig = mockTypeAliasSig({ value: "'active' | 'inactive' | 'archived'" });

    const result = unionLiteralRemovedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });

  it('🚫 False Positive: identical union values must return null', () => {
    const sig = mockTypeAliasSig({ value: "'a' | 'b'" });

    const result = unionLiteralRemovedRule.check(sig, sig);

    expect(result).toBeNull();
  });

  it('🚫 False Positive: complex (non-literal) type aliases are ignored', () => {
    const oldSig = mockTypeAliasSig({ value: "{ id: string } | { id: number }" });
    const newSig = mockTypeAliasSig({ value: "{ id: string }" });

    const result = unionLiteralRemovedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });

  it('🚫 False Positive: generic types with nested pipes are not split incorrectly', () => {
    const oldSig = mockTypeAliasSig({ value: "Array<'a' | 'b'>" });
    const newSig = mockTypeAliasSig({ value: "Array<'a'>" });

    // Top-level union has one member on each side ("Array<...>"), which is
    // not a literal, so isSimpleLiteralUnion() is false — rule must not fire.
    const result = unionLiteralRemovedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });

  it('🎲 Edge Case: single literal alias renamed (removal + addition at once)', () => {
    const oldSig = mockTypeAliasSig({ value: "'active'" });
    const newSig = mockTypeAliasSig({ value: "'live'" });

    const result = unionLiteralRemovedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    const results = asArray(result);
    expect(results[0].message).toContain("'active'");
  });

  it('🎲 Edge Case: empty union members do not throw', () => {
    const oldSig = mockTypeAliasSig({ value: '' });
    const newSig = mockTypeAliasSig({ value: '' });

    const result = unionLiteralRemovedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });
});
