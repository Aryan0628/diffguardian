import CodeBlock from "@/components/docs/CodeBlock";
import Link from "next/link";

export default function CliCheck() {
  return (
    <>
      <h1 style={{ fontFamily: "var(--font-space-grotesk)" }}>dg check</h1>
      <p className="docs-lead">
        Analyze uncommitted or staged changes in your working tree against HEAD.
        This is the fastest way to see what you have broken before committing.
      </p>

      <hr className="docs-divider" />

      <h2 id="usage">Usage</h2>
      <CodeBlock code={`npx dg check              # Analyze all uncommitted changes
npx dg check --staged     # Analyze only staged files (git add'd)
npx dg check src/payments # Scope analysis to a directory`} language="bash" />

      <h2 id="how-it-works">How it works</h2>
      <p>
        In <strong>working tree mode</strong> (default), Diff Guardian reads the current
        file on disk as the &quot;new&quot; source and <code>HEAD</code> as the &quot;old&quot; source.
        It compares every exported symbol between the two versions.
      </p>
      <p>
        In <strong>staged mode</strong> (<code>--staged</code>), it reads the git index
        (what you have <code>git add</code>&apos;d) instead of the working tree. This is
        what will actually land in your next commit.
      </p>

      <h2 id="path-scoping">Path scoping</h2>
      <p>
        You can pass a path argument to limit the analysis to a specific directory.
        This is useful in monorepos where you only want to check one package:
      </p>
      <CodeBlock code={`npx dg check src/api      # Only analyze files under src/api/
npx dg check packages/core # Monorepo: scope to one package`} language="bash" />

      <h2 id="exit-codes">Exit codes</h2>
      <div className="docs-table-wrapper">
        <table className="docs-table">
          <thead>
            <tr><th>Code</th><th>Meaning</th></tr>
          </thead>
          <tbody>
            <tr><td><code>0</code></td><td>No breaking changes. Safe to proceed.</td></tr>
            <tr><td><code>1</code></td><td>Breaking changes detected. Review required.</td></tr>
            <tr><td><code>2</code></td><td>Pipeline error (missing grammar, parse failure).</td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="flags">Flags</h2>
      <div className="docs-table-wrapper">
        <table className="docs-table">
          <thead>
            <tr><th>Flag</th><th>Description</th></tr>
          </thead>
          <tbody>
            <tr><td><code>--staged</code></td><td>Analyze only staged (git add&apos;d) files instead of the full working tree.</td></tr>
            <tr><td><code>--report-file &lt;path&gt;</code></td><td>Write a JSON report to the specified file path.</td></tr>
            <tr><td><code>--help, -h</code></td><td>Show help message.</td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="example">Example output</h2>
      <CodeBlock
        code={`$ npx dg check --staged

  Diff-Guardian Check (staged)

  [BREAKING] Changes (1)

  > processPayment (signature_change)
    src/api/payments.ts:42
    Parameter 'currency' was removed. Callers providing this argument will fail.

  ────────────────────────────────────────
  [STRICT MODE]
  1 breaking change found. Exiting with code 1.`}
        language="bash"
      />

      <h2 id="related">Related</h2>
      <ul>
        <li><Link href="/docs/cli/compare">dg compare</Link> — compare two branches directly</li>
        <li><Link href="/docs/git-hooks">Git Hooks</Link> — auto-run check on push and merge</li>
      </ul>
    </>
  );
}
