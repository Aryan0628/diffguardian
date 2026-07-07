/**
 * tests/setup.ts
 * Shared mock factories for the diff-guardian test suite.
 *
 * These factories produce minimal, type-safe signature objects.
 * Each test only overrides the fields relevant to the rule under test,
 * keeping tests self-documenting and free from cross-contamination.
 */

import type {
  FunctionSignature,
  InterfaceSignature,
  EnumSignature,
  TypeAliasSignature,
  Param,
  InterfaceProperty,
  EnumMember,
  TypeParameter,
} from '../src/core/types';
import type { RuleResult } from '../src/classifier/types';

// ── Type-Narrowing Helpers ────────────────────────────────────────────────────

/**
 * Narrows a Rule.check() return value to a single RuleResult.
 * Use this when the test expects exactly one non-null, non-array result.
 * Eliminates the TS2339 error: "Property 'severity' does not exist on type 'RuleResult[]'".
 */
export function asSingle(result: RuleResult | RuleResult[] | null): RuleResult {
  if (result === null) throw new Error('Expected a RuleResult, got null');
  if (Array.isArray(result)) throw new Error(`Expected a single RuleResult, got array of ${result.length}`);
  return result;
}

/**
 * Narrows a Rule.check() return value to a RuleResult[].
 * Use this when the rule returns an array (e.g., R05, R12, R14, R19, R23).
 */
export function asArray(result: RuleResult | RuleResult[] | null): RuleResult[] {
  if (result === null) throw new Error('Expected RuleResult[], got null');
  return Array.isArray(result) ? result : [result];
}

// ── Param Builder ─────────────────────────────────────────────────────────────

export function mockParam(overrides?: Partial<Param>): Param {
  return {
    name: 'arg',
    type: 'string',
    optional: false,
    hasDefault: false,
    ...overrides,
  };
}

// ── FunctionSignature Factory ─────────────────────────────────────────────────

export function mockFnSig(overrides?: Partial<FunctionSignature>): FunctionSignature {
  return {
    name: 'testFn',
    line: 1,
    params: [],
    returnType: 'void',
    exported: true,
    isDefaultExport: false,
    async: false,
    ...overrides,
  };
}

// ── InterfaceSignature Factory ────────────────────────────────────────────────

export function mockInterfaceSig(overrides?: Partial<InterfaceSignature>): InterfaceSignature {
  return {
    line: 1,
    properties: [],
    exported: true,
    ...overrides,
  };
}

// ── EnumSignature Factory ─────────────────────────────────────────────────────

export function mockEnumSig(overrides?: Partial<EnumSignature>): EnumSignature {
  return {
    line: 1,
    members: [],
    exported: true,
    ...overrides,
  };
}

// ── TypeAliasSignature Factory ────────────────────────────────────────────────

export function mockTypeAliasSig(overrides?: Partial<TypeAliasSignature>): TypeAliasSignature {
  return {
    line: 1,
    value: "'a'",
    exported: true,
    ...overrides,
  };
}

// ── Property / Member Builders ────────────────────────────────────────────────

export function mockProperty(overrides?: Partial<InterfaceProperty>): InterfaceProperty {
  return {
    name: 'prop',
    type: 'string',
    optional: false,
    ...overrides,
  };
}

export function mockEnumMember(overrides?: Partial<EnumMember>): EnumMember {
  return {
    name: 'Value',
    ...overrides,
  };
}

export function mockTypeParam(overrides?: Partial<TypeParameter>): TypeParameter {
  return {
    name: 'T',
    ...overrides,
  };
}
