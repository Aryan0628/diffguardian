/**
 * src/versioning/types.ts
 *
 * Types for the semver recommendation + changelog draft generation feature
 * (issue #34). Purely additive on top of the classifier's existing
 * FunctionChange output — see semverRecommender.ts and changelogDraft.ts.
 */

export type SemverBump = 'major' | 'minor' | 'patch';

/**
 * Per-rule override of the default severity → semver mapping, keyed by rule
 * ID (e.g. 'R23'). Configured via dg.config.json's `versioningOverrides`
 * field and validated in config.ts.
 */
export type VersioningOverrides = Record<string, SemverBump>;

/**
 * One driving reason behind a semver recommendation — a single rule
 * violation that contributed to (or was the deciding factor for) the
 * recommended bump.
 */
export interface SemverJustificationEntry {
  ruleId?: string;     // e.g. 'R03' — undefined for synthetic changes (symbol_deleted, etc.)
  file: string;
  name: string;
  message: string;
  bump: SemverBump;     // the bump this specific change would map to (post-override)
  changeId: string;     // FunctionChange.id — traceability back to the full record
}

export interface SemverRecommendation {
  bump: SemverBump;
  /** Human-readable summary lines, ready to print — NOT raw rule dumps. */
  justification: string[];
  /** Full structured detail behind each justification line, for tooling/tests. */
  drivingChanges: SemverJustificationEntry[];
}

// ── Changelog draft ───────────────────────────────────────────────────────────

export type ChangelogCategory = 'Breaking Changes' | 'Deprecated' | 'Added' | 'Fixed';

export interface ChangelogLineItem {
  category: ChangelogCategory;
  text: string;         // human-readable line, e.g. "Removed parameter `tenant` from `getUser()`"
  changeId: string;      // FunctionChange.id — traceability
  ruleId?: string;
}

export interface ChangelogDraft {
  markdown: string;              // ready to paste into CHANGELOG.md
  entries: ChangelogLineItem[];  // structured form, for tooling/tests
}
