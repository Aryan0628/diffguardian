/**
 * tests/e2e/rust-e2e.test.ts
 *
 * E2E tests for the Rust WASM parser + Translator + Engine.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ASTMapper } from '../../src/parsers/ast-mapper';
import { ClassifierEngine } from '../../src/classifier/engine';
import type { FileDiff } from '../../src/core/types';

describe('E2E AST Pipeline — Rust', () => {

  let mapper: ASTMapper;
  let engine: ClassifierEngine;

  beforeAll(async () => {
    mapper = new ASTMapper();
    await mapper.init();
    engine = new ClassifierEngine();
  });

  const createMockDiff = (oldCode: string, newCode: string): FileDiff => ({
    path: 'src/lib.rs',
    language: 'rs',
    oldSource: oldCode,
    newSource: newCode,
    isNew: false,
    isDeleted: false,
    isRenamed: false,
    oldPath: 'src/lib.rs',
  });

  it('✅ Identifies param mutability narrowed (R18)', async () => {
    // &T to &mut T is narrowing the accepted inputs (breaking)
    const oldCode = `
pub fn process_data(data: &Vec<u8>) {}
    `;
    const newCode = `
pub fn process_data(data: &mut Vec<u8>) {}
    `;

    const diff = createMockDiff(oldCode, newCode);
    const parsedDiffs = await mapper.buildSignatureCache([diff]);
    const changes = engine.compare(parsedDiffs[0]);

    const r18 = changes.find(c => c.changeType === 'signature_change' && c.message?.includes('&mut'));
    expect(r18).toBeDefined();
    expect(r18!.severity).toBe('breaking');
    expect(r18!.message).toContain('&Vec<u8>\' to \'&mut Vec<u8>');
  });

  it('✅ Identifies return type becomes never (R22)', async () => {
    const oldCode = `
pub fn crash() -> () {}
    `;
    const newCode = `
pub fn crash() -> ! {}
    `;

    const diff = createMockDiff(oldCode, newCode);
    const parsedDiffs = await mapper.buildSignatureCache([diff]);
    const changes = engine.compare(parsedDiffs[0]);

    const r22 = changes.find(c => c.changeType === 'return_type_narrowed');
    expect(r22).toBeDefined();
    expect(r22!.severity).toBe('breaking');
  });

  it('✅ Identifies trait method added (R25)', async () => {
    const oldCode = `
pub trait Drawable {
    fn draw(&self);
}
    `;
    const newCode = `
pub trait Drawable {
    fn draw(&self);
    fn resize(&mut self, w: u32, h: u32);
}
    `;

    const diff = createMockDiff(oldCode, newCode);
    const parsedDiffs = await mapper.buildSignatureCache([diff]);
    const changes = engine.compare(parsedDiffs[0]);

    const r25 = changes.find(c => c.changeType === 'interface_property_added');
    expect(r25).toBeDefined();
    expect(r25!.severity).toBe('breaking');
    expect(r25!.message).toContain('resize');
    expect(r25!.symbolType).toBe('interface');
  });

  it('✅ Identifies param mutability widened as safe (R19)', async () => {
    // &mut T → &T is widening the readonly guarantee (safe)
    const oldCode = `
pub fn process_data(data: &mut Vec<u8>) {}
    `;
    const newCode = `
pub fn process_data(data: &Vec<u8>) {}
    `;

    const diff = createMockDiff(oldCode, newCode);
    const parsedDiffs = await mapper.buildSignatureCache([diff]);
    const changes = engine.compare(parsedDiffs[0]);

    const r19 = changes.find(c => c.severity === 'safe' && c.message?.includes('readonly'));
    expect(r19).toBeDefined();
    expect(r19!.severity).toBe('safe');
    expect(r19!.message).toContain('&mut Vec<u8>');
  });

});
