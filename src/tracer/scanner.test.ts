import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { execSync } from 'child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { JITScanner, createDefaultTracerConfig } from './scanner';

describe('JITScanner scope filtering', () => {
  let repoRoot: string;

  beforeEach(() => {
    repoRoot = mkdtempSync(path.join(os.tmpdir(), 'diffguardian-scan-'));

    execSync('git init', { cwd: repoRoot, stdio: 'ignore' });
    execSync('git config user.email "test@example.com"', { cwd: repoRoot, stdio: 'ignore' });
    execSync('git config user.name "Test User"', { cwd: repoRoot, stdio: 'ignore' });

    writeRepoFile('src/payments/processPayment.ts', `
export function processPayment(): string {
  return 'ok';
}
`);

    writeRepoFile('src/payments/index.ts', `
export { processPayment } from './processPayment';
`);

    writeRepoFile('src/payments/direct-consumer.ts', `
import { processPayment } from './processPayment';

export const directResult = processPayment();
`);

    writeRepoFile('src/payments/team/barrel-consumer.ts', `
  import { processPayment } from '../../payments';

export const barrelResult = processPayment();
`);

    writeRepoFile('apps/web/direct-consumer.ts', `
import { processPayment } from '../../src/payments/processPayment';

export const webDirectResult = processPayment();
`);

    writeRepoFile('apps/web/barrel-consumer.ts', `
import { processPayment } from '../../src/payments';

export const webBarrelResult = processPayment();
`);

    execSync('git add .', { cwd: repoRoot, stdio: 'ignore' });
    execSync('git commit -m "initial"', { cwd: repoRoot, stdio: 'ignore' });
  });

  afterEach(() => {
    rmSync(repoRoot, { recursive: true, force: true });
  });

  test.each([
    'src/payments',
    'src/payments/',
    './src/payments',
  ])('keeps only scoped trace results for %s', async (scope) => {
    const scanner = new JITScanner(
      createDefaultTracerConfig(repoRoot, 'HEAD', { jsonOutput: true }),
    );

    const importers = await scanner.scan('processPayment', '', scope);

    expect(importers.map(importer => importer.filePath).sort()).toEqual([
      'src/payments/direct-consumer.ts',
      'src/payments/team/barrel-consumer.ts',
    ]);
  });

  test('keeps existing behavior when scope is omitted', async () => {
    const scanner = new JITScanner(
      createDefaultTracerConfig(repoRoot, 'HEAD', { jsonOutput: true }),
    );

    const importers = await scanner.scan('processPayment', '');

    expect(importers.map(importer => importer.filePath).sort()).toEqual([
      'apps/web/barrel-consumer.ts',
      'apps/web/direct-consumer.ts',
      'src/payments/direct-consumer.ts',
      'src/payments/team/barrel-consumer.ts',
    ]);
  });

  function writeRepoFile(relativePath: string, content: string): void {
    const fullPath = path.join(repoRoot, relativePath);
    mkdirSync(path.dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content.trimStart(), 'utf-8');
  }
});