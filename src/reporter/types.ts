import { AnalysisResult } from '../core/types';
import { SemverBump } from '../versioning/types';

export interface ReporterConfig {
  mode: 'strict' | 'warn';
  format?: 'terminal' | 'github' | 'json';
  githubToken?: string;
  prNumber?: number;
  repoSlug?: string;
  failOnWarnings?: boolean; // Added per config
  quiet?: boolean;
  reportFile?: string;      // If set, write JSON AnalysisResult to this path
  hookContext?: 'pre-push' | 'pre-merge-commit' | 'post-merge';  // Set via DG_HOOK env var

  // ── Versioning (issue #34) ────────────────────────────────────────────────
  /** If true, compute and surface a semver bump recommendation. */
  recommendVersion?: boolean;
  /** If true, compute and surface a Keep-a-Changelog-style draft. */
  draftChangelog?: boolean;
  /** If set (with draftChangelog), write the changelog draft to this path instead of only showing it inline. */
  changelogOutputPath?: string;
  /** Per-rule ID → bump overrides, from dg.config.json's versioningOverrides. */
  versioningOverrides?: Record<string, SemverBump>;
}

export interface Reporter {
  render(result: AnalysisResult, config: ReporterConfig): Promise<void>;
}
