/**
 * tests/rules/function-rules.test.ts
 *
 * Phase 1: Pure Rule Unit Tests — All Function Rules (R01-R28).
 *
 * These tests invoke rule.check() directly with mock FunctionSignature objects.
 * NO AST parser is involved. Each describe block follows the 4-case contract:
 *   1. True Positive (Breaking/Safe)
 *   2. True Positive (Safe/Warning — if applicable)
 *   3. False Positive (Noise Reduction — must return null)
 *   4. Edge Case (missing fields, empty arrays — must not throw)
 */

import { describe, it, expect } from 'vitest';
import { mockFnSig, mockParam, mockTypeParam, asSingle, asArray } from '../setup';

import { parameterRemovedRule }        from '../../src/classifier/rules/R01_param_removed';
import { parameterReorderedRule }      from '../../src/classifier/rules/R02_param_reordered';
import { requiredParamAddedRule }      from '../../src/classifier/rules/R03_required_param_added';
import { paramTypeNarrowedRule }       from '../../src/classifier/rules/R04_param_type_narrowed';
import { optionalParamAddedRule }      from '../../src/classifier/rules/R05_optional_param_added';
import { returnNullableRule }          from '../../src/classifier/rules/R06_return_nullable';
import { returnNarrowedRule }          from '../../src/classifier/rules/R07_return_narrowed';
import { unexportedRule }              from '../../src/classifier/rules/R08_unexported';
import { syncToAsyncRule }             from '../../src/classifier/rules/R11_sync_to_async';
import { paramTypeWidenedRule }        from '../../src/classifier/rules/R12_param_type_widened';
import { genericConstraintNarrowedRule } from '../../src/classifier/rules/R13_generic_narrowed';
import { restParameterRule }           from '../../src/classifier/rules/R14_rest_parameter';
import { overloadRemovedRule }         from '../../src/classifier/rules/R15_overload_removed';
import { overloadAddedRule }           from '../../src/classifier/rules/R16_overload_added';
import { staticChangedRule }           from '../../src/classifier/rules/R17_static_changed';
import { paramMutabilityNarrowedRule } from '../../src/classifier/rules/R18_param_mutability_narrowed';
import { paramMutabilityWidenedRule }  from '../../src/classifier/rules/R19_param_mutability_widened';
import { visibilityNarrowedRule }      from '../../src/classifier/rules/R20_visibility_narrowed';
import { asyncToSyncRule }             from '../../src/classifier/rules/R21_async_to_sync';
import { returnNeverRule }             from '../../src/classifier/rules/R22_return_never';
import { defaultValueChangedRule }     from '../../src/classifier/rules/R23_default_value_changed';
import { constructorChangedRule }      from '../../src/classifier/rules/R24_constructor_changed';
import { exportedRule }                from '../../src/classifier/rules/R28_exported';

// ═══════════════════════════════════════════════════════════════════════════════
// R01: Parameter Removed
// ═══════════════════════════════════════════════════════════════════════════════

describe('R01 — parameterRemovedRule', () => {

  it('✅ True Positive: flags when a parameter is removed', () => {
    const oldSig = mockFnSig({
      params: [
        mockParam({ name: 'userId', type: 'string' }),
        mockParam({ name: 'role', type: 'string' }),
      ],
    });
    const newSig = mockFnSig({
      params: [
        mockParam({ name: 'userId', type: 'string' }),
      ],
    });

    const result = parameterRemovedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    expect(asSingle(result).severity).toBe('breaking');
    expect(asSingle(result).changeType).toBe('signature_change');
    expect(asSingle(result).message).toContain('role');
  });

  it('🚫 False Positive: identical params must return null', () => {
    const sig = mockFnSig({
      params: [
        mockParam({ name: 'userId', type: 'string' }),
        mockParam({ name: 'role', type: 'string' }),
      ],
    });

    const result = parameterRemovedRule.check(sig, sig);

    expect(result).toBeNull();
  });

  it('🔲 Edge Case: both sides have empty params array', () => {
    const oldSig = mockFnSig({ params: [] });
    const newSig = mockFnSig({ params: [] });

    const result = parameterRemovedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });

  it('🔲 Edge Case: param added (not removed) must be ignored', () => {
    const oldSig = mockFnSig({
      params: [mockParam({ name: 'a' })],
    });
    const newSig = mockFnSig({
      params: [mockParam({ name: 'a' }), mockParam({ name: 'b' })],
    });

    const result = parameterRemovedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// R02: Parameter Reordered
// ═══════════════════════════════════════════════════════════════════════════════

describe('R02 — parameterReorderedRule', () => {

  it('✅ True Positive: flags when parameters swap positions', () => {
    const oldSig = mockFnSig({
      params: [
        mockParam({ name: 'a', type: 'string' }),
        mockParam({ name: 'b', type: 'number' }),
      ],
    });
    const newSig = mockFnSig({
      params: [
        mockParam({ name: 'b', type: 'number' }),
        mockParam({ name: 'a', type: 'string' }),
      ],
    });

    const result = parameterReorderedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    expect(asSingle(result).severity).toBe('breaking');
    expect(asSingle(result).changeType).toBe('signature_change');
    expect(asSingle(result).message).toContain('a');
    expect(asSingle(result).message).toContain('position');
  });

  it('🚫 False Positive: same order must return null', () => {
    const sig = mockFnSig({
      params: [
        mockParam({ name: 'x', type: 'string' }),
        mockParam({ name: 'y', type: 'number' }),
      ],
    });

    const result = parameterReorderedRule.check(sig, sig);

    expect(result).toBeNull();
  });

  it('🔲 Edge Case: single parameter at same position', () => {
    const sig = mockFnSig({
      params: [mockParam({ name: 'only' })],
    });

    const result = parameterReorderedRule.check(sig, sig);

    expect(result).toBeNull();
  });

  it('🔲 Edge Case: removed param skipped gracefully (R01 handles it)', () => {
    const oldSig = mockFnSig({
      params: [
        mockParam({ name: 'a' }),
        mockParam({ name: 'b' }),
      ],
    });
    const newSig = mockFnSig({
      params: [
        mockParam({ name: 'a' }),
      ],
    });

    // 'b' is missing entirely — R02 should skip it (newIndex === -1)
    const result = parameterReorderedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// R03: Required Parameter Added
// ═══════════════════════════════════════════════════════════════════════════════

describe('R03 — requiredParamAddedRule', () => {

  it('✅ True Positive: flags when a new required param is added', () => {
    const oldSig = mockFnSig({
      params: [mockParam({ name: 'userId', type: 'string' })],
    });
    const newSig = mockFnSig({
      params: [
        mockParam({ name: 'userId', type: 'string' }),
        mockParam({ name: 'tenantId', type: 'string', optional: false, hasDefault: false }),
      ],
    });

    const result = requiredParamAddedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    expect(asSingle(result).severity).toBe('breaking');
    expect(asSingle(result).changeType).toBe('signature_change');
    expect(asSingle(result).message).toContain('tenantId');
  });

  it('🚫 False Positive: new optional param must be ignored', () => {
    const oldSig = mockFnSig({
      params: [mockParam({ name: 'userId', type: 'string' })],
    });
    const newSig = mockFnSig({
      params: [
        mockParam({ name: 'userId', type: 'string' }),
        mockParam({ name: 'verbose', type: 'boolean', optional: true }),
      ],
    });

    const result = requiredParamAddedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });

  it('🚫 False Positive: new param with default value must be ignored', () => {
    const oldSig = mockFnSig({ params: [] });
    const newSig = mockFnSig({
      params: [
        mockParam({ name: 'retries', type: 'number', optional: false, hasDefault: true, defaultValue: '3' }),
      ],
    });

    const result = requiredParamAddedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });

  it('🔲 Edge Case: both sides have empty params', () => {
    const oldSig = mockFnSig({ params: [] });
    const newSig = mockFnSig({ params: [] });

    const result = requiredParamAddedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// R04: Parameter Type Narrowed
// ═══════════════════════════════════════════════════════════════════════════════

describe('R04 — paramTypeNarrowedRule', () => {

  it('✅ True Positive: flags any → string narrowing', () => {
    const oldSig = mockFnSig({
      params: [mockParam({ name: 'input', type: 'any' })],
    });
    const newSig = mockFnSig({
      params: [mockParam({ name: 'input', type: 'string' })],
    });

    const result = paramTypeNarrowedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    expect(asSingle(result).severity).toBe('breaking');
    expect(asSingle(result).changeType).toBe('signature_change');
    expect(asSingle(result).message).toContain('input');
    expect(asSingle(result).message).toContain('any');
    expect(asSingle(result).message).toContain('string');
  });

  it('✅ True Positive: flags union narrowing (string | number → string)', () => {
    const oldSig = mockFnSig({
      params: [mockParam({ name: 'value', type: 'string | number' })],
    });
    const newSig = mockFnSig({
      params: [mockParam({ name: 'value', type: 'string' })],
    });

    const result = paramTypeNarrowedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    expect(asSingle(result).severity).toBe('breaking');
    expect(asSingle(result).message).toContain('value');
  });

  it('🚫 False Positive: identical types (formatting difference) must return null', () => {
    const oldSig = mockFnSig({
      params: [mockParam({ name: 'x', type: 'string' })],
    });
    const newSig = mockFnSig({
      params: [mockParam({ name: 'x', type: '  string  ' })],
    });

    const result = paramTypeNarrowedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });

  it('🚫 False Positive: any → any must return null', () => {
    const oldSig = mockFnSig({
      params: [mockParam({ name: 'x', type: 'any' })],
    });
    const newSig = mockFnSig({
      params: [mockParam({ name: 'x', type: 'any' })],
    });

    const result = paramTypeNarrowedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });

  it('🔲 Edge Case: unknown → string is also narrowing', () => {
    const oldSig = mockFnSig({
      params: [mockParam({ name: 'data', type: 'unknown' })],
    });
    const newSig = mockFnSig({
      params: [mockParam({ name: 'data', type: 'string' })],
    });

    const result = paramTypeNarrowedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    expect(asSingle(result).severity).toBe('breaking');
    expect(asSingle(result).message).toContain('data');
  });

  it('🔲 Edge Case: param removed — R04 must skip (R01 handles it)', () => {
    const oldSig = mockFnSig({
      params: [mockParam({ name: 'gone', type: 'any' })],
    });
    const newSig = mockFnSig({ params: [] });

    const result = paramTypeNarrowedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// R05: Optional Parameter Added
// ═══════════════════════════════════════════════════════════════════════════════

describe('R05 — optionalParamAddedRule', () => {

  it('✅ True Positive (Safe): flags new optional param as safe', () => {
    const oldSig = mockFnSig({
      params: [mockParam({ name: 'userId', type: 'string' })],
    });
    const newSig = mockFnSig({
      params: [
        mockParam({ name: 'userId', type: 'string' }),
        mockParam({ name: 'verbose', type: 'boolean', optional: true }),
      ],
    });

    const result = optionalParamAddedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();

    // R05 returns an array
    const results = asArray(result);
    expect(results).toHaveLength(1);
    expect(results[0].severity).toBe('safe');
    expect(results[0].changeType).toBe('signature_change');
    expect(results[0].message).toContain('verbose');
  });

  it('✅ True Positive (Safe): flags new param with default as safe', () => {
    const oldSig = mockFnSig({ params: [] });
    const newSig = mockFnSig({
      params: [
        mockParam({ name: 'retries', type: 'number', optional: false, hasDefault: true, defaultValue: '3' }),
      ],
    });

    const result = optionalParamAddedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    const results = asArray(result);
    expect(results[0].severity).toBe('safe');
    expect(results[0].message).toContain('retries');
  });

  it('🚫 False Positive: new required param must be ignored by R05', () => {
    const oldSig = mockFnSig({ params: [] });
    const newSig = mockFnSig({
      params: [
        mockParam({ name: 'required', type: 'string', optional: false, hasDefault: false }),
      ],
    });

    const result = optionalParamAddedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });

  it('🚫 False Positive: existing optional param (not new) must be ignored', () => {
    const sig = mockFnSig({
      params: [mockParam({ name: 'existing', type: 'string', optional: true })],
    });

    const result = optionalParamAddedRule.check(sig, sig);

    expect(result).toBeNull();
  });

  it('🔲 Edge Case: both sides empty params', () => {
    const oldSig = mockFnSig({ params: [] });
    const newSig = mockFnSig({ params: [] });

    const result = optionalParamAddedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// R06: Return Type Gained Null/Undefined
// ═══════════════════════════════════════════════════════════════════════════════

describe('R06 — returnNullableRule', () => {

  it('✅ True Positive: flags when return type gains null', () => {
    const oldSig = mockFnSig({ returnType: 'string' });
    const newSig = mockFnSig({ returnType: 'string | null' });

    const result = returnNullableRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    expect(asSingle(result).severity).toBe('breaking');
    expect(asSingle(result).changeType).toBe('return_type_widened');
    expect(asSingle(result).message).toContain('null');
  });

  it('✅ True Positive: flags when return type gains undefined', () => {
    const oldSig = mockFnSig({ returnType: 'number' });
    const newSig = mockFnSig({ returnType: 'number | undefined' });

    const result = returnNullableRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    expect(asSingle(result).severity).toBe('breaking');
    expect(asSingle(result).message).toContain('undefined');
  });

  it('🚫 False Positive: identical return types must return null', () => {
    const sig = mockFnSig({ returnType: 'string | null' });

    const result = returnNullableRule.check(sig, sig);

    expect(result).toBeNull();
  });

  it('🚫 False Positive: inferred return type must be skipped', () => {
    const oldSig = mockFnSig({ returnType: 'inferred' });
    const newSig = mockFnSig({ returnType: 'string | null' });

    const result = returnNullableRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });

  it('🔲 Edge Case: old return is any — skip (cannot prove breakage)', () => {
    const oldSig = mockFnSig({ returnType: 'any' });
    const newSig = mockFnSig({ returnType: 'string | null' });

    const result = returnNullableRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// R07: Return Type Narrowed (Safe)
// ═══════════════════════════════════════════════════════════════════════════════

describe('R07 — returnNarrowedRule', () => {

  it('✅ True Positive (Safe): flags when null is removed from return type', () => {
    const oldSig = mockFnSig({ returnType: 'string | null' });
    const newSig = mockFnSig({ returnType: 'string' });

    const result = returnNarrowedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    expect(asSingle(result).severity).toBe('safe');
    expect(asSingle(result).changeType).toBe('return_type_narrowed');
    expect(asSingle(result).message).toContain('null');
  });

  it('🚫 False Positive: identical return types must return null', () => {
    const sig = mockFnSig({ returnType: 'string' });

    const result = returnNarrowedRule.check(sig, sig);

    expect(result).toBeNull();
  });

  it('🚫 False Positive: inferred return type must be skipped', () => {
    const oldSig = mockFnSig({ returnType: 'inferred' });
    const newSig = mockFnSig({ returnType: 'string' });

    const result = returnNarrowedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });

  it('🔲 Edge Case: widening (adding a type) is not narrowing — must return null', () => {
    const oldSig = mockFnSig({ returnType: 'string' });
    const newSig = mockFnSig({ returnType: 'string | number' });

    const result = returnNarrowedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// R08: Exported → Unexported
// ═══════════════════════════════════════════════════════════════════════════════

describe('R08 — unexportedRule', () => {

  it('✅ True Positive: flags when function loses export', () => {
    const oldSig = mockFnSig({ exported: true });
    const newSig = mockFnSig({ exported: false });

    const result = unexportedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    expect(asSingle(result).severity).toBe('breaking');
    expect(asSingle(result).changeType).toBe('visibility_changed');
  });

  it('🚫 False Positive: both exported must return null', () => {
    const sig = mockFnSig({ exported: true });

    const result = unexportedRule.check(sig, sig);

    expect(result).toBeNull();
  });

  it('🚫 False Positive: both unexported must return null', () => {
    const sig = mockFnSig({ exported: false });

    const result = unexportedRule.check(sig, sig);

    expect(result).toBeNull();
  });

  it('🔲 Edge Case: unexported → exported is not R08 (R28 handles it)', () => {
    const oldSig = mockFnSig({ exported: false });
    const newSig = mockFnSig({ exported: true });

    const result = unexportedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// R11: Sync → Async
// ═══════════════════════════════════════════════════════════════════════════════

describe('R11 — syncToAsyncRule', () => {

  it('✅ True Positive: flags sync → async via modifier', () => {
    const oldSig = mockFnSig({ async: false, returnType: 'string' });
    const newSig = mockFnSig({ async: true, returnType: 'Promise<string>' });

    const result = syncToAsyncRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    expect(asSingle(result).severity).toBe('breaking');
    expect(asSingle(result).changeType).toBe('modifier_changed');
    expect(asSingle(result).message).toContain('async');
  });

  it('✅ True Positive: flags sync → async via return type Promise', () => {
    const oldSig = mockFnSig({ async: false, returnType: 'string' });
    const newSig = mockFnSig({ async: false, returnType: 'Promise<string>' });

    const result = syncToAsyncRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    expect(asSingle(result).severity).toBe('breaking');
  });

  it('🚫 False Positive: both async must return null', () => {
    const sig = mockFnSig({ async: true, returnType: 'Promise<string>' });

    const result = syncToAsyncRule.check(sig, sig);

    expect(result).toBeNull();
  });

  it('🔲 Edge Case: async → sync is not R11 (R21 handles it)', () => {
    const oldSig = mockFnSig({ async: true, returnType: 'Promise<void>' });
    const newSig = mockFnSig({ async: false, returnType: 'void' });

    const result = syncToAsyncRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// R12: Parameter Type Widened (Safe)
// ═══════════════════════════════════════════════════════════════════════════════

describe('R12 — paramTypeWidenedRule', () => {

  it('✅ True Positive (Safe): flags string → string | number widening', () => {
    const oldSig = mockFnSig({
      params: [mockParam({ name: 'val', type: 'string' })],
    });
    const newSig = mockFnSig({
      params: [mockParam({ name: 'val', type: 'string | number' })],
    });

    const result = paramTypeWidenedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    const results = asArray(result);
    expect(results[0].severity).toBe('safe');
    expect(results[0].message).toContain('val');
  });

  it('✅ True Positive (Safe): flags string → any widening', () => {
    const oldSig = mockFnSig({
      params: [mockParam({ name: 'data', type: 'string' })],
    });
    const newSig = mockFnSig({
      params: [mockParam({ name: 'data', type: 'any' })],
    });

    const result = paramTypeWidenedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    const results = asArray(result);
    expect(results[0].severity).toBe('safe');
  });

  it('🚫 False Positive: identical types must return null', () => {
    const sig = mockFnSig({
      params: [mockParam({ name: 'x', type: 'string' })],
    });

    const result = paramTypeWidenedRule.check(sig, sig);

    expect(result).toBeNull();
  });

  it('🔲 Edge Case: any → any cannot be widened further', () => {
    const oldSig = mockFnSig({
      params: [mockParam({ name: 'x', type: 'any' })],
    });
    const newSig = mockFnSig({
      params: [mockParam({ name: 'x', type: 'string' })],
    });

    // any → string is narrowing, not widening — R12 must skip
    const result = paramTypeWidenedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// R13: Generic Constraint Narrowed
// ═══════════════════════════════════════════════════════════════════════════════

describe('R13 — genericConstraintNarrowedRule', () => {

  it('✅ True Positive: flags when generic constraint narrows from any → Record', () => {
    const oldSig = mockFnSig({
      typeParameters: [mockTypeParam({ name: 'T', constraint: undefined })],
    });
    const newSig = mockFnSig({
      typeParameters: [mockTypeParam({ name: 'T', constraint: 'Record<string, unknown>' })],
    });

    const result = genericConstraintNarrowedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    expect(asSingle(result).severity).toBe('breaking');
    expect(asSingle(result).changeType).toBe('signature_change');
    expect(asSingle(result).message).toContain('T');
  });

  it('🚫 False Positive: identical constraints must return null', () => {
    const sig = mockFnSig({
      typeParameters: [mockTypeParam({ name: 'T', constraint: 'object' })],
    });

    const result = genericConstraintNarrowedRule.check(sig, sig);

    expect(result).toBeNull();
  });

  it('🔲 Edge Case: no typeParameters on either side must return null', () => {
    const sig = mockFnSig({ typeParameters: undefined });

    const result = genericConstraintNarrowedRule.check(sig, sig);

    expect(result).toBeNull();
  });

  it('🔲 Edge Case: union constraint narrowed (string | number → string)', () => {
    const oldSig = mockFnSig({
      typeParameters: [mockTypeParam({ name: 'T', constraint: 'string | number' })],
    });
    const newSig = mockFnSig({
      typeParameters: [mockTypeParam({ name: 'T', constraint: 'string' })],
    });

    const result = genericConstraintNarrowedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    expect(asSingle(result).severity).toBe('breaking');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// R14: Rest Parameter Changed
// ═══════════════════════════════════════════════════════════════════════════════

describe('R14 — restParameterRule', () => {

  it('✅ True Positive (Breaking): flags when rest parameter is removed', () => {
    const oldSig = mockFnSig({
      params: [
        mockParam({ name: 'first', type: 'string' }),
        mockParam({ name: 'args', type: 'string[]', isRest: true }),
      ],
    });
    const newSig = mockFnSig({
      params: [mockParam({ name: 'first', type: 'string' })],
    });

    const result = restParameterRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    const results = asArray(result);
    expect(results[0].severity).toBe('breaking');
    expect(results[0].message).toContain('args');
  });

  it('✅ True Positive (Safe): flags when rest parameter is added', () => {
    const oldSig = mockFnSig({
      params: [mockParam({ name: 'first', type: 'string' })],
    });
    const newSig = mockFnSig({
      params: [
        mockParam({ name: 'first', type: 'string' }),
        mockParam({ name: 'extras', type: 'any[]', isRest: true }),
      ],
    });

    const result = restParameterRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    const results = asArray(result);
    expect(results[0].severity).toBe('safe');
    expect(results[0].message).toContain('extras');
  });

  it('🚫 False Positive: both have rest param — must return null', () => {
    const sig = mockFnSig({
      params: [mockParam({ name: 'args', type: 'any[]', isRest: true })],
    });

    const result = restParameterRule.check(sig, sig);

    expect(result).toBeNull();
  });

  it('🔲 Edge Case: no rest params on either side', () => {
    const sig = mockFnSig({
      params: [mockParam({ name: 'a', type: 'string' })],
    });

    const result = restParameterRule.check(sig, sig);

    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// R15: Function Overload Removed
// ═══════════════════════════════════════════════════════════════════════════════

describe('R15 — overloadRemovedRule', () => {

  it('✅ True Positive: flags when overload count decreases', () => {
    const oldSig = mockFnSig({ overloadCount: 3 });
    const newSig = mockFnSig({ overloadCount: 2 });

    const result = overloadRemovedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    expect(asSingle(result).severity).toBe('breaking');
    expect(asSingle(result).changeType).toBe('overload_changed');
    expect(asSingle(result).message).toContain('1 function overload was removed');
    expect(asSingle(result).message).toContain('3 → 2');
  });

  it('✅ True Positive: flags multiple overloads removed', () => {
    const oldSig = mockFnSig({ overloadCount: 5 });
    const newSig = mockFnSig({ overloadCount: 2 });

    const result = overloadRemovedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    expect(asSingle(result).severity).toBe('breaking');
    expect(asSingle(result).message).toContain('3 function overloads were removed');
  });

  it('🚫 False Positive: same overload count must return null', () => {
    const sig = mockFnSig({ overloadCount: 3 });

    const result = overloadRemovedRule.check(sig, sig);

    expect(result).toBeNull();
  });

  it('🚫 False Positive: overload added (count increased) must return null', () => {
    const oldSig = mockFnSig({ overloadCount: 2 });
    const newSig = mockFnSig({ overloadCount: 3 });

    const result = overloadRemovedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });

  it('🔲 Edge Case: non-overloaded function (undefined counts) must return null', () => {
    const oldSig = mockFnSig({ overloadCount: undefined });
    const newSig = mockFnSig({ overloadCount: undefined });

    const result = overloadRemovedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });

  it('🔲 Edge Case: overloaded → non-overloaded (all overloads removed)', () => {
    const oldSig = mockFnSig({ overloadCount: 3 });
    const newSig = mockFnSig({ overloadCount: undefined }); // defaults to 1

    const result = overloadRemovedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    expect(asSingle(result).severity).toBe('breaking');
    expect(asSingle(result).message).toContain('2 function overloads were removed');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// R16: Function Overload Added
// ═══════════════════════════════════════════════════════════════════════════════

describe('R16 — overloadAddedRule', () => {

  it('✅ True Positive (Safe): flags when overload count increases', () => {
    const oldSig = mockFnSig({ overloadCount: 2 });
    const newSig = mockFnSig({ overloadCount: 3 });

    const result = overloadAddedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    expect(asSingle(result).severity).toBe('safe');
    expect(asSingle(result).changeType).toBe('overload_changed');
    expect(asSingle(result).message).toContain('1 function overload was added');
    expect(asSingle(result).message).toContain('2 → 3');
  });

  it('✅ True Positive (Safe): flags non-overloaded → overloaded', () => {
    const oldSig = mockFnSig({ overloadCount: undefined }); // defaults to 1
    const newSig = mockFnSig({ overloadCount: 3 });

    const result = overloadAddedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    expect(asSingle(result).severity).toBe('safe');
    expect(asSingle(result).message).toContain('2 function overloads were added');
  });

  it('🚫 False Positive: same overload count must return null', () => {
    const sig = mockFnSig({ overloadCount: 3 });

    const result = overloadAddedRule.check(sig, sig);

    expect(result).toBeNull();
  });

  it('🚫 False Positive: overload removed (count decreased) must return null', () => {
    const oldSig = mockFnSig({ overloadCount: 3 });
    const newSig = mockFnSig({ overloadCount: 2 });

    const result = overloadAddedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });

  it('🔲 Edge Case: non-overloaded function (undefined counts) must return null', () => {
    const oldSig = mockFnSig({ overloadCount: undefined });
    const newSig = mockFnSig({ overloadCount: undefined });

    const result = overloadAddedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// R17: Static ↔ Instance Swap
// ═══════════════════════════════════════════════════════════════════════════════

describe('R17 — staticChangedRule', () => {

  it('✅ True Positive: flags instance → static', () => {
    const oldSig = mockFnSig({ isStatic: false });
    const newSig = mockFnSig({ isStatic: true });

    const result = staticChangedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    expect(asSingle(result).severity).toBe('breaking');
    expect(asSingle(result).changeType).toBe('modifier_changed');
    expect(asSingle(result).message).toContain('instance to static');
  });

  it('✅ True Positive: flags static → instance', () => {
    const oldSig = mockFnSig({ isStatic: true });
    const newSig = mockFnSig({ isStatic: false });

    const result = staticChangedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    expect(asSingle(result).severity).toBe('breaking');
    expect(asSingle(result).message).toContain('static to instance');
  });

  it('🚫 False Positive: both static must return null', () => {
    const sig = mockFnSig({ isStatic: true });

    const result = staticChangedRule.check(sig, sig);

    expect(result).toBeNull();
  });

  it('🔲 Edge Case: undefined isStatic treated as false', () => {
    const oldSig = mockFnSig({ isStatic: undefined });
    const newSig = mockFnSig({ isStatic: false });

    const result = staticChangedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// R18: Parameter Mutability Narrowed (readonly removed)
// ═══════════════════════════════════════════════════════════════════════════════

describe('R18 — paramMutabilityNarrowedRule', () => {

  it('✅ True Positive: flags readonly string[] → string[]', () => {
    const oldSig = mockFnSig({
      params: [mockParam({ name: 'items', type: 'readonly string[]' })],
    });
    const newSig = mockFnSig({
      params: [mockParam({ name: 'items', type: 'string[]' })],
    });

    const result = paramMutabilityNarrowedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    expect(asSingle(result).severity).toBe('breaking');
    expect(asSingle(result).changeType).toBe('signature_change');
    expect(asSingle(result).message).toContain('items');
    expect(asSingle(result).message).toContain('readonly');
  });

  it('✅ True Positive: flags Readonly<T> → T', () => {
    const oldSig = mockFnSig({
      params: [mockParam({ name: 'config', type: 'Readonly<Config>' })],
    });
    const newSig = mockFnSig({
      params: [mockParam({ name: 'config', type: 'Config' })],
    });

    const result = paramMutabilityNarrowedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    expect(asSingle(result).severity).toBe('breaking');
  });

  it('🚫 False Positive: identical types must return null', () => {
    const sig = mockFnSig({
      params: [mockParam({ name: 'x', type: 'readonly string[]' })],
    });

    const result = paramMutabilityNarrowedRule.check(sig, sig);

    expect(result).toBeNull();
  });

  it('🔲 Edge Case: mutable → readonly is NOT narrowing (R19 handles it)', () => {
    const oldSig = mockFnSig({
      params: [mockParam({ name: 'data', type: 'string[]' })],
    });
    const newSig = mockFnSig({
      params: [mockParam({ name: 'data', type: 'readonly string[]' })],
    });

    const result = paramMutabilityNarrowedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// R19: Parameter Mutability Widened (readonly added — safe)
// ═══════════════════════════════════════════════════════════════════════════════

describe('R19 — paramMutabilityWidenedRule', () => {

  it('✅ True Positive (Safe): flags string[] → readonly string[]', () => {
    const oldSig = mockFnSig({
      params: [mockParam({ name: 'items', type: 'string[]' })],
    });
    const newSig = mockFnSig({
      params: [mockParam({ name: 'items', type: 'readonly string[]' })],
    });

    const result = paramMutabilityWidenedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    const results = asArray(result);
    expect(results[0].severity).toBe('safe');
    expect(results[0].message).toContain('items');
    expect(results[0].message).toContain('readonly');
  });

  it('🚫 False Positive: identical types must return null', () => {
    const sig = mockFnSig({
      params: [mockParam({ name: 'x', type: 'string[]' })],
    });

    const result = paramMutabilityWidenedRule.check(sig, sig);

    expect(result).toBeNull();
  });

  it('🔲 Edge Case: readonly → mutable is NOT widening (R18 handles it)', () => {
    const oldSig = mockFnSig({
      params: [mockParam({ name: 'data', type: 'readonly string[]' })],
    });
    const newSig = mockFnSig({
      params: [mockParam({ name: 'data', type: 'string[]' })],
    });

    const result = paramMutabilityWidenedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// R20: Class Method Visibility Narrowed
// ═══════════════════════════════════════════════════════════════════════════════

describe('R20 — visibilityNarrowedRule', () => {

  it('✅ True Positive: flags public → protected', () => {
    const oldSig = mockFnSig({ className: 'Service', accessModifier: 'public' });
    const newSig = mockFnSig({ className: 'Service', accessModifier: 'protected' });

    const result = visibilityNarrowedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    expect(asSingle(result).severity).toBe('breaking');
    expect(asSingle(result).changeType).toBe('visibility_changed');
    expect(asSingle(result).message).toContain('public');
    expect(asSingle(result).message).toContain('protected');
  });

  it('✅ True Positive: flags protected → private', () => {
    const oldSig = mockFnSig({ className: 'Service', accessModifier: 'protected' });
    const newSig = mockFnSig({ className: 'Service', accessModifier: 'private' });

    const result = visibilityNarrowedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    expect(asSingle(result).severity).toBe('breaking');
    expect(asSingle(result).message).toContain('protected');
    expect(asSingle(result).message).toContain('private');
  });

  it('🚫 False Positive: same visibility must return null', () => {
    const sig = mockFnSig({ className: 'Service', accessModifier: 'public' });

    const result = visibilityNarrowedRule.check(sig, sig);

    expect(result).toBeNull();
  });

  it('🔲 Edge Case: no className means not a class method — skip', () => {
    const oldSig = mockFnSig({ className: undefined, accessModifier: 'public' });
    const newSig = mockFnSig({ className: undefined, accessModifier: 'private' });

    const result = visibilityNarrowedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });

  it('🔲 Edge Case: visibility widened (private → public) — not R20', () => {
    const oldSig = mockFnSig({ className: 'Service', accessModifier: 'private' });
    const newSig = mockFnSig({ className: 'Service', accessModifier: 'public' });

    const result = visibilityNarrowedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// R21: Async → Sync
// ═══════════════════════════════════════════════════════════════════════════════

describe('R21 — asyncToSyncRule', () => {

  it('✅ True Positive: flags async → sync via modifier', () => {
    const oldSig = mockFnSig({ async: true, returnType: 'Promise<string>' });
    const newSig = mockFnSig({ async: false, returnType: 'string' });

    const result = asyncToSyncRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    expect(asSingle(result).severity).toBe('breaking');
    expect(asSingle(result).changeType).toBe('modifier_changed');
    expect(asSingle(result).message).toContain('synchronous');
  });

  it('🚫 False Positive: both sync must return null', () => {
    const sig = mockFnSig({ async: false, returnType: 'void' });

    const result = asyncToSyncRule.check(sig, sig);

    expect(result).toBeNull();
  });

  it('🔲 Edge Case: sync → async is not R21 (R11 handles it)', () => {
    const oldSig = mockFnSig({ async: false, returnType: 'void' });
    const newSig = mockFnSig({ async: true, returnType: 'Promise<void>' });

    const result = asyncToSyncRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// R22: Return Type Becomes Never
// ═══════════════════════════════════════════════════════════════════════════════

describe('R22 — returnNeverRule', () => {

  it('✅ True Positive: flags when return type becomes never', () => {
    const oldSig = mockFnSig({ returnType: 'void' });
    const newSig = mockFnSig({ returnType: 'never' });

    const result = returnNeverRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    expect(asSingle(result).severity).toBe('breaking');
    expect(asSingle(result).changeType).toBe('return_type_narrowed');
    expect(asSingle(result).message).toContain('never');
  });

  it('✅ True Positive: flags inferred → never (universally destructive)', () => {
    const oldSig = mockFnSig({ returnType: 'inferred' });
    const newSig = mockFnSig({ returnType: 'never' });

    const result = returnNeverRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    expect(asSingle(result).severity).toBe('breaking');
  });

  it('🚫 False Positive: identical return types must return null', () => {
    const sig = mockFnSig({ returnType: 'never' });

    const result = returnNeverRule.check(sig, sig);

    expect(result).toBeNull();
  });

  it('🔲 Edge Case: never → void is a different change, not R22', () => {
    const oldSig = mockFnSig({ returnType: 'never' });
    const newSig = mockFnSig({ returnType: 'void' });

    const result = returnNeverRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// R23: Default Parameter Value Changed
// ═══════════════════════════════════════════════════════════════════════════════

describe('R23 — defaultValueChangedRule', () => {

  it('✅ True Positive (Warning): flags when default value changes', () => {
    const oldSig = mockFnSig({
      params: [mockParam({ name: 'retries', type: 'number', hasDefault: true, defaultValue: '3' })],
    });
    const newSig = mockFnSig({
      params: [mockParam({ name: 'retries', type: 'number', hasDefault: true, defaultValue: '1' })],
    });

    const result = defaultValueChangedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    const results = asArray(result);
    expect(results[0].severity).toBe('warning');
    expect(results[0].message).toContain('retries');
    expect(results[0].message).toContain('3');
    expect(results[0].message).toContain('1');
  });

  it('🚫 False Positive: same default value must return null', () => {
    const sig = mockFnSig({
      params: [mockParam({ name: 'retries', hasDefault: true, defaultValue: '3' })],
    });

    const result = defaultValueChangedRule.check(sig, sig);

    expect(result).toBeNull();
  });

  it('🚫 False Positive: no default on either side must return null', () => {
    const sig = mockFnSig({
      params: [mockParam({ name: 'x', type: 'string', hasDefault: false })],
    });

    const result = defaultValueChangedRule.check(sig, sig);

    expect(result).toBeNull();
  });

  it('🔲 Edge Case: default added where none existed — not a mutation', () => {
    const oldSig = mockFnSig({
      params: [mockParam({ name: 'retries', hasDefault: false, defaultValue: undefined })],
    });
    const newSig = mockFnSig({
      params: [mockParam({ name: 'retries', hasDefault: true, defaultValue: '3' })],
    });

    // R23 only triggers when BOTH have defaults and they differ
    const result = defaultValueChangedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// R24: Constructor Signature Changed
// ═══════════════════════════════════════════════════════════════════════════════

describe('R24 — constructorChangedRule', () => {

  it('✅ True Positive: flags when constructor adds a required param', () => {
    const oldSig = mockFnSig({
      isConstructor: true,
      className: 'UserService',
      params: [mockParam({ name: 'db', type: 'Database' })],
    });
    const newSig = mockFnSig({
      isConstructor: true,
      className: 'UserService',
      params: [
        mockParam({ name: 'db', type: 'Database' }),
        mockParam({ name: 'logger', type: 'Logger', optional: false, hasDefault: false }),
      ],
    });

    const result = constructorChangedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    expect(asSingle(result).severity).toBe('breaking');
    expect(asSingle(result).changeType).toBe('signature_change');
    expect(asSingle(result).message).toContain('UserService');
  });

  it('✅ True Positive: flags when constructor param is removed', () => {
    const oldSig = mockFnSig({
      isConstructor: true,
      className: 'Cache',
      params: [
        mockParam({ name: 'ttl', type: 'number' }),
        mockParam({ name: 'max', type: 'number' }),
      ],
    });
    const newSig = mockFnSig({
      isConstructor: true,
      className: 'Cache',
      params: [mockParam({ name: 'ttl', type: 'number' })],
    });

    const result = constructorChangedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    expect(asSingle(result).severity).toBe('breaking');
    expect(asSingle(result).message).toContain('Cache');
  });

  it('🚫 False Positive: non-constructor function must be skipped', () => {
    const sig = mockFnSig({
      isConstructor: false,
      params: [mockParam({ name: 'a' })],
    });
    const newSig = mockFnSig({
      isConstructor: false,
      params: [],
    });

    const result = constructorChangedRule.check(sig, newSig);

    expect(result).toBeNull();
  });

  it('🔲 Edge Case: constructor with only optional param added — no breakage', () => {
    const oldSig = mockFnSig({
      isConstructor: true,
      className: 'App',
      params: [mockParam({ name: 'config', type: 'Config' })],
    });
    const newSig = mockFnSig({
      isConstructor: true,
      className: 'App',
      params: [
        mockParam({ name: 'config', type: 'Config' }),
        mockParam({ name: 'debug', type: 'boolean', optional: true }),
      ],
    });

    const result = constructorChangedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// R28: Unexported → Exported (Visibility Widened)
// ═══════════════════════════════════════════════════════════════════════════════

describe('R28 — exportedRule', () => {

  it('✅ True Positive (Warning): flags when internal function becomes exported', () => {
    const oldSig = mockFnSig({ exported: false });
    const newSig = mockFnSig({ exported: true });

    const result = exportedRule.check(oldSig, newSig);

    expect(result).not.toBeNull();
    expect(asSingle(result).severity).toBe('warning');
    expect(asSingle(result).changeType).toBe('visibility_changed');
    expect(asSingle(result).message).toContain('exported');
  });

  it('🚫 False Positive: both exported must return null', () => {
    const sig = mockFnSig({ exported: true });

    const result = exportedRule.check(sig, sig);

    expect(result).toBeNull();
  });

  it('🚫 False Positive: both unexported must return null', () => {
    const sig = mockFnSig({ exported: false });

    const result = exportedRule.check(sig, sig);

    expect(result).toBeNull();
  });

  it('🔲 Edge Case: exported → unexported is not R28 (R08 handles it)', () => {
    const oldSig = mockFnSig({ exported: true });
    const newSig = mockFnSig({ exported: false });

    const result = exportedRule.check(oldSig, newSig);

    expect(result).toBeNull();
  });
});
