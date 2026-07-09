/**
 * RULE 30: Generator Function Toggle
 * Flags when a function adds or removes the `function*` (generator) modifier.
 * This is a breaking change in both directions because the calling convention
 * changes entirely: a generator function returns an iterator that callers must
 * consume with `for...of`, `.next()`, or the spread operator, while a regular
 * function returns its value directly. Code written for one convention throws
 * or silently misbehaves against the other.
 */

import { FunctionRule, RuleResult } from '../types';

export const generatorToggledRule: FunctionRule = {
  id: 'R30',
  name: 'Generator Function Toggle',
  description: 'Flags when a function switches between generator and regular execution semantics.',
  languages: ['typescript', 'python'], // only these translators populate isGenerator —
                                        // Java/Go/Rust have no generator-function construct
                                        // and set isGenerator: undefined unconditionally
  target: 'function',

  check(oldSig, newSig): RuleResult | null {
    // Normalize undefined to false for safe boolean comparison
    const wasGenerator = oldSig.isGenerator === true;
    const isGeneratorNow = newSig.isGenerator === true;

    if (wasGenerator !== isGeneratorNow) {
      const direction = isGeneratorNow
        ? 'a regular function to a generator'
        : 'a generator to a regular function';

      return {
        severity: 'breaking',
        changeType: 'modifier_changed',
        message: `Function was converted from ${direction}. Callers relying on the previous calling convention (direct return value vs. the iterator protocol) will break.`,
      };
    }
    
    return null;
  }
};
