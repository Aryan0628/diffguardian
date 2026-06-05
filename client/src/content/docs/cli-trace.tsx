import CodeBlock from "@/components/docs/CodeBlock";
import Link from "next/link";

export default function CliTrace() {
  return (
    <>
      <h1 style={{ fontFamily: "var(--font-space-grotesk)" }}>dg trace</h1>
      <p className="docs-lead">
        Find every file that imports a given symbol and show exactly where
        it is used. Useful for understanding blast radius before making changes.
      </p>

      <hr className="docs-divider" />

      <h2 id="usage">Usage</h2>
      <CodeBlock code="npx dg trace <symbol-name>" language="bash" />

      <h2 id="examples">Examples</h2>
      <CodeBlock
        code={`# Find all importers of a function
npx dg trace processPayment

# Find all importers of an enum
npx dg trace PaymentStatus

# Find all importers of a type/interface
npx dg trace UserConfig`}
        language="bash"
      />

      <h2 id="how-it-works">How it works</h2>
      <p>
        The trace command runs the JIT Scanner — the same scanner used internally
        by the pipeline&apos;s call-site tracer. It performs a two-step process:
      </p>
      <ol>
        <li>
          <strong>git grep</strong> — fast initial scan to find candidate files that
          mention the symbol name. This is O(repo) but runs in milliseconds thanks
          to git&apos;s built-in index.
        </li>
        <li>
          <strong>AST confirmation</strong> — parses the import statements of each
          candidate file to confirm the symbol is actually imported (not just mentioned
          in a comment or string literal).
        </li>
      </ol>

      <h2 id="barrel-exports">Barrel re-export resolution</h2>
      <p>
        The scanner handles barrel files (<code>index.ts</code>) automatically.
        If <code>processPayment</code> is exported from <code>src/api/payments.ts</code>
        and re-exported through <code>src/api/index.ts</code>, the scanner will follow
        the chain and find consumers that import from the barrel.
      </p>
      <p>
        Re-export chains are followed up to <strong>10 levels deep</strong> (configurable
        via <code>maxBarrelDepth</code> in <Link href="/docs/configuration">dg.config.json</Link>).
      </p>

      <h2 id="output">Import types</h2>
      <p>
        The scanner identifies how each file imports the symbol:
      </p>
      <div className="docs-table-wrapper">
        <table className="docs-table">
          <thead>
            <tr><th>Type</th><th>Example</th></tr>
          </thead>
          <tbody>
            <tr><td><code>static</code></td><td><code>{`import { processPayment } from './api'`}</code></td></tr>
            <tr><td><code>default</code></td><td><code>{`import processPayment from './api'`}</code></td></tr>
            <tr><td><code>aliased</code></td><td><code>{`import { processPayment as pay } from './api'`}</code></td></tr>
            <tr><td><code>re-export</code></td><td><code>{`export { processPayment } from './payments'`}</code></td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="example-output">Example output</h2>
      <CodeBlock
        code={`$ npx dg trace processPayment

  Diff-Guardian Trace: processPayment
  Scanning repo for importers...

  processPayment -- 3 importer(s) found

  src/checkout/handler.ts
    L4  processPayment  [static]
  src/invoices/gen.ts
    L2  processPayment  [static]
  tests/payments.test.ts
    L1  processPayment  [static]

  Total: 3 import(s) across 3 file(s)`}
        language="bash"
      />

      <h2 id="related">Related</h2>
      <ul>
        <li><Link href="/docs/how-it-works">How It Works</Link> — how tracing fits into the pipeline</li>
        <li><Link href="/docs/configuration">Configuration</Link> — tuning tracer limits</li>
      </ul>
    </>
  );
}
