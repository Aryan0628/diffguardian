import CodeBlock from "@/components/docs/CodeBlock";
import Link from "next/link";

export default function CliCompare() {
  return (
    <>
      <h1 style={{ fontFamily: "var(--font-space-grotesk)" }}>dg compare</h1>
      <p className="docs-lead">
        Compare two git refs — branches, tags, or commit SHAs — and
        detect every structural API change between them.
      </p>

      <hr className="docs-divider" />

      <h2 id="usage">Usage</h2>
      <CodeBlock code={`npx dg compare <base> [head]`} language="bash" />
      <p>
        <code>base</code> is required. <code>head</code> defaults to <code>HEAD</code> if omitted.
      </p>

      <h2 id="examples">Examples</h2>
      <CodeBlock
        code={`# Compare current branch against main
npx dg compare main

# Compare two specific branches
npx dg compare main feature/payments

# Compare two release tags
npx dg compare v1.0.0 v2.0.0

# Compare last 3 commits
npx dg compare HEAD~3 HEAD

# Compare a specific commit SHA
npx dg compare abc1234 def5678`}
        language="bash"
      />

      <h2 id="how-it-works">How it works</h2>
      <p>
        The compare command runs the full 4-phase pipeline:
      </p>
      <ol>
        <li>Extracts full source from both <code>base</code> and <code>head</code> for every changed file</li>
        <li>Parses both sides into ASTs using the appropriate WASM Tree-Sitter grammar</li>
        <li>Classifies every signature difference using the rule engine</li>
        <li>Traces call sites for any breaking changes found</li>
      </ol>

      <h2 id="smart-default">Smart default mode</h2>
      <p>
        If you run <code>npx dg</code> with no command at all, Diff Guardian
        auto-detects your environment:
      </p>
      <div className="docs-table-wrapper">
        <table className="docs-table">
          <thead>
            <tr><th>Environment</th><th>Behavior</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>GitHub Actions (<code>GITHUB_ACTIONS=true</code>)</td>
              <td>Compares PR base to head SHA. Posts a PR comment. Always exits 0 (advisory).</td>
            </tr>
            <tr>
              <td>Local terminal</td>
              <td>Compares the default branch (main/master) to HEAD. Terminal output. Strict mode.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="exit-codes">Exit codes</h2>
      <div className="docs-table-wrapper">
        <table className="docs-table">
          <thead>
            <tr><th>Code</th><th>Meaning</th></tr>
          </thead>
          <tbody>
            <tr><td><code>0</code></td><td>No breaking changes found.</td></tr>
            <tr><td><code>1</code></td><td>Breaking changes detected (strict mode).</td></tr>
            <tr><td><code>2</code></td><td>Pipeline infrastructure error.</td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="example-output">Example output</h2>
      <CodeBlock
        code={`$ npx dg compare main feature/payments

  Diff-Guardian API Analysis
  Base: main -> Head: feature/payments
  ────────────────────────────────────────

  [BREAKING] Changes (2)

  > processPayment (signature_change)
    src/api/payments.ts:42
    R01: Parameter 'currency' was removed.
    Affected call sites (3):
      X  src/checkout/handler.ts:18 -- provides 3 arg(s), needs 2
      OK src/invoices/gen.ts:31 -- Fixed by developer in this PR
      . 1 other call site(s) have correct arguments

  > UserConfig (interface_property_removed)
    src/types/config.ts:8
    R26: Property 'timeout' was removed from interface.

  ────────────────────────────────────────
  [STRICT MODE]
  2 breaking changes found. Exiting with code 1.`}
        language="bash"
      />

      <h2 id="related">Related</h2>
      <ul>
        <li><Link href="/docs/cli/check">dg check</Link> — analyze uncommitted changes</li>
        <li><Link href="/docs/ci-cd">CI/CD Integration</Link> — auto-run compare on PRs</li>
        <li><Link href="/docs/how-it-works">How It Works</Link> — full pipeline explained</li>
      </ul>
    </>
  );
}
