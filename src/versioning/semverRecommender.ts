/**
 * src/versioning/semverRecommender.ts
 *
 * Turns the classifier's per-change severities into a single semver bump
 * recommendation for the diff as a whole, with justification referencing
 * the specific rule violations that drove the decision (issue #34).
 *
 * Default mapping (standard semver, no config needed):
 *   any 'breaking' severity  → major
 *   any 'warning'  severity  → minor  (and no breaking present)
 *   only 'safe'    changes   → patch
 *
 * Per-rule overrides (dg.config.json `versioningOverrides`, e.g. forcing a
 * particular warning-level rule like a deprecation to require a major bump)
 * take priority over the default severity mapping for changes produced by
 * that rule. Changes with no ruleId (symbol_deleted / symbol_added — engine-
 * synthesized, not tied to a specific numbered rule) always use the default
 * severity mapping, since there's no rule ID to override.
 */

import { FunctionChange, Severity } from '../core/types';
import {
  SemverBump,
  SemverRecommendation,
  SemverJustificationEntry,
  VersioningOverrides,
} from './types';

const BUMP_RANK: Record<SemverBump, number> = { patch: 0, minor: 1, major: 2 };

function defaultBumpForSeverity(severity: Severity): SemverBump {
  if (severity === 'breaking') return 'major';
  if (severity === 'warning') return 'minor';
  return 'patch';
}

/**
 * Resolves the semver bump a single change maps to, applying a per-rule
 * override if one is configured and the change has a ruleId.
 */
function resolveBump(change: FunctionChange, overrides: VersioningOverrides): SemverBump {
  if (change.ruleId && overrides[change.ruleId]) {
    return overrides[change.ruleId];
  }
  return defaultBumpForSeverity(change.severity);
}

function formatJustificationLine(entry: SemverJustificationEntry): string {
  const rulePrefix = entry.ruleId ? `${entry.ruleId}: ` : '';
  return `${rulePrefix}${entry.message} (${entry.name} in ${entry.file})`;
}

/**
 * Computes the recommended semver bump for a set of classified API changes.
 *
 * @param changes   All changes to consider (typically AnalysisResult.apiChanges,
 *                  i.e. breaking + warning + safe combined — safe changes are
 *                  what allow the recommendation to fall through to 'patch'
 *                  rather than defaulting to 'major' when the array is non-empty
 *                  but contains no breaking/warning changes).
 * @param overrides Optional per-rule ID → bump overrides from dg.config.json.
 */
export function recommendVersion(
  changes: FunctionChange[],
  overrides: VersioningOverrides = {}
): SemverRecommendation {
  if (!changes || changes.length === 0) {
    return {
      bump: 'patch',
      justification: ['No API surface changes detected.'],
      drivingChanges: [],
    };
  }

  const entries: SemverJustificationEntry[] = changes.map(change => ({
    ruleId: change.ruleId,
    file: change.file || 'unknown file',
    name: change.name || '<anonymous>',
    message: change.message || change.changeType,
    bump: resolveBump(change, overrides),
    changeId: change.id,
  }));

  const overallBump = entries.reduce<SemverBump>(
    (max, entry) => (BUMP_RANK[entry.bump] > BUMP_RANK[max] ? entry.bump : max),
    'patch'
  );

  // Only the changes that actually drove the final decision (i.e. match the
  // overall bump) are surfaced as justification — a patch-level safe change
  // isn't "why" a major bump was recommended alongside a breaking one.
  const drivingChanges = entries.filter(e => e.bump === overallBump);

  return {
    bump: overallBump,
    justification: drivingChanges.map(formatJustificationLine),
    drivingChanges,
  };
}

export default recommendVersion;
