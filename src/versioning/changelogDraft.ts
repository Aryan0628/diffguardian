/**
 * src/versioning/changelogDraft.ts
 *
 * Generates a Keep-a-Changelog-style draft changelog entry from the
 * classifier's output (issue #34). Groups changes under the four headers
 * the issue asks for — Breaking Changes / Deprecated / Added / Fixed —
 * with human-readable line items rather than raw rule codes as the
 * headline text (rule IDs are still included, in parentheses, for
 * traceability back to the technical detail).
 *
 * Category mapping (judgment call — flag for maintainer confirmation,
 * since the rule engine doesn't currently emit a dedicated "deprecation"
 * change type):
 *   severity 'breaking'                → Breaking Changes
 *   changeType 'symbol_added'          → Added
 *   changeType 'decorator_changed'     → Deprecated (reserved for when a
 *                                        rule actually emits this type —
 *                                        not currently produced by any
 *                                        rule, included for forward-compat)
 *   everything else (remaining warning
 *   /safe changes: narrowed returns,
 *   widened params, optional params,
 *   overload changes, etc.)           → Fixed
 */

import { FunctionChange } from '../core/types';
import { ChangelogCategory, ChangelogDraft, ChangelogLineItem } from './types';

const CATEGORY_ORDER: ChangelogCategory[] = ['Breaking Changes', 'Deprecated', 'Added', 'Fixed'];

function categorize(change: FunctionChange): ChangelogCategory {
  if (change.severity === 'breaking') return 'Breaking Changes';
  if (change.changeType === 'symbol_added') return 'Added';
  if (change.changeType === 'decorator_changed') return 'Deprecated';
  return 'Fixed';
}

/**
 * Builds a human-readable line-item description for a change. Prefers the
 * rule's own message (already human-authored per-rule) over echoing the
 * raw changeType, and appends the rule ID parenthetically for traceability
 * rather than leading with it.
 */
function describeChange(change: FunctionChange): string {
  const name = change.name?.trim() || '<anonymous>';
  const message = change.message?.trim();
  const base = message || `${change.changeType} in ${name}`;
  const ruleSuffix = change.ruleId ? ` (${change.ruleId})` : '';
  return `**${name}**: ${base}${ruleSuffix}`;
}

/**
 * Generates a Keep-a-Changelog-style draft from classified changes.
 *
 * @param changes All changes to consider (typically AnalysisResult.apiChanges).
 */
export function generateChangelogDraft(changes: FunctionChange[]): ChangelogDraft {
  const entries: ChangelogLineItem[] = (changes || []).map(change => ({
    category: categorize(change),
    text: describeChange(change),
    changeId: change.id,
    ruleId: change.ruleId,
  }));

  const byCategory = new Map<ChangelogCategory, ChangelogLineItem[]>();
  for (const category of CATEGORY_ORDER) byCategory.set(category, []);
  for (const entry of entries) {
    byCategory.get(entry.category)!.push(entry);
  }

  const lines: string[] = [];
  let anyCategoryPopulated = false;

  for (const category of CATEGORY_ORDER) {
    const items = byCategory.get(category)!;
    if (items.length === 0) continue;

    anyCategoryPopulated = true;
    lines.push(`### ${category}`);
    lines.push('');
    for (const item of items) {
      lines.push(`- ${item.text}`);
    }
    lines.push('');
  }

  if (!anyCategoryPopulated) {
    lines.push('_No API surface changes to report._');
    lines.push('');
  }

  return {
    markdown: lines.join('\n').trimEnd() + '\n',
    entries,
  };
}

export default generateChangelogDraft;
