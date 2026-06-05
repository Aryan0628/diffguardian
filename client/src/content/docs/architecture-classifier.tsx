import CodeBlock from "@/components/docs/CodeBlock";
import Link from "next/link";

export default function PhaseClassifier() {
  return (
    <>
      <h1 style={{ fontFamily: "var(--font-space-grotesk)" }}>Phase 3: Classifier Engine</h1>
      <p className="docs-lead">
        The Classifier Engine receives parsed signatures from Phase 2 and determines
        what changed. It compares old vs new signatures using bucketed classification
        rules and assigns a severity to each change: breaking, warning, or safe.
      </p>

      <hr className="docs-divider" />

      <h2 id="classification-flow">Classification flow</h2>
      <p>
        For each file&apos;s <code>ParseResult</code>, the engine iterates every signature
        key across both old and new maps. There are three cases:
      </p>
      <div className="docs-pipeline">
        <div className="docs-pipeline-step">
          <div className="docs-pipeline-num">A</div>
          <div>
            <strong>Symbol deleted</strong>
            <p>Key exists in old but not new. Always classified as <code className="docs-severity-breaking">BREAKING</code>. The symbol was removed from the public API.</p>
          </div>
        </div>
        <div className="docs-pipeline-arrow">|</div>
        <div className="docs-pipeline-step">
          <div className="docs-pipeline-num">B</div>
          <div>
            <strong>Symbol added</strong>
            <p>Key exists in new but not old. Always classified as <code className="docs-severity-safe">SAFE</code>. The API surface expanded.</p>
          </div>
        </div>
        <div className="docs-pipeline-arrow">|</div>
        <div className="docs-pipeline-step">
          <div className="docs-pipeline-num">C</div>
          <div>
            <strong>Symbol changed</strong>
            <p>Key exists in both. Deep-equal check, then run through rule engine if signatures differ.</p>
          </div>
        </div>
      </div>

      <h2 id="deep-equal">Deep equality short-circuit</h2>
      <p>
        Before running any rules, the engine performs a <code>deepStrictEqual</code> check
        on the old and new signatures. If they are identical, the symbol is skipped entirely.
        This is a massive performance optimization for files where only implementation
        changed (function body rewritten) but the API surface stayed the same.
      </p>
      <CodeBlock
        language="typescript"
        code={`// If signatures are structurally identical, skip all rules
if (isDeepStrictEqual(oldSig, newSig)) continue;

// Otherwise, run through the rule engine
const violations = this.runRules(key, oldSig, newSig, ruleBuckets);`}
      />

      <h2 id="bucketed-routing">Bucketed rule routing</h2>
      <p>
        The engine pre-computes four rule buckets at startup — one per symbol type.
        When a symbol change is detected, only the rules in the matching bucket execute.
        This is <strong>O(1) routing</strong> instead of O(n) filtering:
      </p>
      <CodeBlock
        language="typescript"
        filename="classifier/engine.ts"
        code={`// Pre-computed ONCE per file — not per symbol
const allRules = Object.values(rules) as Rule<any>[];
const activeRules = allRules.filter(r =>
  r.languages === 'all' || r.languages.includes(language)
);

const ruleBuckets = {
  function:   activeRules.filter(r => r.target === 'function'),
  interface:  activeRules.filter(r => r.target === 'interface'),
  enum:       activeRules.filter(r => r.target === 'enum'),
  type_alias: activeRules.filter(r => r.target === 'type_alias'),
};`}
      />
      <p>
        Routing uses the key prefix convention established by the AST Mapper:
      </p>
      <CodeBlock
        language="typescript"
        code={`// O(1) routing — no iteration through all rules
if (key.startsWith('interface:')) rulesToRun = buckets.interface;
else if (key.startsWith('enum:'))  rulesToRun = buckets.enum;
else if (key.startsWith('type:'))  rulesToRun = buckets.type_alias;
else                               rulesToRun = buckets.function;`}
      />

      <h2 id="rule-contract">The rule contract</h2>
      <p>
        Every classification rule implements a strict contract defined in
        <code>classifier/types.ts</code>. The engine executes rules without
        knowing their internal logic:
      </p>
      <CodeBlock
        language="typescript"
        filename="classifier/types.ts"
        code={`interface Rule<T extends AnySignature> {
  id: string;            // e.g., 'R01'
  name: string;          // e.g., 'Parameter Removed'
  description: string;   // For documentation

  // Which languages this rule applies to
  languages: Language[] | 'all';

  // Which symbol type this rule processes
  target: 'function' | 'interface' | 'enum' | 'type_alias';

  // The core logic — receives old and new signatures
  check: (oldSig: T, newSig: T) => RuleResult | RuleResult[] | null;
}

interface RuleResult {
  severity: 'breaking' | 'warning' | 'safe';
  changeType: ChangeType;
  message: string;
}`}
      />
      <p>
        Rules can return:
      </p>
      <ul>
        <li><code>null</code> — the rule passed, no violation</li>
        <li>A single <code>RuleResult</code> — one violation found</li>
        <li>An array of <code>RuleResult[]</code> — multiple violations (e.g., R25 per-property)</li>
      </ul>

      <h2 id="language-filtering">Language filtering</h2>
      <p>
        Each rule specifies which languages it applies to. Rules like R15 (Overload
        Removed) only apply to TypeScript and Java because other languages do not
        have function overloads. The engine filters rules by language before bucketing:
      </p>
      <CodeBlock
        language="typescript"
        code={`// Rule definition
export const overloadRemovedRule: FunctionRule = {
  id: 'R15',
  name: 'Overload Removed',
  languages: ['typescript', 'java'],  // Only TS and Java
  target: 'function',
  // ...
};

// Engine: only loads this rule for .ts and .java files
const activeRules = allRules.filter(r =>
  r.languages === 'all' || r.languages.includes(language)
);`}
      />

      <h2 id="output-format">Output: FunctionChange[]</h2>
      <CodeBlock
        language="typescript"
        filename="core/types.ts"
        code={`interface FunctionChange {
  id: string;               // "src/api/payments.ts:processPayment:42"
  name: string;             // "processPayment"
  file: string;             // "src/api/payments.ts"
  lineStart: number;        // 42
  lineEnd: number;          // 42
  language: Language;        // "typescript"
  symbolType: 'function' | 'interface' | 'enum' | 'type_alias';
  severity: Severity;       // "breaking"
  changeType: ChangeType;   // "signature_change"
  breaking: boolean;        // true
  message: string;          // "Parameter 'currency' was removed."
  before: AnySignature | null;
  after: AnySignature | null;
  callers: CallerInfo[];    // Populated by Phase 4
}`}
      />
      <p>
        Results are sorted by line number (ascending) for deterministic output.
      </p>

      <h2 id="next">Next phase</h2>
      <p>
        Breaking changes are passed to{" "}
        <Link href="/docs/architecture/tracer">Phase 4: Call-Site Tracer</Link>, which
        finds every file that imports the broken symbol and traces argument counts.
      </p>
    </>
  );
}
