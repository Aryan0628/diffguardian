/**
 * tests/e2e/ast-e2e.test.ts
 *
 * Phase 3: E2E AST Tests (The WASM Sandbox)
 *
 * This test integrates the actual web-tree-sitter WASM parser with the 
 * ClassifierEngine. It takes raw TypeScript strings, generates the AST,
 * creates the parsed signature maps, and asserts that the engine correctly
 * identifies the breaking changes.
 * 
 * IMPORTANT: This runs the actual parser, which requires the WASM grammars
 * in the root /grammars/ directory, which are loaded via ASTMapper.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ASTMapper } from '../../src/parsers/ast-mapper';
import { ClassifierEngine } from '../../src/classifier/engine';
import type { FileDiff } from '../../src/core/types';

describe('E2E AST Pipeline — WASM + Engine integration', () => {

  let mapper: ASTMapper;
  let engine: ClassifierEngine;

  // Set up the WASM environment once before all tests in this block.
  // We use Vitest's 15s timeout from vitest.config.ts just in case it's slow.
  beforeAll(async () => {
    mapper = new ASTMapper();
    await mapper.init(); // Boot web-tree-sitter
    engine = new ClassifierEngine();
  });

  const createMockDiff = (oldCode: string, newCode: string): FileDiff => ({
    path: 'src/mock.ts', // Dummy file path
    language: 'ts',
    oldSource: oldCode,
    newSource: newCode,
    isNew: false,
    isDeleted: false,
    isRenamed: false,
    oldPath: 'src/mock.ts',
  });

  it('✅ Identifies a function parameter removal (R01)', async () => {
    const oldCode = `
      export function createUser(name: string, age: number): void {
        console.log(name, age);
      }
    `;
    const newCode = `
      export function createUser(name: string): void {
        console.log(name);
      }
    `;

    const diff = createMockDiff(oldCode, newCode);
    const parsedDiffs = await mapper.buildSignatureCache([diff]);
    const changes = engine.compare(parsedDiffs[0]);

    expect(changes).toHaveLength(1);
    expect(changes[0].severity).toBe('breaking');
    expect(changes[0].changeType).toBe('signature_change');
    expect(changes[0].message).toContain('age'); // Removed parameter name
    expect(changes[0].symbolType).toBe('function');
  });

  it('✅ Identifies an interface property being made required (R25)', async () => {
    const oldCode = `
      export interface UserProfile {
        username: string;
        avatarUrl?: string;
      }
    `;
    const newCode = `
      export interface UserProfile {
        username: string;
        avatarUrl: string;
      }
    `;

    const diff = createMockDiff(oldCode, newCode);
    const parsedDiffs = await mapper.buildSignatureCache([diff]);
    const changes = engine.compare(parsedDiffs[0]);

    expect(changes).toHaveLength(1);
    expect(changes[0].severity).toBe('breaking');
    expect(changes[0].changeType).toBe('interface_property_added');
    expect(changes[0].message).toContain('avatarUrl');
    expect(changes[0].symbolType).toBe('interface');
  });

  it('✅ Identifies a destructive enum change (R27)', async () => {
    const oldCode = `
      export enum Role {
        ADMIN = 1,
        USER = 2,
        GUEST = 3
      }
    `;
    const newCode = `
      export enum Role {
        ADMIN = 1,
        // USER was removed
        GUEST = 3
      }
    `;

    const diff = createMockDiff(oldCode, newCode);
    const parsedDiffs = await mapper.buildSignatureCache([diff]);
    const changes = engine.compare(parsedDiffs[0]);

    expect(changes).toHaveLength(1);
    expect(changes[0].severity).toBe('breaking');
    expect(changes[0].changeType).toBe('enum_member_changed');
    expect(changes[0].message).toContain('USER');
    expect(changes[0].symbolType).toBe('enum');
  });

  it('✅ Identifies a narrowed union type alias (R29)', async () => {
    const oldCode = `
      export type PaymentStatus = 'pending' | 'active' | 'failed';
    `;
    const newCode = `
      export type PaymentStatus = 'pending' | 'failed';
    `;

    const diff = createMockDiff(oldCode, newCode);
    const parsedDiffs = await mapper.buildSignatureCache([diff]);
    const changes = engine.compare(parsedDiffs[0]);

    expect(changes).toHaveLength(1);
    expect(changes[0].severity).toBe('breaking');
    expect(changes[0].changeType).toBe('type_alias_changed');
    expect(changes[0].message).toContain("'active'");
    expect(changes[0].symbolType).toBe('type_alias');
  });

  it('⚡️ Confirms safe additions are caught without breaking (R10: Symbol Added)', async () => {
    const oldCode = `
      export function fetchUser() {}
    `;
    const newCode = `
      export function fetchUser() {}
      export function deleteUser() {} // completely new safe symbol
    `;

    const diff = createMockDiff(oldCode, newCode);
    const parsedDiffs = await mapper.buildSignatureCache([diff]);
    const changes = engine.compare(parsedDiffs[0]);

    expect(changes).toHaveLength(1);
    expect(changes[0].severity).toBe('safe');
    expect(changes[0].changeType).toBe('symbol_added');
  });

});
