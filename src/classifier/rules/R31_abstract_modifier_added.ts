/**
 * RULE 31: Abstract Modifier Added
 * Flags when a concrete method gains the `abstract` modifier.
 * This is a breaking change because every existing subclass that does not
 * already override this method was previously inheriting a working default
 * implementation. Once the method becomes abstract, that default is gone —
 * those subclasses will fail to compile until they supply their own
 * implementation.
 *
 * The reverse direction (abstract → concrete) is safe and non-breaking, but
 * still reported as an advisory `safe` result: subclasses now have an
 * optional default implementation available, and downstream developers may
 * want to know they can delete their now-unnecessary override boilerplate.
 */

import { FunctionRule, RuleResult } from '../types';

export const abstractModifierAddedRule: FunctionRule = {
  id: 'R31',
  name: 'Abstract Modifier Added',
  description: 'Flags when a concrete method is changed to abstract, forcing every subclass to supply its own implementation.',
  languages: 'all',
  target: 'function',

  check(oldSig, newSig): RuleResult | null {
    // Normalize undefined to false for safe boolean comparison
    const wasAbstract = oldSig.isAbstract === true;
    const isAbstractNow = newSig.isAbstract === true;

    if (!wasAbstract && isAbstractNow) {
      return {
        severity: 'breaking',
        changeType: 'modifier_changed',
        message: `Method '${newSig.name}' was made abstract. Every existing subclass that does not already override this method will fail to compile, since a concrete implementation is no longer inherited.`,
      };
    }

    if (wasAbstract && !isAbstractNow) {
      return {
        severity: 'safe',
        changeType: 'modifier_changed',
        message: `Method '${newSig.name}' is no longer abstract and now has a default implementation. Existing subclass overrides remain valid and are now optional — safe to remove if the default is sufficient.`,
      };
    }

    return null;
  },
};
