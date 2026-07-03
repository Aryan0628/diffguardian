/**
 * tests/tracer/tracer.test.ts
 *
 * Call-Site Tracer Tests — validates Phase 3 of the Lazy Graph.
 *
 * Tests the argument counting, broken/fixed/indeterminate classification,
 * valid arg count computation, old↔new correlation, and enum tracing.
 *
 * Uses mocked ImportReferences and real WASM parsers for AST extraction.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { CallSiteTracer } from '../../src/tracer/tracer';
import { createDefaultTracerConfig } from '../../src/tracer/scanner';
import type {
  FunctionChange,
  ImportReference,
  FileDiff,
  FunctionSignature,
  Param,
} from '../../src/core/types';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeParam(name: string, opts?: Partial<Param>): Param {
  return {
    name,
    type: 'any',
    optional: false,
    hasDefault: false,
    isRest: false,
    ...opts,
  };
}

function makeSig(params: Param[]): FunctionSignature {
  return {
    name: 'testFn',
    line: 1,
    params,
    returnType: 'void',
    exported: true,
    async: false,
  };
}

function makeChange(overrides?: Partial<FunctionChange>): FunctionChange {
  return {
    id: 'test.ts:testFn:1',
    name: 'testFn',
    file: 'test.ts',
    lineStart: 1,
    severity: 'breaking',
    changeType: 'required_param_added',
    message: 'New required param added',
    before: makeSig([makeParam('a')]),
    after: makeSig([makeParam('a'), makeParam('b')]),
    requiredParamCount: 2,
    totalParamCount: 2,
    ...overrides,
  };
}

function makeImporter(filePath: string): ImportReference {
  return {
    filePath,
    importedName: 'testFn',
    localName: 'testFn',
    isBarrel: false,
    importLine: 1,
    importType: 'named',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('CallSiteTracer — Phase 3', () => {

  let tracer: CallSiteTracer;

  beforeAll(async () => {
    const config = createDefaultTracerConfig(process.cwd(), 'HEAD');
    tracer = new CallSiteTracer(config);
    await tracer.init();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Argument counting: broken call site (wrong arg count)
  // ═══════════════════════════════════════════════════════════════════════════

  it('marks a call site as broken when arg count is invalid', async () => {
    const change = makeChange({
      requiredParamCount: 2,
      totalParamCount: 2,
    });

    const importer = makeImporter('src/consumer.ts');

    // File provides 1 arg, function now requires 2
    const diffs: FileDiff[] = [{
      path: 'src/consumer.ts',
      language: 'ts',
      oldSource: `import { testFn } from './test';\ntestFn('a');\n`,
      newSource: `import { testFn } from './test';\ntestFn('a');\n`,
      isNew: false,
      isDeleted: false,
      isRenamed: false,
      oldPath: 'src/consumer.ts',
    }];

    const result = await tracer.trace(change, [importer], diffs);

    expect(result.callSites.length).toBeGreaterThan(0);
    const brokenSite = result.callSites.find(s => s.isBroken);
    expect(brokenSite).toBeDefined();
    expect(brokenSite!.argumentCount).toBe(1);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Correct call site (right arg count)
  // ═══════════════════════════════════════════════════════════════════════════

  it('marks a call site as NOT broken when arg count matches', async () => {
    const change = makeChange({
      requiredParamCount: 2,
      totalParamCount: 2,
    });

    const importer = makeImporter('src/correct.ts');

    const diffs: FileDiff[] = [{
      path: 'src/correct.ts',
      language: 'ts',
      oldSource: `import { testFn } from './test';\ntestFn('a');\n`,
      newSource: `import { testFn } from './test';\ntestFn('a', 'b');\n`,
      isNew: false,
      isDeleted: false,
      isRenamed: false,
      oldPath: 'src/correct.ts',
    }];

    const result = await tracer.trace(change, [importer], diffs);

    expect(result.callSites.length).toBeGreaterThan(0);
    const newSite = result.callSites.find(s => s.argumentCount === 2);
    expect(newSite).toBeDefined();
    expect(newSite!.isBroken).toBe(false);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Fixed detection (old broken, new correct)
  // ═══════════════════════════════════════════════════════════════════════════

  it('detects fixed call sites (old had wrong count, new has right count)', async () => {
    const change = makeChange({
      requiredParamCount: 2,
      totalParamCount: 2,
    });

    const importer = makeImporter('src/fixed.ts');

    const diffs: FileDiff[] = [{
      path: 'src/fixed.ts',
      language: 'ts',
      oldSource: `import { testFn } from './test';\ntestFn('a');\n`,
      newSource: `import { testFn } from './test';\ntestFn('a', 'b');\n`,
      isNew: false,
      isDeleted: false,
      isRenamed: false,
      oldPath: 'src/fixed.ts',
    }];

    const result = await tracer.trace(change, [importer], diffs);

    const fixedSite = result.callSites.find(s => s.isFixed);
    expect(fixedSite).toBeDefined();
    expect(fixedSite!.argumentCount).toBe(2);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Spread args → indeterminate (never broken)
  // ═══════════════════════════════════════════════════════════════════════════

  it('marks spread calls as indeterminate, never broken', async () => {
    const change = makeChange({
      requiredParamCount: 2,
      totalParamCount: 2,
    });

    const importer = makeImporter('src/spread.ts');

    const diffs: FileDiff[] = [{
      path: 'src/spread.ts',
      language: 'ts',
      oldSource: '',
      newSource: `import { testFn } from './test';\nconst args = ['a', 'b'];\ntestFn(...args);\n`,
      isNew: true,
      isDeleted: false,
      isRenamed: false,
      oldPath: 'src/spread.ts',
    }];

    const result = await tracer.trace(change, [importer], diffs);

    const spreadSite = result.callSites.find(s => s.isIndeterminate);
    expect(spreadSite).toBeDefined();
    expect(spreadSite!.isBroken).toBe(false);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Barrel imports filtered out
  // ═══════════════════════════════════════════════════════════════════════════

  it('skips barrel importers (only traces non-barrel files)', async () => {
    const change = makeChange();

    const barrelImporter: ImportReference = {
      filePath: 'src/barrel/index.ts',
      importedName: 'testFn',
      localName: 'testFn',
      isBarrel: true,
      importLine: 1,
      importType: 'named',
    };

    const result = await tracer.trace(change, [barrelImporter], []);

    expect(result.callSites).toEqual([]);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Empty importers → empty result
  // ═══════════════════════════════════════════════════════════════════════════

  it('returns empty result when no importers provided', async () => {
    const change = makeChange();

    const result = await tracer.trace(change, [], []);

    expect(result.callSites).toEqual([]);
    expect(result.importersFound).toBe(0);
    expect(result.functionName).toBe('testFn');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TracerResult metadata
  // ═══════════════════════════════════════════════════════════════════════════

  it('populates TracerResult metadata correctly', async () => {
    const change = makeChange();
    const importer = makeImporter('src/consumer.ts');

    const diffs: FileDiff[] = [{
      path: 'src/consumer.ts',
      language: 'ts',
      oldSource: '',
      newSource: `import { testFn } from './test';\ntestFn('a');\n`,
      isNew: true,
      isDeleted: false,
      isRenamed: false,
      oldPath: 'src/consumer.ts',
    }];

    const result = await tracer.trace(change, [importer], diffs);

    expect(result.functionName).toBe('testFn');
    expect(result.importersFound).toBe(1);
    expect(Array.isArray(result.errors)).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Optional params → valid range
  // ═══════════════════════════════════════════════════════════════════════════

  it('handles optional params in valid arg count range', async () => {
    const change = makeChange({
      after: makeSig([
        makeParam('a'),
        makeParam('b', { optional: true }),
      ]),
      requiredParamCount: 1,
      totalParamCount: 2,
    });

    const importer = makeImporter('src/optional.ts');

    const diffs: FileDiff[] = [{
      path: 'src/optional.ts',
      language: 'ts',
      oldSource: '',
      newSource: `import { testFn } from './test';\ntestFn('a');\n`,
      isNew: true,
      isDeleted: false,
      isRenamed: false,
      oldPath: 'src/optional.ts',
    }];

    const result = await tracer.trace(change, [importer], diffs);

    // 1 arg is valid when required=1, total=2
    const site = result.callSites[0];
    expect(site).toBeDefined();
    expect(site.isBroken).toBe(false);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Multiple call sites in one file
  // ═══════════════════════════════════════════════════════════════════════════

  it('finds multiple call sites in a single file', async () => {
    const change = makeChange({
      requiredParamCount: 2,
      totalParamCount: 2,
    });

    const importer = makeImporter('src/multi.ts');

    const diffs: FileDiff[] = [{
      path: 'src/multi.ts',
      language: 'ts',
      oldSource: '',
      newSource: `import { testFn } from './test';\ntestFn('a');\ntestFn('a', 'b');\ntestFn('x');\n`,
      isNew: true,
      isDeleted: false,
      isRenamed: false,
      oldPath: 'src/multi.ts',
    }];

    const result = await tracer.trace(change, [importer], diffs);

    expect(result.callSites.length).toBe(3);
    const broken = result.callSites.filter(s => s.isBroken);
    const ok = result.callSites.filter(s => !s.isBroken);
    expect(broken.length).toBe(2); // 1 arg calls
    expect(ok.length).toBe(1);     // 2 arg call
  });
});
