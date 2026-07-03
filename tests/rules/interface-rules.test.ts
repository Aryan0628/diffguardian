/**
 * tests/rules/interface-rules.test.ts
 *
 * Phase 1: Pure Rule Unit Tests — Interface Rules R25, R26.
 *
 * These tests invoke rule.check() directly with mock InterfaceSignature objects.
 * NO AST parser is involved. Each describe block follows the 4-case contract:
 *   1. True Positive (Breaking/Safe)
 *   2. True Positive (Safe/Warning — if applicable)
 *   3. False Positive (Noise Reduction — must return null)
 *   4. Edge Case (missing fields, empty arrays — must not throw)
 */

import { describe, it, expect } from 'vitest';
import { mockInterfaceSig, mockProperty, asArray } from '../setup';

import { interfacePropertyRequiredRule } from '../../src/classifier/rules/R25_interface_property_required';
import { interfacePropertyRemovedRule }  from '../../src/classifier/rules/R26_interface_property_removed';

// ═══════════════════════════════════════════════════════════════════════════════
// R25: Interface Property Made Required / Added
// ═══════════════════════════════════════════════════════════════════════════════

describe('R25 — interfacePropertyRequiredRule', () => {

  it('✅ True Positive: flags when a completely new required property is added', () => {
    const oldSig = mockInterfaceSig({
      properties: [mockProperty({ name: 'name', type: 'string' })],
    });
    const newSig = mockInterfaceSig({
      properties: [
        mockProperty({ name: 'name', type: 'string' }),
        mockProperty({ name: 'age', type: 'number', optional: false }),
      ],
    });

    const result = interfacePropertyRequiredRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    const results = asArray(result);
    expect(results[0].severity).toBe('breaking');
    expect(results[0].changeType).toBe('interface_property_added');
    expect(results[0].message).toContain('age');
    expect(results[0].message).toContain('new required property');
  });

  it('✅ True Positive: flags when an existing optional property is made required', () => {
    const oldSig = mockInterfaceSig({
      properties: [mockProperty({ name: 'email', type: 'string', optional: true })],
    });
    const newSig = mockInterfaceSig({
      properties: [mockProperty({ name: 'email', type: 'string', optional: false })],
    });

    const result = interfacePropertyRequiredRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    const results = asArray(result);
    expect(results[0].severity).toBe('breaking');
    expect(results[0].changeType).toBe('interface_property_added');
    expect(results[0].message).toContain('email');
    expect(results[0].message).toContain('made required');
  });

  it('🚫 False Positive: identical interfaces must return null', () => {
    const sig = mockInterfaceSig({
      properties: [mockProperty({ name: 'id', optional: false })],
    });

    const result = interfacePropertyRequiredRule.check(sig, sig);

    expect(result).toBeNull();
  });

  it('🚫 False Positive: new optional property added must return null', () => {
    const oldSig = mockInterfaceSig({
      properties: [mockProperty({ name: 'id' })],
    });
    const newSig = mockInterfaceSig({
      properties: [
        mockProperty({ name: 'id' }),
        mockProperty({ name: 'description', optional: true }),
      ],
    });

    const result = interfacePropertyRequiredRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });

  it('🔲 Edge Case: both interfaces have empty properties', () => {
    const oldSig = mockInterfaceSig({ properties: [] });
    const newSig = mockInterfaceSig({ properties: [] });

    const result = interfacePropertyRequiredRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// R26: Interface Property Removed Entirely
// ═══════════════════════════════════════════════════════════════════════════════

describe('R26 — interfacePropertyRemovedRule', () => {

  it('✅ True Positive: flags when a required property is removed', () => {
    const oldSig = mockInterfaceSig({
      properties: [
        mockProperty({ name: 'id', optional: false }),
        mockProperty({ name: 'name', optional: false }),
      ],
    });
    const newSig = mockInterfaceSig({
      properties: [mockProperty({ name: 'id' })],
    });

    const result = interfacePropertyRemovedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    const results = asArray(result);
    expect(results[0].severity).toBe('breaking');
    expect(results[0].changeType).toBe('interface_property_removed');
    expect(results[0].message).toContain('name');
    expect(results[0].message).toContain('required property');
  });

  it('✅ True Positive: flags when an optional property is removed', () => {
    const oldSig = mockInterfaceSig({
      properties: [mockProperty({ name: 'bio', optional: true })],
    });
    const newSig = mockInterfaceSig({ properties: [] });

    const result = interfacePropertyRemovedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    const results = asArray(result);
    expect(results[0].severity).toBe('breaking');
    expect(results[0].changeType).toBe('interface_property_removed');
    expect(results[0].message).toContain('bio');
    expect(results[0].message).toContain('optional property');
  });

  it('🚫 False Positive: identical properties must return null', () => {
    const sig = mockInterfaceSig({
      properties: [mockProperty({ name: 'id' })],
    });

    const result = interfacePropertyRemovedRule.check(sig, sig);

    expect(result).toBeNull();
  });

  it('🚫 False Positive: new property added is not removal (R25 handles addition)', () => {
    const oldSig = mockInterfaceSig({ properties: [] });
    const newSig = mockInterfaceSig({
      properties: [mockProperty({ name: 'id' })],
    });

    const result = interfacePropertyRemovedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });

  it('🔲 Edge Case: both interfaces empty properties array', () => {
    const oldSig = mockInterfaceSig({ properties: [] });
    const newSig = mockInterfaceSig({ properties: [] });

    const result = interfacePropertyRemovedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });
});
