import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { SemverBump } from './versioning/types';

export interface DgConfig {
  baseBranch?: string;
  failOnWarnings?: boolean;

  // ── Tracer settings ─────────────────────────────────────────────────────
  /** Enable/disable call-site tracing (default: true) */
  enableTracer?: boolean;
  /** Max files returned by git grep per symbol (default: 500) */
  maxGrepResults?: number;
  /** Max recursive barrel file depth (default: 10) */
  maxBarrelDepth?: number;
  /** Max files to AST-parse for call sites per symbol (default: 100) */
  maxTracerFiles?: number;

  // ── Versioning settings (issue #34) ─────────────────────────────────────
  /**
   * Per-rule severity-to-semver overrides, keyed by rule ID (e.g. 'R23').
   * Lets a team require a bigger bump than the default severity mapping
   * for a specific rule (e.g. treating a deprecation warning as major)
   * without forking the tool. Values must be one of 'major' | 'minor' | 'patch'.
   */
  versioningOverrides?: Record<string, SemverBump>;
}

export const CONFIG_FILE = 'dg.config.json';

// ── Validation ────────────────────────────────────────────────────────────
// Small, dependency-free schema for DgConfig. Each known field declares its
// expected `typeof` plus an optional extra constraint (e.g. positive
// integer for the numeric tracer settings). Unknown top-level keys are
// warned about separately as likely typos.

type FieldType = 'string' | 'boolean' | 'number';

interface FieldSchema {
  type: FieldType;
  /** Returns an error message if invalid, or null if the value is fine. */
  validate?: (value: number) => string | null;
}

function positiveInteger(value: number): string | null {
  return Number.isInteger(value) && value > 0 ? null : 'must be a positive integer';
}

const CONFIG_SCHEMA: Record<keyof Omit<DgConfig, 'versioningOverrides'>, FieldSchema> = {
  baseBranch: { type: 'string' },
  failOnWarnings: { type: 'boolean' },
  enableTracer: { type: 'boolean' },
  maxGrepResults: { type: 'number', validate: positiveInteger },
  maxBarrelDepth: { type: 'number', validate: positiveInteger },
  maxTracerFiles: { type: 'number', validate: positiveInteger },
};

// versioningOverrides has a different shape (a map, not a scalar) so it's
// validated separately below rather than through CONFIG_SCHEMA's typeof-based
// checks — but it's still a "known" top-level key, not a typo candidate.
const KNOWN_KEYS = [...Object.keys(CONFIG_SCHEMA), 'versioningOverrides'] as (keyof DgConfig)[];

const VALID_SEMVER_BUMPS = new Set(['major', 'minor', 'patch']);
const RULE_ID_PATTERN = /^R\d+$/;

/**
 * Validates the `versioningOverrides` field: must be a plain object whose
 * keys look like rule IDs ('R' followed by digits) and whose values are one
 * of 'major' | 'minor' | 'patch'. Invalid entries are dropped individually
 * (with a warning) rather than discarding the whole map, matching the
 * per-field tolerance of the rest of this validator.
 */
function validateVersioningOverrides(raw: any): Record<string, SemverBump> | undefined {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    console.warn(
      chalk.yellow(
        `[dg] ${CONFIG_FILE}: "versioningOverrides" must be an object mapping rule IDs to ` +
          `'major' | 'minor' | 'patch', got ${Array.isArray(raw) ? 'an array' : typeof raw}. Ignoring.`
      )
    );
    return undefined;
  }

  const result: Record<string, SemverBump> = {};

  for (const [ruleId, bump] of Object.entries(raw)) {
    if (!RULE_ID_PATTERN.test(ruleId)) {
      console.warn(
        chalk.yellow(
          `[dg] ${CONFIG_FILE}: "versioningOverrides" key "${ruleId}" doesn't look like a rule ID ` +
            `(expected e.g. "R23"). Ignoring this entry.`
        )
      );
      continue;
    }
    if (typeof bump !== 'string' || !VALID_SEMVER_BUMPS.has(bump)) {
      console.warn(
        chalk.yellow(
          `[dg] ${CONFIG_FILE}: "versioningOverrides.${ruleId}" must be 'major', 'minor', or 'patch', ` +
            `got ${JSON.stringify(bump)}. Ignoring this entry.`
        )
      );
      continue;
    }
    result[ruleId] = bump as SemverBump;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Validates a raw parsed JSON value against the DgConfig schema.
 *
 * - Known fields with the wrong type (or that fail an extra constraint,
 *   e.g. maxGrepResults must be a positive integer) are dropped, with a
 *   chalk.yellow warning printed via console.warn.
 * - Unknown top-level keys are warned about as likely typos but do not
 *   invalidate the rest of the file.
 * - Never throws; a completely invalid top-level value (e.g. an array or
 *   a primitive) warns once and returns an empty config.
 */
export function validateConfig(raw: any): DgConfig {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    console.warn(
      chalk.yellow(
        `[dg] ${CONFIG_FILE}: must contain a JSON object at the top level, got ${
          Array.isArray(raw) ? 'an array' : typeof raw
        }. Using defaults.`
      )
    );
    return {};
  }

  const config: DgConfig = {};

  for (const key of KNOWN_KEYS) {
    if (!(key in raw)) continue;
    if (key === 'versioningOverrides') continue; // handled separately below — different shape

    const value = raw[key];
    const schema = CONFIG_SCHEMA[key as keyof typeof CONFIG_SCHEMA];
    const actualType = typeof value;

    if (actualType !== schema.type) {
      console.warn(
        chalk.yellow(
          `[dg] ${CONFIG_FILE}: "${key}" must be a ${schema.type}, got ${actualType} (${JSON.stringify(
            value
          )}). Ignoring — using default.`
        )
      );
      continue;
    }

    if (schema.validate) {
      const error = schema.validate(value);
      if (error) {
        console.warn(
          chalk.yellow(
            `[dg] ${CONFIG_FILE}: "${key}" is invalid: ${error} (got ${JSON.stringify(value)}). Ignoring — using default.`
          )
        );
        continue;
      }
    }

    (config as Record<string, unknown>)[key] = value;
  }

  if ('versioningOverrides' in raw) {
    const overrides = validateVersioningOverrides(raw.versioningOverrides);
    if (overrides) config.versioningOverrides = overrides;
  }

  const unknownKeys = Object.keys(raw).filter((k) => !KNOWN_KEYS.includes(k as keyof DgConfig));
  for (const key of unknownKeys) {
    console.warn(chalk.yellow(`[dg] ${CONFIG_FILE}: unknown key "${key}" — check for a typo. It will be ignored.`));
  }

  return config;
}

export function loadConfig(repoRoot: string = process.cwd()): DgConfig {
  const configPath = path.join(repoRoot, CONFIG_FILE);
  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, 'utf8');
      const parsed = JSON.parse(raw);
      return validateConfig(parsed);
    } catch (e) {
      console.warn(`[dg] Failed to parse ${CONFIG_FILE}: ${(e as Error).message}`);
    }
  }
  return {};
}

export function saveConfig(config: DgConfig, repoRoot: string = process.cwd()): void {
  const configPath = path.join(repoRoot, CONFIG_FILE);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}
