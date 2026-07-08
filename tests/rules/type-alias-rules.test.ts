/**
 * tests/rules/type-alias-rules.test.ts
 *
 * Phase 1: Pure Rule Unit Tests — Type Alias Rules R29.
 *
 * These tests invoke rule.check() directly with mock TypeAliasSignature
 * objects (pre-populated `unionMembers`, exactly as the real parser would
 * produce them). NO AST parser runs here — parser-level extraction is
 * covered separately by the E2E test in tests/e2e/ast-e2e.test.ts.
 * Each describe block follows the 4-case contract: True Positive (Breaking) /
 * Safe (additions) / False Positive (noise reduction) / Edge Case.
 */

import { describe, it, expect } from 'vitest';
import { mockTypeAliasSig, asArray } from '../setup';

import { typeAliasUnionNarrowedRule } from '../../src/classifier/rules/R29_type_alias_union_narrowed';

describe('R29 — typeAliasUnionNarrowedRule', () => {

  it('✅ True Positive: flags when a string literal union loses a member', () => {
    const oldSig = mockTypeAliasSig({ unionMembers: ["'active'", "'inactive'", "'pending'"] });
    const newSig = mockTypeAliasSig({ unionMembers: ["'active'", "'pending'"] });

    const result = typeAliasUnionNarrowedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    const results = asArray(result);
    expect(results[0].severity).toBe('breaking');
    expect(results[0].changeType).toBe('type_alias_changed');
    expect(results[0].message).toContain("'inactive'");
  });

  it('✅ True Positive: flags when a numeric literal union loses a member', () => {
    const oldSig = mockTypeAliasSig({ unionMembers: ['1', '2', '3'] });
    const newSig = mockTypeAliasSig({ unionMembers: ['1', '3'] });

    const result = typeAliasUnionNarrowedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    const results = asArray(result);
    expect(results[0].message).toContain('2');
  });

  it('🚫 Safe Expansion: adding a new literal member is not flagged', () => {
    const oldSig = mockTypeAliasSig({ unionMembers: ["'active'", "'inactive'"] });
    const newSig = mockTypeAliasSig({ unionMembers: ["'active'", "'inactive'", "'archived'"] });

    const result = typeAliasUnionNarrowedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });

  it('🚫 False Positive: identical union members must return null', () => {
    const sig = mockTypeAliasSig({ unionMembers: ["'a'", "'b'"] });

    const result = typeAliasUnionNarrowedRule.check(sig, sig);

    expect(result).toBeNull();
  });

  it('🚫 False Positive: aliases without unionMembers (complex types) are ignored', () => {
    // The parser only populates unionMembers for literal unions — object
    // types, generics, etc. leave it undefined, and the rule must not
    // fall back to inspecting `value` itself.
    const oldSig = mockTypeAliasSig({ value: '{ id: string } | { id: number }', unionMembers: undefined });
    const newSig = mockTypeAliasSig({ value: '{ id: string }', unionMembers: undefined });

    const result = typeAliasUnionNarrowedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });

  it('🎲 Edge Case: single literal alias renamed (removal + addition at once)', () => {
    const oldSig = mockTypeAliasSig({ unionMembers: ["'active'"] });
    const newSig = mockTypeAliasSig({ unionMembers: ["'live'"] });

    const result = typeAliasUnionNarrowedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    const results = asArray(result);
    expect(results[0].message).toContain("'active'");
  });

  it('🎲 Edge Case: empty unionMembers arrays do not throw', () => {
    const oldSig = mockTypeAliasSig({ unionMembers: [] });
    const newSig = mockTypeAliasSig({ unionMembers: [] });

    const result = typeAliasUnionNarrowedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });

  it('🎲 Edge Case: one side has unionMembers, the other does not', () => {
    const oldSig = mockTypeAliasSig({ unionMembers: ["'a'", "'b'"] });
    const newSig = mockTypeAliasSig({ value: 'SomeGeneric<T>', unionMembers: undefined });

    const result = typeAliasUnionNarrowedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });
});
