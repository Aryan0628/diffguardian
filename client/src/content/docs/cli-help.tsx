import CodeBlock from "@/components/docs/CodeBlock";
import Link from "next/link";

export default function CliHelp() {
  return (
    <>
      <h1 style={{ fontFamily: "var(--font-space-grotesk)" }}>dg --help</h1>
      <p className="docs-lead">
        Display the help menu, listing all available commands, flags, and usage
        patterns. This is the quickest way to see what Diff Guardian can do
        from your terminal.
      </p>

      <hr className="docs-divider" />

      <h2 id="usage">Usage</h2>
      <CodeBlock code={`npx dg --help
npx dg -h
npx dg help`} language="bash" />
      <p>
        All three forms are equivalent. They print the help menu and exit
        with code 0.
      </p>

      <h2 id="output">Output</h2>
      <CodeBlock
        code={`$ npx dg --help

  Diff-Guardian — API Contract Enforcement Engine

  Usage: npx dg <command> [options]

  Commands:
    check              Analyze uncommitted working tree changes
    check --staged     Analyze only staged files
    compare <base>     Compare two git refs
    trace <symbol>     Show all importers and call sites
    rules              List all classification rules
    init               Scaffold config + GitHub Actions workflow

  Options:
    --help, -h         Show this help message
    --version, -v      Print version number
    --report-file      Write JSON report to specified path
    --staged           Limit check to staged files only

  Smart default:
    Running 'npx dg' with no arguments auto-detects the environment:
      - GitHub Actions: compares PR base to head, posts PR comment
      - Local terminal: compares default branch to HEAD, strict mode
      - Git hook:       uses DG_HOOK env var to determine behavior

  Examples:
    npx dg check                  Analyze working tree changes
    npx dg check --staged         Analyze only staged files
    npx dg compare main           Compare main branch to HEAD
    npx dg compare v1.0 v2.0      Compare two tags
    npx dg trace processPayment   Find all importers of a symbol
    npx dg rules                  List all 28 classification rules
    npx dg init                   Create config + CI workflow`}
        language="bash"
      />

      <h2 id="global-flags">Global flags</h2>
      <div className="docs-table-wrapper">
        <table className="docs-table">
          <thead>
            <tr><th>Flag</th><th>Short</th><th>Description</th></tr>
          </thead>
          <tbody>
            <tr><td><code>--help</code></td><td><code>-h</code></td><td>Display the help menu and exit.</td></tr>
            <tr><td><code>--version</code></td><td><code>-v</code></td><td>Print the installed version of diff-guardian.</td></tr>
            <tr><td><code>--report-file &lt;path&gt;</code></td><td>—</td><td>Write a JSON report to the specified file instead of (or in addition to) terminal output.</td></tr>
            <tr><td><code>--staged</code></td><td>—</td><td>When used with <code>check</code>, analyze only files in the git staging area.</td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="version">Version</h2>
      <CodeBlock
        code={`$ npx dg --version
diff-guardian v0.1.3`}
        language="bash"
      />

      <h2 id="smart-default">Smart default behavior</h2>
      <p>
        When <code>npx dg</code> is invoked with no command, it detects the
        environment and chooses the appropriate behavior automatically:
      </p>
      <div className="docs-table-wrapper">
        <table className="docs-table">
          <thead>
            <tr><th>Environment</th><th>Detection</th><th>Behavior</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>GitHub Actions</td>
              <td><code>GITHUB_ACTIONS=true</code></td>
              <td>Compares PR base to head SHA. Posts a PR comment. Always exits 0 (advisory).</td>
            </tr>
            <tr>
              <td>Git hook (pre-push)</td>
              <td><code>DG_HOOK=pre-push</code></td>
              <td>Compares against remote HEAD. Strict mode. Exits 1 on breaking changes.</td>
            </tr>
            <tr>
              <td>Git hook (pre-merge-commit)</td>
              <td><code>DG_HOOK=pre-merge-commit</code></td>
              <td>Compares merge base to incoming branch. Strict mode.</td>
            </tr>
            <tr>
              <td>Git hook (post-merge)</td>
              <td><code>DG_HOOK=post-merge</code></td>
              <td>Generates an advisory report. Never blocks.</td>
            </tr>
            <tr>
              <td>Local terminal</td>
              <td>Default fallback</td>
              <td>Compares the default branch (main/master) to HEAD. Terminal output. Strict mode.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="related">Related</h2>
      <ul>
        <li><Link href="/docs/cli/check">dg check</Link> — analyze uncommitted changes</li>
        <li><Link href="/docs/cli/compare">dg compare</Link> — compare two git refs</li>
        <li><Link href="/docs/cli/trace">dg trace</Link> — find importers of a symbol</li>
        <li><Link href="/docs/cli/init">dg init</Link> — scaffold configuration files</li>
        <li><Link href="/docs/cli/rules">dg rules</Link> — list classification rules</li>
      </ul>
    </>
  );
}
