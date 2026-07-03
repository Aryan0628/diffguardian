/**
 * tests/engine/engine.test.ts
 *
 * Phase 2: Engine Integration Tests
 *
 * Tests the ClassifierEngine's routing, bucket assignment, and native logic
 * handling (Deletions, Additions, Deep Equality checks, and Overloads) without
 * needing the AST parser.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ClassifierEngine } from '../../src/classifier/engine';
import { ParseResult } from '../../src/core/types';
import { mockFnSig, mockInterfaceSig, mockParam, mockProperty } from '../setup';
import type { AnySignature } from '../../src/core/types';

describe('ClassifierEngine — Integration & Routing', () => {

  let engine: ClassifierEngine;

  beforeEach(() => {
    engine = new ClassifierEngine();
  });

  const createDiff = (
    oldMap: Map<string, AnySignature>,
    newMap: Map<string, AnySignature>
  ): ParseResult => ({
    file: 'src/test.ts',
    language: 'typescript',
    skipped: false,
    oldSigs: oldMap,
    newSigs: newMap
  });

  it('✅ Native Logic: Flags symbol deletion (R09)', () => {
    const oldSigs = new Map<string, AnySignature>();
    oldSigs.set('execute', mockFnSig({ name: 'execute' }));

    const diff = createDiff(oldSigs, new Map());
    const changes = engine.compare(diff);

    expect(changes).toHaveLength(1);
    expect(changes[0].severity).toBe('breaking');
    expect(changes[0].changeType).toBe('symbol_deleted');
    expect(changes[0].message).toContain('removed from public API');
  });

  it('✅ Native Logic: Flags overload deletion as symbol deleted when key is fully gone', () => {
    const oldSigs = new Map<string, AnySignature>();
    oldSigs.set('fetch:0', mockFnSig({ name: 'fetch', overloadIndex: 0 }));

    const diff = createDiff(oldSigs, new Map());
    const changes = engine.compare(diff);

    expect(changes).toHaveLength(1);
    expect(changes[0].severity).toBe('breaking');
    expect(changes[0].changeType).toBe('symbol_deleted');
  });

  it('✅ Native Logic: Flags safe symbol addition', () => {
    const newSigs = new Map<string, AnySignature>();
    newSigs.set('initialize', mockFnSig({ name: 'initialize' }));

    const diff = createDiff(new Map(), newSigs);
    const changes = engine.compare(diff);

    expect(changes).toHaveLength(1);
    expect(changes[0].severity).toBe('safe');
    expect(changes[0].changeType).toBe('symbol_added');
  });

  it('✅ Native Logic: Flags safe overload addition as symbol added when key is entirely new', () => {
    const newSigs = new Map<string, AnySignature>();
    newSigs.set('fetch:1', mockFnSig({ name: 'fetch', overloadIndex: 1 }));

    const diff = createDiff(new Map(), newSigs);
    const changes = engine.compare(diff);

    expect(changes).toHaveLength(1);
    expect(changes[0].severity).toBe('safe');
    expect(changes[0].changeType).toBe('symbol_added');
  });

  it('⚡️ Performance: Short-circuits deep strictly equal signatures', () => {
    const sig = mockFnSig({ params: [mockParam({ name: 'x' })] });
    
    // Exact same object reference deep equality test
    const oldSigs = new Map().set('process', sig);
    const newSigs = new Map().set('process', sig);

    const diff = createDiff(oldSigs, newSigs);
    const changes = engine.compare(diff);

    expect(changes).toHaveLength(0);
  });

  it('🪣 Bucket Routing: Routes interface keys to interface rules', () => {
    const oldSigs = new Map<string, AnySignature>();
    const newSigs = new Map<string, AnySignature>();

    // Cause an interface property removal (R26)
    oldSigs.set('interface:AuthInfo', mockInterfaceSig({
      properties: [mockProperty({ name: 'token', optional: false })]
    }));
    newSigs.set('interface:AuthInfo', mockInterfaceSig({
      properties: []
    }));

    const diff = createDiff(oldSigs, newSigs);
    const changes = engine.compare(diff);

    expect(changes).toHaveLength(1);
    expect(changes[0].severity).toBe('breaking');
    expect(changes[0].changeType).toBe('interface_property_removed');
  });

  it('🪣 Bucket Routing: Routes function keys to function rules', () => {
    const oldSigs = new Map<string, AnySignature>();
    const newSigs = new Map<string, AnySignature>();

    // Cause a parameter removal (R01)
    oldSigs.set('login', mockFnSig({
      params: [mockParam({ name: 'user' }), mockParam({ name: 'pass' })]
    }));
    newSigs.set('login', mockFnSig({
      params: [mockParam({ name: 'user' })] // 'pass' removed
    }));

    const diff = createDiff(oldSigs, newSigs);
    const changes = engine.compare(diff);

    expect(changes).toHaveLength(1);
    expect(changes[0].severity).toBe('breaking');
    expect(changes[0].changeType).toBe('signature_change');
    expect(changes[0].message).toContain('pass'); // R01 standard message
  });
});
