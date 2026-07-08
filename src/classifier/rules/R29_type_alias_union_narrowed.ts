/**
 * RULE 29: Type Alias Union Narrowed
 * Flags when a string/number/boolean literal union type alias
 * ("type Status = 'active' | 'inactive'") loses one of its members.
 *
 * This is a hard breaking change: consumers using exhaustive `switch`
 * statements, discriminated unions, or direct literal comparisons against
 * the removed member will fail to compile (in strict mode) or silently
 * mishandle a value they no longer expect to receive.
 *
 * Structured extraction lives in the parser (see `buildTypeAliasSignature()`
 * / `extractUnionLiteralMembers()` in `src/parsers/translators/typescript.ts`),
 * which populates `TypeAliasSignature.unionMembers` only when the alias is
 * a union of literal types. This rule just diffs that array — same pattern
 * as R27's enum member comparison.
 */

import { TypeAliasRule, RuleResult } from '../types';

export const typeAliasUnionNarrowedRule: TypeAliasRule = {
  id: 'R29',
  name: 'Type Alias Union Narrowed',
  description:
    'Flags when a string/number/boolean literal union type alias loses one of its members, breaking exhaustive switch statements and consumers matching on the removed literal.',
  languages: ['typescript'],
  target: 'type_alias',

  check(oldSig, newSig): RuleResult | RuleResult[] | null {
    // Only structured literal unions are analyzed. Complex aliases
    // (generics, object types, mapped/conditional types, or unions that
    // mix in a non-literal member) have unionMembers === undefined and
    // are intentionally left alone to avoid false positives.
    if (!oldSig.unionMembers || !newSig.unionMembers) return null;

    const newSet = new Set(newSig.unionMembers);
    const removed = oldSig.unionMembers.filter(m => !newSet.has(m));

    if (removed.length === 0) return null;

    return {
      severity: 'breaking',
      changeType: 'type_alias_changed',
      message: `Union type alias lost member(s) ${removed.join(', ')}. Consumers using exhaustive switch statements or direct literal comparisons against these values will fail to compile or silently mishandle them.`,
    };
  },
};