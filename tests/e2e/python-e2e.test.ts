/**
 * tests/e2e/python-e2e.test.ts
 *
 * E2E tests for the Python WASM parser + Translator + Engine.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ASTMapper } from '../../src/parsers/ast-mapper';
import { ClassifierEngine } from '../../src/classifier/engine';
import type { FileDiff } from '../../src/core/types';

describe('E2E AST Pipeline — Python', () => {

  let mapper: ASTMapper;
  let engine: ClassifierEngine;

  beforeAll(async () => {
    mapper = new ASTMapper();
    await mapper.init();
    engine = new ClassifierEngine();
  });

  const createMockDiff = (oldCode: string, newCode: string): FileDiff => ({
    path: 'src/mock.py',
    language: 'py',
    oldSource: oldCode,
    newSource: newCode,
    isNew: false,
    isDeleted: false,
    isRenamed: false,
    oldPath: 'src/mock.py',
  });

  it('✅ Identifies parameter removal in a class method (R01)', async () => {
    const oldCode = `
class UserService:
    def process_payment(self, amount: int, currency: str):
        pass
    `;
    const newCode = `
class UserService:
    def process_payment(self, amount: int):
        pass
    `;

    const diff = createMockDiff(oldCode, newCode);
    const parsedDiffs = await mapper.buildSignatureCache([diff]);
    const changes = engine.compare(parsedDiffs[0]);

    const r01 = changes.find(c => c.changeType === 'signature_change');
    expect(r01).toBeDefined();
    expect(r01!.severity).toBe('breaking');
    expect(r01!.message).toContain('currency');
    expect(r01!.symbolType).toBe('function');
  });

  it('✅ Identifies rest parameter removal (R14)', async () => {
    const oldCode = `
def log_event(event_name: str, **kwargs):
    pass
    `;
    const newCode = `
def log_event(event_name: str):
    pass
    `;

    const diff = createMockDiff(oldCode, newCode);
    const parsedDiffs = await mapper.buildSignatureCache([diff]);
    const changes = engine.compare(parsedDiffs[0]);

    const r14 = changes.find(c => c.changeType === 'signature_change' && c.message?.includes('Rest'));
    expect(r14).toBeDefined();
    expect(r14!.severity).toBe('breaking');
    expect(r14!.message).toContain('**kwargs');
  });

  it('✅ Identifies async added (R11/R21)', async () => {
    // Note: async to sync is a breaking change
    const oldCode = `
async def fetch_data():
    pass
    `;
    const newCode = `
def fetch_data():
    pass
    `;

    const diff = createMockDiff(oldCode, newCode);
    const parsedDiffs = await mapper.buildSignatureCache([diff]);
    const changes = engine.compare(parsedDiffs[0]);

    const r21 = changes.find(c => c.message?.includes('async'));
    expect(r21).toBeDefined();
    expect(r21!.severity).toBe('breaking');
    expect(r21!.changeType).toBe('modifier_changed');
  });

});
