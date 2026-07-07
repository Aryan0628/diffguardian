/**
 * RULE 29: Union Literal Member Removed
 * Flags when a type alias defined as a union of string or numeric literals
 * ("type Status = 'active' | 'inactive'") loses one of its literal members.
 *
 * This is a hard breaking change: consumers using exhaustive `switch`
 * statements, discriminated unions, or direct literal comparisons against
 * the removed member will fail to compile (in strict mode) or silently
 * mishandle a value they no longer expect to receive.
 *
 * Scope: Only fires on "simple" literal unions (every member is a quoted
 * string or a numeric literal). Complex aliases (generics, object shapes,
 * mapped types, conditional types, etc.) are intentionally left alone to
 * avoid false positives — see splitTopLevelUnion() below.
 */

import { TypeAliasRule, RuleResult } from '../types';

/**
 * Splits a raw type-alias value string on top-level `|` characters, ignoring
 * any `|` found inside (), [], {}, or <> so nested unions/generics don't get
 * sliced apart incorrectly.
 *
 * Example: "'a' | 'b' | Array<'c' | 'd'>" -> ["'a'", "'b'", "Array<'c' | 'd'>"]
 */
function splitTopLevelUnion(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';

  for (const char of value) {
    if ('([{<'.includes(char)) depth++;
    if (')]}>'.includes(char)) depth--;

    if (char === '|' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim().length > 0) {
    parts.push(current.trim());
  }

  return parts.filter(p => p.length > 0);
}

/** Matches a single-quoted, double-quoted, or numeric literal member. */
const LITERAL_PATTERN = /^(['"]).*\1$|^-?\d+(\.\d+)?$/;

/** Returns true only if every member of the union is a literal (string/number). */
function isSimpleLiteralUnion(members: string[]): boolean {
  return members.length > 0 && members.every(m => LITERAL_PATTERN.test(m));
}

export const unionLiteralRemovedRule: TypeAliasRule = {
  id: 'R29',
  name: 'Union Literal Member Removed',
  description:
    'Flags when a string/numeric literal union type alias loses one of its members, breaking exhaustive switch statements and consumers matching on the removed literal.',
  languages: ['typescript'],
  target: 'type_alias',

  check(oldSig, newSig): RuleResult | RuleResult[] | null {
    const oldMembers = splitTopLevelUnion(oldSig.value);
    const newMembers = splitTopLevelUnion(newSig.value);

    // Only analyze "simple" literal unions to avoid false positives on
    // generics, object types, mapped types, or conditional types.
    if (!isSimpleLiteralUnion(oldMembers) || !isSimpleLiteralUnion(newMembers)) {
      return null;
    }

    const newSet = new Set(newMembers);
    const removed = oldMembers.filter(m => !newSet.has(m));

    if (removed.length === 0) return null;

    return {
      severity: 'breaking',
      changeType: 'type_alias_changed',
      message: `Union type alias lost member(s) ${removed.join(', ')}. Consumers using exhaustive switch statements or direct literal comparisons against these values will fail to compile or silently mishandle them.`,
    };
  },
};
