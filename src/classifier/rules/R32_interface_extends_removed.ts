/**
 * RULE 32: Interface Parent Removed
 * Flags when an interface (or its equivalent construct — a Java interface,
 * a Go embedded interface, or a Rust trait bound) stops extending one of its
 * previous parent interfaces/traits.
 * This is a breaking change because any caller relying on structural
 * compatibility inherited only through that parent relationship — a property,
 * a method, or a trait bound — loses that guarantee. Values that satisfied
 * both the child and the parent's shape no longer need to, and any
 * type-level check written against the parent silently stops applying.
 */

import { InterfaceRule, RuleResult } from '../types';

export const interfaceExtendsRemovedRule: InterfaceRule = {
  id: 'R32',
  name: 'Interface Parent Removed',
  description: 'Flags when an interface stops extending one of its previous parent interfaces/traits.',
  languages: ['typescript', 'java', 'go', 'rust'], // TS/JS interfaces, Java interfaces,
                                                    // Go embedded interfaces, Rust trait bounds.
                                                    // Python has no interface/trait construct.
  target: 'interface',

  check(oldSig, newSig): RuleResult | RuleResult[] | null {
    // Normalize undefined to an empty array so both sides compare uniformly
    const oldParents = oldSig.extends ?? [];
    const newParents = newSig.extends ?? [];

    if (oldParents.length === 0) return null;

    // Order-independent: a same-set reorder must NOT be flagged
    const removed = oldParents.filter(parent => !newParents.includes(parent));

    if (removed.length === 0) return null;

    return removed.map(parent => ({
      severity: 'breaking',
      changeType: 'interface_extends_changed',
      message: `The interface no longer extends '${parent}'. Callers relying on properties or methods inherited from '${parent}' will fail to compile or lose type-level compatibility with it.`,
    }));
  }
};
