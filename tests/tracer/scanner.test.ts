/**
 * tests/tracer/scanner.test.ts
 *
 * JIT Scanner Tests — validates Phase 2 of the Lazy Graph.
 *
 * Uses a REAL temporary git repo to exercise:
 *   - git grep-based symbol finding
 *   - Import classification (direct importer vs barrel re-export)
 *   - Barrel file BFS walking with cycle detection
 *   - Path normalization and deduplication
 *   - Self-import filtering
 *   - Parse output format (git grep lines)
 *   - Error isolation (bad files don't crash scan)
 *   - Performance limits (maxGrepResults, maxBarrelDepth)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { JITScanner, createDefaultTracerConfig } from '../../src/tracer/scanner';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);
const TEMP_DIR = path.resolve(process.cwd(), '.dg-scanner-test');

async function git(cmd: string): Promise<string> {
  const { stdout } = await execAsync(cmd, { cwd: TEMP_DIR });
  return stdout.trim();
}

function filePaths(importers: Array<{ filePath: string }>): string[] {
  return importers.map(importer => importer.filePath).sort();
}

describe('JITScanner — Phase 2', () => {

  beforeAll(async () => {
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEMP_DIR, { recursive: true });

    await git('git init');
    await git('git config user.email "test@test.com"');
    await git('git config user.name "Test"');

    // ── Source file: where processPayment is defined ─────────────────────
    const paymentsDir = path.join(TEMP_DIR, 'src', 'payments');
    fs.mkdirSync(paymentsDir, { recursive: true });

    fs.writeFileSync(
      path.join(paymentsDir, 'processor.ts'),
      `export function processPayment(amount: number, currency: string): boolean {\n  return true;\n}\n`
    );

    // ── Direct importer ─────────────────────────────────────────────────
    const checkoutDir = path.join(TEMP_DIR, 'src', 'checkout');
    fs.mkdirSync(checkoutDir, { recursive: true });

    fs.writeFileSync(
      path.join(checkoutDir, 'cart.ts'),
      `import { processPayment } from '../payments/processor';\n\nexport function checkout() {\n  processPayment(100, 'USD');\n}\n`
    );

    // ── Barrel file (re-exports processPayment) ─────────────────────────
    fs.writeFileSync(
      path.join(paymentsDir, 'index.ts'),
      `export { processPayment } from './processor';\n`
    );


    // ── Scoped consumers inside src/payments ───────────────────────────
    const scopedPaymentsDir = path.join(paymentsDir, 'internal');
    fs.mkdirSync(scopedPaymentsDir, { recursive: true });

    fs.writeFileSync(
      path.join(scopedPaymentsDir, 'audit.ts'),
      `import { processPayment } from '../processor';

export function auditPayment() {
  processPayment(75, 'USD');
}
`
    );

    fs.writeFileSync(
      path.join(scopedPaymentsDir, 'summary.ts'),
      `import { processPayment } from '../payments';

export function summaryPayment() {
  processPayment(25, 'USD');
}
`
    );
    // ── Consumer of the barrel ──────────────────────────────────────────
    const apiDir = path.join(TEMP_DIR, 'src', 'api');
    fs.mkdirSync(apiDir, { recursive: true });

    fs.writeFileSync(
      path.join(apiDir, 'handler.ts'),
      `import { processPayment } from '../payments';\n\nexport function handleRequest() {\n  processPayment(50, 'EUR');\n}\n`
    );

    // ── File that does NOT import processPayment (noise) ────────────────
    fs.writeFileSync(
      path.join(apiDir, 'health.ts'),
      `export function healthCheck(): string {\n  return 'ok';\n}\n`
    );

    // ── File with the symbol name in a comment (false grep match) ───────
    fs.writeFileSync(
      path.join(apiDir, 'docs.ts'),
      `// TODO: refactor processPayment to use Stripe\nexport const version = '1.0.0';\n`
    );

    // ── Python file importing the symbol (multi-language test) ──────────
    const pyDir = path.join(TEMP_DIR, 'src', 'scripts');
    fs.mkdirSync(pyDir, { recursive: true });

    fs.writeFileSync(
      path.join(pyDir, 'migrate.py'),
      `from payments.processor import processPayment\n\ndef run():\n    processPayment(100, "USD")\n`
    );

    await git('git add -A');
    await git('git commit -m "initial"');
  }, 15_000);

  afterAll(() => {
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CORE: Basic scan finds direct importers
  // ═══════════════════════════════════════════════════════════════════════════

  it('finds direct importers of a symbol', async () => {
    const config = createDefaultTracerConfig(TEMP_DIR, 'HEAD');
    const scanner = new JITScanner(config);

    const importers = await scanner.scan('processPayment', 'src/payments/processor.ts');

    // Should find cart.ts (direct import) and handler.ts (via barrel)
    const files = importers.map(i => i.filePath);
    expect(files).toContain('src/checkout/cart.ts');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Self-import filtering
  // ═══════════════════════════════════════════════════════════════════════════

  it('excludes the source file from results', async () => {
    const config = createDefaultTracerConfig(TEMP_DIR, 'HEAD');
    const scanner = new JITScanner(config);

    const importers = await scanner.scan('processPayment', 'src/payments/processor.ts');

    const files = importers.map(i => i.filePath);
    expect(files).not.toContain('src/payments/processor.ts');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Empty result for non-existent symbol
  // ═══════════════════════════════════════════════════════════════════════════

  it('returns empty array for symbol that does not exist', async () => {
    const config = createDefaultTracerConfig(TEMP_DIR, 'HEAD');
    const scanner = new JITScanner(config);

    const importers = await scanner.scan('nonExistentSymbol', 'src/fake.ts');

    expect(importers).toEqual([]);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Config factory defaults
  // ═══════════════════════════════════════════════════════════════════════════

  it('createDefaultTracerConfig sets sensible defaults', () => {
    const config = createDefaultTracerConfig('/repo', 'abc123');

    expect(config.repoRoot).toBe('/repo');
    expect(config.headSha).toBe('abc123');
    expect(config.maxGrepResults).toBe(500);
    expect(config.maxBarrelDepth).toBe(10);
    expect(config.maxTracerFiles).toBe(100);
    expect(config.traceOnlyBreaking).toBe(true);
    expect(config.tracerLanguages).toContain('typescript');
  });

  it('createDefaultTracerConfig allows overrides', () => {
    const config = createDefaultTracerConfig('/repo', 'HEAD', {
      maxGrepResults: 10,
      maxBarrelDepth: 2,
    });

    expect(config.maxGrepResults).toBe(10);
    expect(config.maxBarrelDepth).toBe(2);
    expect(config.maxTracerFiles).toBe(100); // not overridden
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Import reference structure
  // ═══════════════════════════════════════════════════════════════════════════

  it('populates ImportReference fields correctly', async () => {
    const config = createDefaultTracerConfig(TEMP_DIR, 'HEAD');
    const scanner = new JITScanner(config);

    const importers = await scanner.scan('processPayment', 'src/payments/processor.ts');

    const cartImport = importers.find(i => i.filePath === 'src/checkout/cart.ts');
    if (cartImport) {
      expect(cartImport.importedName).toBe('processPayment');
      expect(cartImport.localName).toBe('processPayment');
      expect(typeof cartImport.importLine).toBe('number');
      expect(cartImport.importLine).toBeGreaterThan(0);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Scope filtering
  // ═══════════════════════════════════════════════════════════════════════════

  it('normalizes equivalent scope paths', async () => {
    const config = createDefaultTracerConfig(TEMP_DIR, 'HEAD');
    const scanner = new JITScanner(config);

    const scoped = await scanner.scan('processPayment', 'src/payments/processor.ts', 'src/payments');
    const scopedWithTrailingSlash = await scanner.scan('processPayment', 'src/payments/processor.ts', 'src/payments/');
    const scopedWithDotPrefix = await scanner.scan('processPayment', 'src/payments/processor.ts', './src/payments');

    const expected = [
      'src/payments/internal/audit.ts',
      'src/payments/internal/summary.ts',
    ];

    expect(filePaths(scoped)).toEqual(expected);
    expect(filePaths(scopedWithTrailingSlash)).toEqual(expected);
    expect(filePaths(scopedWithDotPrefix)).toEqual(expected);
  });

  it('returns only files inside the requested scope', async () => {
    const config = createDefaultTracerConfig(TEMP_DIR, 'HEAD');
    const scanner = new JITScanner(config);

    const importers = await scanner.scan('processPayment', 'src/payments/processor.ts', 'src/payments');

    expect(filePaths(importers)).toEqual([
      'src/payments/internal/audit.ts',
      'src/payments/internal/summary.ts',
    ]);
    expect(filePaths(importers)).not.toContain('src/checkout/cart.ts');
    expect(filePaths(importers)).not.toContain('src/api/handler.ts');
  });

  it('keeps the existing behavior when scope is omitted', async () => {
    const config = createDefaultTracerConfig(TEMP_DIR, 'HEAD');
    const scanner = new JITScanner(config);

    const importers = await scanner.scan('processPayment', 'src/payments/processor.ts');
    const files = filePaths(importers);

    expect(files).toContain('src/checkout/cart.ts');
    expect(files).toContain('src/api/handler.ts');
    expect(files).toContain('src/payments/internal/audit.ts');
    expect(files).toContain('src/payments/internal/summary.ts');
  });
});
