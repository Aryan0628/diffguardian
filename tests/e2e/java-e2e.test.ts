/**
 * tests/e2e/java-e2e.test.ts
 *
 * E2E tests for the Java WASM parser + Translator + Engine.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ASTMapper } from '../../src/parsers/ast-mapper';
import { ClassifierEngine } from '../../src/classifier/engine';
import type { FileDiff } from '../../src/core/types';

describe('E2E AST Pipeline — Java', () => {

  let mapper: ASTMapper;
  let engine: ClassifierEngine;

  beforeAll(async () => {
    mapper = new ASTMapper();
    await mapper.init();
    engine = new ClassifierEngine();
  });

  const createMockDiff = (oldCode: string, newCode: string): FileDiff => ({
    path: 'src/main/java/Mock.java',
    language: 'java',
    oldSource: oldCode,
    newSource: newCode,
    isNew: false,
    isDeleted: false,
    isRenamed: false,
    oldPath: 'src/main/java/Mock.java',
  });

  it('✅ Identifies destructive enum member change (R27)', async () => {
    const oldCode = `
package com.example;
public enum Status {
    START,
    PROGRESS,
    DONE
}
    `;
    const newCode = `
package com.example;
public enum Status {
    START,
    DONE
}
    `;

    const diff = createMockDiff(oldCode, newCode);
    const parsedDiffs = await mapper.buildSignatureCache([diff]);
    const changes = engine.compare(parsedDiffs[0]);

    const r27 = changes.find(c => c.changeType === 'enum_member_changed');
    expect(r27).toBeDefined();
    expect(r27!.severity).toBe('breaking');
    expect(r27!.message).toContain('PROGRESS');
    expect(r27!.symbolType).toBe('enum');
  });

  it('✅ Identifies interface property added (R25)', async () => {
    const oldCode = `
package com.example;
public interface Service {
    void init();
}
    `;
    const newCode = `
package com.example;
public interface Service {
    void init();
    void shutdown();
}
    `;

    const diff = createMockDiff(oldCode, newCode);
    const parsedDiffs = await mapper.buildSignatureCache([diff]);
    const changes = engine.compare(parsedDiffs[0]);

    const r25 = changes.find(c => c.changeType === 'interface_property_added');
    expect(r25).toBeDefined();
    expect(r25!.severity).toBe('breaking');
    expect(r25!.message).toContain('shutdown');
  });

  it('✅ Identifies visibility narrowed (R20)', async () => {
    const oldCode = `
package com.example;
public class Auth {
    public void login() {}
}
    `;
    const newCode = `
package com.example;
public class Auth {
    protected void login() {}
}
    `;

    const diff = createMockDiff(oldCode, newCode);
    const parsedDiffs = await mapper.buildSignatureCache([diff]);
    const changes = engine.compare(parsedDiffs[0]);

    const r20 = changes.find(c => c.message?.includes("'public' to 'protected'"));
    expect(r20).toBeDefined();
    expect(r20!.severity).toBe('breaking');
    expect(r20!.changeType).toBe('visibility_changed');
  });

  it('✅ Adding synchronized does NOT trigger async change (R11 fix)', async () => {
    const oldCode = `
package com.example;
public class Counter {
    public void increment() {}
}
    `;
    const newCode = `
package com.example;
public class Counter {
    public synchronized void increment() {}
}
    `;

    const diff = createMockDiff(oldCode, newCode);
    const parsedDiffs = await mapper.buildSignatureCache([diff]);
    const changes = engine.compare(parsedDiffs[0]);

    // synchronized should NOT trigger R11 (sync→async) — it's a thread-safety modifier
    const r11 = changes.find(c => c.changeType === 'modifier_changed' && c.message?.includes('async'));
    expect(r11).toBeUndefined();
  });

  it('✅ Detects Java method overload removal (R15)', async () => {
    const oldCode = `
package com.example;
public class Formatter {
    public String format(String s) { return s; }
    public String format(int n) { return "" + n; }
}
    `;
    const newCode = `
package com.example;
public class Formatter {
    public String format(String s) { return s; }
}
    `;

    const diff = createMockDiff(oldCode, newCode);
    const parsedDiffs = await mapper.buildSignatureCache([diff]);
    const changes = engine.compare(parsedDiffs[0]);

    const r15 = changes.find(c => c.changeType === 'overload_changed' && c.severity === 'breaking');
    expect(r15).toBeDefined();
    expect(r15!.message).toContain('overload');
  });

});
