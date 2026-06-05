import CodeBlock from "@/components/docs/CodeBlock";
import Link from "next/link";

export default function GitHooks() {
  return (
    <>
      <h1 style={{ fontFamily: "var(--font-space-grotesk)" }}>Git Hooks</h1>
      <p className="docs-lead">
        Diff Guardian integrates with Husky to provide three git hooks:
        pre-push (strict gatekeeper), pre-merge-commit, and post-merge.
        Together they enforce API contracts at every critical git operation,
        preventing breaking changes from reaching shared branches.
      </p>

      <hr className="docs-divider" />

      {/* ─── SETUP ──────────────────────────────────────────────────────────── */}
      <h2 id="setup">Setup</h2>
      <p>
        Diff Guardian hooks are configured through{" "}
        <a href="https://typicode.github.io/husky/" target="_blank" rel="noopener noreferrer">Husky</a>.
        If you already have Husky set up, add the hook scripts to your <code>.husky/</code> directory.
        If not, install Husky first:
      </p>
      <CodeBlock
        code={`# Install Husky (if not already installed)
npm install --save-dev husky
npx husky init`}
        language="bash"
      />
      <p>
        After initializing Husky, create each hook file described below inside the
        <code>.husky/</code> directory. Husky will automatically invoke these scripts
        at the appropriate git lifecycle events.
      </p>

      <hr className="docs-divider" />

      {/* ─── PRE-PUSH ───────────────────────────────────────────────────────── */}
      <h2 id="pre-push">Pre-push hook</h2>
      <p>
        The primary enforcement point. This hook runs the full Diff Guardian pipeline
        before every <code>git push</code>. If breaking changes are detected,
        the push is <strong>blocked</strong> with exit code 1 and no data leaves
        your local machine.
      </p>
      <CodeBlock
        filename=".husky/pre-push"
        language="bash"
        code={`#!/bin/sh

# Node version guard
NODE_MAJOR=$(node -e "process.stdout.write(process.versions.node.split('.')[0])" 2>/dev/null)
if [ -z "$NODE_MAJOR" ] || [ "$NODE_MAJOR" -lt 18 ]; then
  echo " [diff-guardian] Skipping: requires Node.js 18 or higher."
  exit 0
fi

# VS Code Source Control UI — advisory mode
if [ -n "$VSCODE_GIT_ASKPASS_MAIN" ] && [ ! -t 1 ]; then
  NODE_OPTIONS="--max-old-space-size=512" DG_HOOK=pre-push npx dg --report-file .dg-report.json || true
  exit 0
fi

# Terminal — strict gatekeeper
echo " Diff-Guardian: Running pre-push API contract gatekeeper..."
NODE_OPTIONS="--max-old-space-size=512" DG_HOOK=pre-push npx dg`}
      />

      {/* ─── PUSH BLOCKING ───────────────────────────────────────────────── */}
      <h3 id="push-blocking">How push blocking works</h3>
      <p>
        When you run <code>git push</code> in the terminal, Git invokes the
        pre-push hook <strong>before</strong> transmitting any objects to the
        remote. The hook runs <code>npx dg</code>, which executes the full
        4-phase pipeline (diff, parse, classify, trace). If any breaking change
        is detected, the CLI exits with code 1.
      </p>
      <p>
        Git interprets a non-zero exit code from a hook as &quot;abort the
        operation.&quot; The push is cancelled immediately. Nothing is sent to
        the remote. This is the exact same mechanism Git uses for pre-commit
        hooks — it is standard Git behavior, not a Diff Guardian workaround.
      </p>
      <h4>What the developer sees</h4>
      <p>
        When a push is blocked, the terminal output looks like this:
      </p>
      <CodeBlock
        code={`$ git push origin feature/payments

 Diff-Guardian: Running pre-push API contract gatekeeper...

  Diff-Guardian API Analysis
  Base: main -> Head: feature/payments

  [BREAKING] Changes (2)

  > processPayment (signature_change)
    src/api/payments.ts:42
    R01: Parameter 'currency' was removed.
    Affected call sites (3):
      X  src/checkout/handler.ts:18 -- provides 3 arg(s), needs 2
      OK src/invoices/gen.ts:31 -- Fixed by developer in this PR

  > UserConfig (interface_property_removed)
    src/types/config.ts:8
    R26: Property 'timeout' was removed from interface.

  ────────────────────────────────────────
  [STRICT MODE]
  2 breaking changes found. Exiting with code 1.

error: failed to push some refs to 'origin'
hint: the pre-push hook returned exit code 1`}
        language="bash"
      />
      <p>
        The developer must fix the breaking changes (or add the removed parameter
        back, update the interface, etc.) and commit again before the push will
        succeed.
      </p>

      {/* ─── EXIT CODES ──────────────────────────────────────────────────── */}
      <h3 id="pre-push-exit-codes">Exit codes</h3>
      <div className="docs-table-wrapper">
        <table className="docs-table">
          <thead>
            <tr><th>Code</th><th>Meaning</th><th>Git behavior</th></tr>
          </thead>
          <tbody>
            <tr><td><code>0</code></td><td>No breaking changes found. API contract is intact.</td><td>Push proceeds normally.</td></tr>
            <tr><td><code>1</code></td><td>Breaking changes detected. Strict mode engaged.</td><td>Push is blocked. Nothing is sent to the remote.</td></tr>
            <tr><td><code>2</code></td><td>Infrastructure error (missing grammar, OOM).</td><td>Hook treats this as a failure and blocks the push to be safe.</td></tr>
          </tbody>
        </table>
      </div>

      <hr className="docs-divider" />

      {/* ─── BYPASSING HOOKS ─────────────────────────────────────────────── */}
      <h2 id="bypassing-hooks">Bypassing hooks with --no-verify</h2>
      <p>
        Git provides a built-in escape hatch: the <code>--no-verify</code> flag
        (also <code>-n</code>). When you pass this flag, Git skips <strong>all</strong>
        client-side hooks for that operation — including the Diff Guardian hook.
      </p>

      <h3 id="bypass-push">Bypassing pre-push</h3>
      <CodeBlock code="git push --no-verify" language="bash" />
      <p>
        This sends your commits to the remote without running the pre-push hook.
        The push will succeed regardless of whether breaking changes exist.
      </p>
      <h4>When to use it</h4>
      <ul>
        <li>
          <strong>Hotfixes</strong> — You need to ship a critical fix immediately
          and will address the API contract issue in a follow-up.
        </li>
        <li>
          <strong>Documentation-only changes</strong> — You know your commit only
          touches markdown or non-code files, and you want to skip the analysis time.
        </li>
        <li>
          <strong>Intentional breaking changes</strong> — You have already coordinated
          the breaking change with your team and want to push it through.
        </li>
      </ul>
      <h4>What the developer sees</h4>
      <CodeBlock
        code={`$ git push --no-verify origin feature/hotfix

Enumerating objects: 5, done.
Counting objects: 100% (5/5), done.
Writing objects: 100% (3/3), 312 bytes | 312.00 KiB/s, done.
Total 3 (delta 2), reused 0 (delta 0)
To github.com:your-org/your-repo.git
   abc1234..def5678  feature/hotfix -> feature/hotfix`}
        language="bash"
      />
      <p>
        Notice that the Diff Guardian analysis line is completely absent. Git
        did not invoke the hook at all.
      </p>

      <h3 id="bypass-merge">Bypassing pre-merge-commit</h3>
      <CodeBlock code="git merge --no-verify feature/payments" language="bash" />
      <p>
        This merges the branch without running the pre-merge-commit hook.
        The merge commit is created immediately without API analysis. The
        post-merge hook will still fire after the merge completes.
      </p>

      <h4>What the developer sees</h4>
      <CodeBlock
        code={`$ git merge --no-verify feature/payments

Merge made by the 'ort' strategy.
 src/api/payments.ts | 12 ++++++------
 src/types/config.ts |  3 +--
 2 files changed, 7 insertions(+), 8 deletions(-)

# Note: post-merge hook still runs (advisory only)
 Diff-Guardian: Generating post-merge API report...`}
        language="bash"
      />

      <hr className="docs-divider" />

      {/* ─── PRE-MERGE-COMMIT ────────────────────────────────────────────── */}
      <h2 id="pre-merge-commit">Pre-merge-commit hook</h2>
      <p>
        Runs before a merge commit is created. Catches breaking changes at the
        point of merging a feature branch into main. Like the pre-push hook,
        it blocks the operation with exit code 1 if breaking changes are found.
      </p>
      <CodeBlock
        filename=".husky/pre-merge-commit"
        language="bash"
        code={`#!/bin/sh

NODE_MAJOR=$(node -e "process.stdout.write(process.versions.node.split('.')[0])" 2>/dev/null)
if [ -z "$NODE_MAJOR" ] || [ "$NODE_MAJOR" -lt 18 ]; then
  echo " [diff-guardian] Skipping: requires Node.js 18+."
  exit 0
fi

echo " Diff-Guardian: Running pre-merge API audit..."
NODE_OPTIONS="--max-old-space-size=512" DG_HOOK=pre-merge-commit npx dg`}
      />

      <h3 id="merge-blocking">What a blocked merge looks like</h3>
      <CodeBlock
        code={`$ git merge feature/payments

 Diff-Guardian: Running pre-merge API audit...

  Diff-Guardian API Analysis
  Base: main -> Head: feature/payments

  [BREAKING] Changes (1)

  > processPayment (signature_change)
    src/api/payments.ts:42
    R01: Parameter 'currency' was removed.

  ────────────────────────────────────────
  [STRICT MODE]
  1 breaking change found. Exiting with code 1.

Automatic merge failed; fix conflicts and then commit the result.`}
        language="bash"
      />

      <hr className="docs-divider" />

      {/* ─── FAST-FORWARD MERGES ─────────────────────────────────────────── */}
      <h2 id="fast-forward">Fast-forward merges</h2>
      <p>
        A fast-forward merge moves the branch pointer forward without creating
        a merge commit. Since there is no merge commit, the <code>pre-merge-commit</code>
        hook <strong>does not fire</strong>.
      </p>
      <p>
        This is standard Git behavior. A fast-forward merge is essentially the
        same as moving a label — no new commit is created, so no commit hook runs.
      </p>
      <div className="docs-table-wrapper">
        <table className="docs-table">
          <thead>
            <tr><th>Merge strategy</th><th>pre-merge-commit</th><th>post-merge</th><th>Notes</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><code>git merge feature</code> (creates commit)</td>
              <td>Fires</td>
              <td>Fires</td>
              <td>Full protection. Both hooks run.</td>
            </tr>
            <tr>
              <td><code>git merge --ff feature</code> (fast-forward)</td>
              <td>Does not fire</td>
              <td>Fires</td>
              <td>Only post-merge provides advisory output.</td>
            </tr>
            <tr>
              <td><code>git merge --no-ff feature</code> (force commit)</td>
              <td>Fires</td>
              <td>Fires</td>
              <td>Same as regular merge. Full protection.</td>
            </tr>
            <tr>
              <td><code>git merge --squash feature</code></td>
              <td>Does not fire</td>
              <td>Does not fire</td>
              <td>Neither hook fires. Use <code>dg check --staged</code> instead.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        If you want to ensure the pre-merge-commit hook always runs, configure
        your workflow to use <code>--no-ff</code> merges:
      </p>
      <CodeBlock code={`# Force merge commits (recommended for protected branches)
git config merge.ff false`} language="bash" />

      <hr className="docs-divider" />

      {/* ─── POST-MERGE ──────────────────────────────────────────────────── */}
      <h2 id="post-merge">Post-merge hook</h2>
      <p>
        Runs after a merge completes (both fast-forward and regular merges).
        Generates a report of API changes that were just merged, without blocking.
        This hook is purely informational — it creates an audit trail.
      </p>
      <CodeBlock
        filename=".husky/post-merge"
        language="bash"
        code={`#!/bin/sh

NODE_MAJOR=$(node -e "process.stdout.write(process.versions.node.split('.')[0])" 2>/dev/null)
if [ -z "$NODE_MAJOR" ] || [ "$NODE_MAJOR" -lt 18 ]; then
  exit 0
fi

echo " Diff-Guardian: Generating post-merge API report..."
NODE_OPTIONS="--max-old-space-size=512" DG_HOOK=post-merge npx dg --report-file .dg-report.json || true`}
      />
      <p>
        The <code>|| true</code> at the end ensures the hook never fails. Post-merge
        is advisory — it should never interrupt the developer&apos;s workflow. The
        report is written to <code>.dg-report.json</code> for later review.
      </p>

      <hr className="docs-divider" />

      {/* ─── VS CODE SYNC ────────────────────────────────────────────────── */}
      <h2 id="vscode-sync">VS Code Source Control (Sync Changes)</h2>
      <p>
        When you click &quot;Sync Changes&quot; in VS Code&apos;s Source Control
        panel (or use the sync button in the status bar), VS Code performs a
        <code>git pull</code> followed by a <code>git push</code> behind the
        scenes. This push triggers the pre-push hook, but with a critical
        difference: it runs in a <strong>non-interactive environment</strong>.
      </p>

      <h3 id="vscode-detection">How Diff Guardian detects VS Code</h3>
      <p>
        The hook script checks two conditions to determine if it is running
        inside VS Code&apos;s Source Control panel:
      </p>
      <ol>
        <li>
          <code>VSCODE_GIT_ASKPASS_MAIN</code> is set — VS Code sets this
          environment variable in its child processes to handle authentication prompts.
        </li>
        <li>
          <code>! -t 1</code> — Standard output is not a TTY (terminal). This
          distinguishes the Source Control panel from VS Code&apos;s integrated terminal.
        </li>
      </ol>
      <p>
        When both conditions are true, the hook switches to <strong>advisory mode</strong>:
      </p>
      <ul>
        <li>The push <strong>always goes through</strong> (the hook exits 0 regardless of results).</li>
        <li>A <code>.dg-report.json</code> file is written to the project root with the full analysis.</li>
        <li>If you have the integrated terminal open, a push from it uses the strict gatekeeper path instead.</li>
      </ul>

      <h3 id="vscode-workflow">Complete VS Code workflow</h3>
      <ol>
        <li>Developer makes changes and commits via Source Control panel.</li>
        <li>Developer clicks &quot;Sync Changes&quot; (or the cloud upload icon).</li>
        <li>VS Code runs <code>git push</code> internally.</li>
        <li>Pre-push hook detects the VS Code environment and runs in advisory mode.</li>
        <li>
          Push completes successfully. A <code>.dg-report.json</code> file appears
          in the project root.
        </li>
        <li>
          Developer opens the report file in VS Code to review any flagged changes.
          The file is JSON with a structured format showing breaking changes,
          warnings, and safe changes.
        </li>
      </ol>

      <h3 id="vscode-report">Report file format</h3>
      <CodeBlock
        filename=".dg-report.json"
        language="json"
        code={`{
  "timestamp": "2026-04-17T10:30:00Z",
  "hook": "pre-push",
  "base": "main",
  "head": "feature/payments",
  "summary": {
    "total": 5,
    "breaking": 2,
    "warning": 1,
    "safe": 2
  },
  "changes": [
    {
      "symbol": "processPayment",
      "file": "src/api/payments.ts",
      "line": 42,
      "rule": "R01",
      "severity": "breaking",
      "message": "Parameter 'currency' was removed."
    }
  ]
}`}
      />
      <p>
        Add <code>.dg-report.json</code> to your <code>.gitignore</code> to
        prevent it from being committed.
      </p>

      <hr className="docs-divider" />

      {/* ─── PR LIFECYCLE ────────────────────────────────────────────────── */}
      <h2 id="pr-lifecycle">Full lifecycle: from local push to PR comment</h2>
      <p>
        When git hooks and CI/CD are both configured, a single push triggers
        two layers of protection:
      </p>
      <ol>
        <li>
          <strong>Local (pre-push hook)</strong> — Runs instantly on your machine.
          If breaking changes are found, the push is blocked before any code
          reaches the remote. This is the first line of defense.
        </li>
        <li>
          <strong>Remote (GitHub Actions)</strong> — If the push succeeds (no
          breaking changes locally), the CI workflow runs on GitHub&apos;s servers.
          It performs the same analysis but posts the results as a PR comment.
          CI mode is advisory — it exits 0 and never blocks the merge directly.
        </li>
      </ol>
      <div className="docs-table-wrapper">
        <table className="docs-table">
          <thead>
            <tr><th>Layer</th><th>Trigger</th><th>Mode</th><th>Blocking</th></tr>
          </thead>
          <tbody>
            <tr><td>Pre-push hook (terminal)</td><td><code>git push</code></td><td>Strict</td><td>Yes (exit 1)</td></tr>
            <tr><td>Pre-push hook (VS Code)</td><td>Sync Changes</td><td>Advisory</td><td>No (report file)</td></tr>
            <tr><td>Pre-merge-commit hook</td><td><code>git merge</code></td><td>Strict</td><td>Yes (exit 1)</td></tr>
            <tr><td>Post-merge hook</td><td>After merge completes</td><td>Advisory</td><td>No (report file)</td></tr>
            <tr><td>GitHub Actions CI</td><td>PR opened/updated</td><td>Advisory</td><td>No (PR comment)</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        For full CI/CD configuration details, see the{" "}
        <Link href="/docs/ci-cd">CI/CD Integration</Link> page.
      </p>

      <hr className="docs-divider" />

      {/* ─── ENV VARS ────────────────────────────────────────────────────── */}
      <h2 id="environment">Environment variables</h2>
      <div className="docs-table-wrapper">
        <table className="docs-table">
          <thead>
            <tr><th>Variable</th><th>Set by</th><th>Purpose</th></tr>
          </thead>
          <tbody>
            <tr><td><code>DG_HOOK</code></td><td>Hook script</td><td>Tells the CLI which hook is calling it. Values: <code>pre-push</code>, <code>pre-merge-commit</code>, <code>post-merge</code>.</td></tr>
            <tr><td><code>NODE_OPTIONS</code></td><td>Hook script</td><td>Memory limit for the Node.js process. Default: 512 MB.</td></tr>
            <tr><td><code>VSCODE_GIT_ASKPASS_MAIN</code></td><td>VS Code</td><td>Automatically set when running inside VS Code. Used to detect advisory mode.</td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="related">Related</h2>
      <ul>
        <li><Link href="/docs/ci-cd">CI/CD Integration</Link> — GitHub Actions workflow</li>
        <li><Link href="/docs/cli/check">dg check</Link> — manual pre-commit checks</li>
        <li><Link href="/docs/configuration">Configuration</Link> — tuning hook behavior</li>
      </ul>
    </>
  );
}
