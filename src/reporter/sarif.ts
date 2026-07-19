/**
 * src/reporter/sarif.ts
 *
 * THE SARIF REPORTER.
 * Renders the full pipeline result as a SARIF 2.1.0 log to stdout, suitable
 * for `npx dg check --format sarif > diffguardian.sarif` and upload via
 * `github/codeql-action/upload-sarif` to populate the GitHub Security tab.
 *
 * SARIF spec: https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html
 *
 * Edge cases handled:
 *  - null / undefined `result` — emits a valid, empty SARIF log instead of throwing
 *  - `result.apiChanges` may be missing/empty — produces a zero-result run, still valid SARIF
 *  - `change.file` may be empty — falls back to 'unknown' (SARIF requires a non-empty URI)
 *  - `change.lineStart` may be 0/undefined — region omitted (SARIF regions must be >= 1)
 *  - `change.name` may be empty — falls back to '<anonymous>' in the message text
 *  - `change.message` may be undefined — falls back to a description derived from changeType
 *  - Windows-style backslashes in `change.file` are normalized to forward slashes for URI validity
 *  - Duplicate changeTypes across many changes only produce ONE rule entry (SARIF rules must be unique per id)
 *  - Quiet mode: suppresses all output, matching the other reporters' contract
 */

import { AnalysisResult, FunctionChange, ChangeType } from '../core/types';
import { Reporter, ReporterConfig } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const SARIF_SCHEMA = 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json';
const SARIF_VERSION = '2.1.0';
const TOOL_NAME = 'Diff-Guardian';
const TOOL_INFO_URI = 'https://diffguardian.vercel.app';
const DOCS_URI = 'https://diffguardian.vercel.app/docs/how-it-works';

// ─────────────────────────────────────────────────────────────────────────────
// SARIF type shapes (minimal subset needed for this reporter — avoids pulling
// in a full external @types/sarif dependency for a handful of fields).
// ─────────────────────────────────────────────────────────────────────────────

interface SarifRegion {
  startLine: number;
}

interface SarifPhysicalLocation {
  artifactLocation: { uri: string };
  region?: SarifRegion;
}

interface SarifLocation {
  physicalLocation: SarifPhysicalLocation;
}

interface SarifReportingDescriptor {
  id: string;
  name: string;
  shortDescription: { text: string };
  fullDescription: { text: string };
  helpUri: string;
  defaultConfiguration: { level: 'error' | 'warning' | 'note' };
}

interface SarifResult {
  ruleId: string;
  level: 'error' | 'warning' | 'note';
  message: { text: string };
  locations: SarifLocation[];
}

interface SarifLog {
  version: '2.1.0';
  $schema: string;
  runs: Array<{
    tool: {
      driver: {
        name: string;
        informationUri: string;
        version: string;
        rules: SarifReportingDescriptor[];
      };
    };
    results: SarifResult[];
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// changeType → human-readable rule descriptions.
// Mirrors the fallback descriptions in terminal.ts, kept independent so each
// reporter stays self-contained — this codebase never cross-imports between
// reporter/*.ts files (see terminal.ts, github.ts, json.ts).
// ─────────────────────────────────────────────────────────────────────────────

const CHANGE_TYPE_DESCRIPTIONS: Record<string, string> = {
  signature_change:            'A function/method signature changed (parameters added, removed, reordered, or retyped).',
  return_type_widened:         'A return type was widened (safe).',
  return_type_narrowed:        'A return type was narrowed.',
  visibility_changed:          'Symbol visibility changed (exported/unexported, public/protected/private).',
  modifier_changed:            'A modifier was toggled (async, static, abstract, generator).',
  decorator_changed:           'A decorator was added, removed, or modified.',
  overload_changed:            'A function overload was added or removed.',
  interface_property_required: 'A previously optional interface property is now required.',
  interface_property_removed:  'A required interface property was removed.',
  enum_member_changed:         'An enum member was removed or its value changed.',
  symbol_exported:             'A symbol was newly exported.',
  symbol_unexported:           'A previously exported symbol was made internal.',
  symbol_deleted:              'A public symbol was removed entirely.',
  symbol_added:                'A new symbol was added to the public API.',
  default_value_changed:       'A default parameter value changed.',
  constructor_changed:         'The constructor signature changed.',
  generic_narrowed:            'A generic type constraint was narrowed.',
};

function describeChangeType(changeType: string): string {
  return CHANGE_TYPE_DESCRIPTIONS[changeType] ?? `Change detected: ${changeType}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Severity → SARIF level
// ─────────────────────────────────────────────────────────────────────────────

function toSarifLevel(severity: FunctionChange['severity']): 'error' | 'warning' | 'note' {
  if (severity === 'breaking') return 'error';
  if (severity === 'warning') return 'warning';
  return 'note';
}

// ─────────────────────────────────────────────────────────────────────────────
// Builders
// ─────────────────────────────────────────────────────────────────────────────

function normalizeUri(file: string | undefined): string {
  const trimmed = file?.trim();
  if (!trimmed) return 'unknown';
  return trimmed.replace(/\\/g, '/').replace(/^\/+/, '');
}

// Severity ranking used to pick the "worst case" level for a rule's
// defaultConfiguration — a single changeType (e.g. 'signature_change')
// can be produced by multiple underlying rules with different severities
// (R01 param removal = breaking, R12 param widened = safe), so we can't
// just take whichever change happens to appear first in the array.
const SEVERITY_RANK: Record<FunctionChange['severity'], number> = {
  breaking: 2,
  warning: 1,
  safe: 0,
};

function buildRules(changes: FunctionChange[]): SarifReportingDescriptor[] {
  // Group by changeType, tracking the worst severity seen for each —
  // SARIF requires unique rule ids, and the driver's defaultConfiguration.level
  // should reflect the most severe outcome that rule can produce, since the
  // per-result `level` (always set explicitly below) is what actually
  // determines each individual finding's severity.
  const worstSeverityByType = new Map<string, FunctionChange['severity']>();

  for (const change of changes) {
    const changeType: ChangeType | string = change.changeType || 'unknown_change';
    const existing = worstSeverityByType.get(changeType);
    if (!existing || SEVERITY_RANK[change.severity] > SEVERITY_RANK[existing]) {
      worstSeverityByType.set(changeType, change.severity);
    }
  }

  const rules: SarifReportingDescriptor[] = [];
  for (const [changeType, worstSeverity] of worstSeverityByType) {
    rules.push({
      id: changeType,
      name: changeType,
      shortDescription: { text: describeChangeType(changeType) },
      fullDescription: { text: describeChangeType(changeType) },
      helpUri: DOCS_URI,
      defaultConfiguration: { level: toSarifLevel(worstSeverity) },
    });
  }

  return rules;
}

function buildResults(changes: FunctionChange[]): SarifResult[] {
  return changes.map((change) => {
    const changeType = change.changeType || 'unknown_change';
    const name       = change.name?.trim() || '<anonymous>';
    const message    = change.message?.trim() || describeChangeType(changeType);
    const uri        = normalizeUri(change.file);
    const lineStart  = change.lineStart;

    const physicalLocation: SarifPhysicalLocation = {
      artifactLocation: { uri },
    };
    if (typeof lineStart === 'number' && lineStart > 0) {
      physicalLocation.region = { startLine: lineStart };
    }

    return {
      ruleId: changeType,
      level: toSarifLevel(change.severity),
      message: { text: `${name}: ${message}` },
      locations: [{ physicalLocation }],
    };
  });
}

function buildSarifLog(result: AnalysisResult | null | undefined): SarifLog {
  const allChanges = result && Array.isArray(result.apiChanges) ? result.apiChanges : [];

  return {
    version: SARIF_VERSION,
    $schema: SARIF_SCHEMA,
    runs: [
      {
        tool: {
          driver: {
            name: TOOL_NAME,
            informationUri: TOOL_INFO_URI,
            // NOTE: kept static rather than importing package.json (avoids dist/
            // path-resolution issues after `tsc` compilation). Bump alongside
            // package.json's "version" field when cutting a release.
            version: '0.1.0',
            rules: buildRules(allChanges),
          },
        },
        results: buildResults(allChanges),
      },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Reporter
// ─────────────────────────────────────────────────────────────────────────────

export const SarifReporter: Reporter = {
  async render(result: AnalysisResult, config: ReporterConfig): Promise<void> {
    // ── Guard: quiet mode ────────────────────────────────────────────────────
    if (config.quiet) return;

    // ── Guard: malformed result — still emit valid, empty SARIF ─────────────
    if (!result) {
      console.error('[sarif-reporter] Received null result — emitting empty SARIF log.');
    }

    const sarifLog = buildSarifLog(result);
    console.log(JSON.stringify(sarifLog, null, 2));
  },
};
