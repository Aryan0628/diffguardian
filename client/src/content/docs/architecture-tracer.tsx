import CodeBlock from "@/components/docs/CodeBlock";
import Link from "next/link";

export default function PhaseTracer() {
  return (
    <>
      <h1 style={{ fontFamily: "var(--font-space-grotesk)" }}>Phase 4: Call-Site Tracer</h1>
      <p className="docs-lead">
        The tracer is the final phase. When the classifier identifies a breaking
        change, the tracer answers the question: <strong>&quot;who is affected?&quot;</strong>.
        It scans the entire repository to find every file that imports the broken
        symbol, then counts arguments at each call site to determine if the call
        is already broken.
      </p>

      <hr className="docs-divider" />

      <h2 id="two-tier">Two-tier architecture</h2>
      <p>
        The tracer uses a lazy, two-tier scanning strategy designed for speed
        in large repositories:
      </p>
      <div className="docs-pipeline">
        <div className="docs-pipeline-step">
          <div className="docs-pipeline-num">1</div>
          <div>
            <strong>JIT Scanner (fast pass)</strong>
            <p>Uses <code>git grep</code> to find all files mentioning the symbol name.
            No AST parsing — pure text search on the git index. For a 50,000-file repo,
            this takes approximately 50ms.</p>
          </div>
        </div>
        <div className="docs-pipeline-arrow">|</div>
        <div className="docs-pipeline-step">
          <div className="docs-pipeline-num">2</div>
          <div>
            <strong>Call-Site Tracer (deep pass)</strong>
            <p>AST-parses only the files identified by the scanner. Locates actual
            import statements, resolves aliases, and counts arguments at each call site.
            Typically 5-15 files per broken symbol.</p>
          </div>
        </div>
      </div>

      <h2 id="scanner">JIT Scanner</h2>
      <p>
        The JIT Scanner is the &quot;fast pass&quot; — it narrows down the entire repo to
        just the files that reference the broken symbol.
      </p>

      <h3>Step 1: Git grep</h3>
      <p>
        Runs <code>git grep</code> on the git index at the head ref. This is
        extremely fast because it operates on git&apos;s internal data structures,
        not the filesystem.
      </p>
      <CodeBlock
        language="bash"
        code={`# What the scanner runs internally:
git grep -n --word-regexp 'processPayment' HEAD -- '*.ts' '*.tsx' '*.js' '*.jsx'

# Returns:
# HEAD:src/checkout/handler.ts:18:import { processPayment } from '../payments'
# HEAD:src/invoices/gen.ts:4:import { processPayment } from '@/api/payments'
# HEAD:src/subscriptions/renew.ts:9:processPayment(amount, currency);
# HEAD:src/payments/index.ts:2:export { processPayment } from './core';`}
      />
      <p>Key properties of this approach:</p>
      <ul>
        <li>Reads committed content — not the working tree. Consistent with git refs</li>
        <li>Respects <code>.gitignore</code> automatically. node_modules excluded for free</li>
        <li>Excludes binary files automatically</li>
        <li>Capped at <code>maxGrepResults</code> (default 500) to prevent runaway scans</li>
      </ul>

      <h3>Step 2: Import classification</h3>
      <p>
        For each grep match, the scanner reads the file content and classifies it
        using language-specific import pattern detection. Each language provides a
        <code>LanguageStrategy</code> that knows its import syntax:
      </p>
      <CodeBlock
        language="typescript"
        code={`// TypeScript import patterns:
import { processPayment } from './payments';      // Named import
import { processPayment as pay } from './payments'; // Aliased import
import * as payments from './payments';             // Namespace import
const { processPayment } = require('./payments');   // CJS require
const pay = await import('./payments');              // Dynamic import

// Python import patterns:
from payments import process_payment
from payments import process_payment as pay
import payments  # then: payments.process_payment()

// Go import patterns:
import "project/payments"  // then: payments.ProcessPayment()

// Java import patterns:
import com.project.payments.ProcessPayment;
import static com.project.payments.ProcessPayment;

// Rust import patterns:
use crate::payments::process_payment;
use crate::payments::{process_payment, other_fn};`}
      />

      <h3>Step 3: Barrel file walking</h3>
      <p>
        If a file re-exports the symbol (a barrel file), the scanner adds it to
        a BFS queue and scans its consumers recursively.
      </p>
      <CodeBlock
        language="typescript"
        code={`// src/payments/index.ts (barrel file)
export { processPayment } from './core';

// src/checkout/handler.ts imports from the barrel
import { processPayment } from '../payments';
// The scanner traces: handler.ts → payments/index.ts → payments/core.ts`}
      />
      <p>
        Cycle detection prevents infinite loops in circular re-exports. A <code>visited</code>
        Set tracks every file the scanner has seen. Depth is capped at
        <code>maxBarrelDepth</code> (default 10) for deeply nested barrel architectures.
      </p>

      <h2 id="call-site-tracer">Call-Site Tracer</h2>
      <p>
        After the scanner identifies importer files, the Call-Site Tracer AST-parses
        each one and locates call expressions:
      </p>
      <CodeBlock
        language="typescript"
        code={`// For each confirmed importer file:
// 1. Parse the file into an AST
// 2. Find all call expressions matching the symbol name
// 3. Count arguments at each call site
// 4. Compare against the new signature's required parameter count

// Result per call site:
{
  file: "src/checkout/handler.ts",
  line: 18,
  argumentCount: 3,
  status: "broken"  // provides 3 args, new signature needs max 2
}`}
      />

      <h2 id="output-format">Tracer output</h2>
      <p>
        The tracer populates the <code>callers</code> array on each <code>FunctionChange</code>:
      </p>
      <CodeBlock
        language="typescript"
        filename="core/types.ts"
        code={`interface CallerInfo {
  file: string;            // "src/checkout/handler.ts"
  line: number;            // 18
  column: number;          // 4
  argumentCount: number;   // 3
  importType: string;      // "named", "namespace", "default"
  localName: string;       // "processPayment" or "pay" (if aliased)
  status: 'broken' | 'ok' | 'indeterminate';
}`}
      />

      <h2 id="terminal-output">Terminal output</h2>
      <p>
        The reporter formats tracer results with status indicators:
      </p>
      <CodeBlock
        language="bash"
        code={`  Affected call sites (3):
    X  src/checkout/handler.ts:18 -- provides 3 arg(s), needs max 2
    X  src/invoices/gen.ts:31 -- provides 3 arg(s), needs max 2
    .  src/subscriptions/renew.ts:9 -- 2 arg(s), OK`}
      />
      <ul>
        <li><code>X</code> — broken: argument count does not match the new signature</li>
        <li><code>.</code> — ok: argument count satisfies the new signature</li>
        <li><code>?</code> — indeterminate: call uses spread or computed arguments</li>
      </ul>

      <h2 id="performance">Performance characteristics</h2>
      <div className="docs-table-wrapper">
        <table className="docs-table">
          <thead>
            <tr><th>Operation</th><th>Typical Time</th><th>Bound</th></tr>
          </thead>
          <tbody>
            <tr><td>git grep on 50K-file repo</td><td>~50ms</td><td>O(repo size)</td></tr>
            <tr><td>Import regex on 15 files</td><td>~2ms</td><td>O(grep matches)</td></tr>
            <tr><td>Barrel BFS (3 levels)</td><td>~20ms</td><td>O(barrel depth x width)</td></tr>
            <tr><td>AST parse + call count</td><td>~5ms/file</td><td>O(importer count)</td></tr>
            <tr><td><strong>Total Phase 4</strong></td><td><strong>&lt; 200ms</strong></td><td></td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="configuration">Configuration</h2>
      <div className="docs-table-wrapper">
        <table className="docs-table">
          <thead>
            <tr><th>Option</th><th>Default</th><th>Effect</th></tr>
          </thead>
          <tbody>
            <tr><td><code>enableTracer</code></td><td>true</td><td>Disable entirely for faster CI runs</td></tr>
            <tr><td><code>maxGrepResults</code></td><td>500</td><td>Cap grep output for common symbol names</td></tr>
            <tr><td><code>maxBarrelDepth</code></td><td>10</td><td>Prevent runaway barrel chains</td></tr>
            <tr><td><code>maxTracerFiles</code></td><td>100</td><td>Cap AST-parsed files per symbol</td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="related">Related</h2>
      <ul>
        <li><Link href="/docs/architecture/classifier">Phase 3: Classifier Engine</Link></li>
        <li><Link href="/docs/cli/trace">dg trace</Link> — standalone tracer command</li>
        <li><Link href="/docs/configuration">Configuration</Link> — tracer settings</li>
      </ul>
    </>
  );
}
