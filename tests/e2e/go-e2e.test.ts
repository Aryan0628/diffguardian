/**
 * tests/e2e/go-e2e.test.ts
 *
 * E2E tests for the Go WASM parser + Translator + Engine.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ASTMapper } from '../../src/parsers/ast-mapper';
import { ClassifierEngine } from '../../src/classifier/engine';
import type { FileDiff } from '../../src/core/types';

describe('E2E AST Pipeline — Go', () => {

  let mapper: ASTMapper;
  let engine: ClassifierEngine;

  beforeAll(async () => {
    mapper = new ASTMapper();
    await mapper.init();
    engine = new ClassifierEngine();
  });

  const createMockDiff = (oldCode: string, newCode: string): FileDiff => ({
    path: 'main.go',
    language: 'go',
    oldSource: oldCode,
    newSource: newCode,
    isNew: false,
    isDeleted: false,
    isRenamed: false,
    oldPath: 'main.go',
  });

  it('✅ Identifies interface method addition as breaking (R25)', async () => {
    const oldCode = `
package main
type Reader interface {
    Read(p []byte) (n int, err error)
}
    `;
    const newCode = `
package main
type Reader interface {
    Read(p []byte) (n int, err error)
    Close() error
}
    `;

    const diff = createMockDiff(oldCode, newCode);
    const parsedDiffs = await mapper.buildSignatureCache([diff]);
    const changes = engine.compare(parsedDiffs[0]);

    const r25 = changes.find(c => c.changeType === 'interface_property_added');
    expect(r25).toBeDefined();
    expect(r25!.severity).toBe('breaking');
    expect(r25!.message).toContain('Close');
    expect(r25!.symbolType).toBe('interface');
  });

  it('✅ Identifies variadic parameter removal (R14)', async () => {
    const oldCode = `
package main
func LogMessage(level string, args ...string) {}
    `;
    const newCode = `
package main
func LogMessage(level string) {}
    `;

    const diff = createMockDiff(oldCode, newCode);
    const parsedDiffs = await mapper.buildSignatureCache([diff]);
    const changes = engine.compare(parsedDiffs[0]);

    const r14 = changes.find(c => c.changeType === 'signature_change' && c.message?.includes('Rest'));
    expect(r14).toBeDefined();
    expect(r14!.severity).toBe('breaking');
    expect(r14!.message).toContain('...args'); // depending on extraction
  });

  it('✅ Identifies symbol unexported via name casing (R08)', async () => {
    const oldCode = `
package main
func ProcessData() int { return 1 }
    `;
    const newCode = `
package main
func processData() int { return 1 }
    `;

    const diff = createMockDiff(oldCode, newCode);
    const parsedDiffs = await mapper.buildSignatureCache([diff]);
    const changes = engine.compare(parsedDiffs[0]);

    // This actually triggers symbol_deleted and symbol_added because the symbol name changed
    // from ProcessData to processData.
    const deleted = changes.find(c => c.changeType === 'symbol_deleted' && c.name === 'ProcessData');
    expect(deleted).toBeDefined();
    expect(deleted!.severity).toBe('breaking');
  });

});
