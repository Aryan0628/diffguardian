import CodeBlock from "@/components/docs/CodeBlock";
import Link from "next/link";

export default function PhaseGitDiff() {
  return (
    <>
      <h1 style={{ fontFamily: "var(--font-space-grotesk)" }}>Phase 1: Git Diff Parser</h1>
      <p className="docs-lead">
        The first stage of the pipeline extracts complete source files from both
        sides of a git diff. It reads the full file content from both the base
        and head commits — not just the diff hunks.
      </p>

      <hr className="docs-divider" />

      <h2 id="why-full-source">Why full source extraction</h2>
      <p>
        Most diff tools show you changed hunks — three lines before, the change,
        three lines after. This is useful for human review but useless for structural
        analysis. A diff hunk like <code>{`+  userId: string`}</code> is not valid
        syntax — it cannot be parsed into an AST.
      </p>
      <p>
        Diff Guardian needs complete, parseable files. It extracts the <strong>entire
        source code</strong> of each changed file from both the base and head refs.
        This gives the AST Mapper (Phase 2) two valid source trees to compare.
      </p>

      <h2 id="git-commands">Git commands used</h2>
      <p>
        Internally, the parser runs these git commands for each file in the diff:
      </p>
      <CodeBlock
        code={`# Step 1: Get list of changed files between two refs
git diff --name-only --diff-filter=ACMR <base> <head>

# Step 2: For each changed file, extract full source
git show <base>:<filepath>     # → old source (entire file)
git show <head>:<filepath>     # → new source (entire file)`}
        language="bash"
      />
      <p>
        The <code>--diff-filter=ACMR</code> flag filters for Added, Copied,
        Modified, and Renamed files. Deleted files are also tracked but with
        an empty new source.
      </p>

      <h2 id="modes">Operating modes</h2>
      <p>
        The Git Diff Parser operates in four distinct modes depending on how
        Diff Guardian was invoked:
      </p>

      <h3>Compare mode</h3>
      <p>
        Used by <Link href="/docs/cli/compare">dg compare</Link>. Compares two
        explicit git refs.
      </p>
      <CodeBlock
        code={`npx dg compare main feature/payments

# Internally:
#   old source = git show main:<file>
#   new source = git show feature/payments:<file>`}
        language="bash"
      />

      <h3>Working tree mode</h3>
      <p>
        Used by <Link href="/docs/cli/check">dg check</Link> (default). Compares
        HEAD against the current working tree.
      </p>
      <CodeBlock
        code={`npx dg check

# Internally:
#   old source = git show HEAD:<file>
#   new source = fs.readFile(<file>)  // reads from disk`}
        language="bash"
      />

      <h3>Staged mode</h3>
      <p>
        Used by <code>dg check --staged</code>. Compares HEAD against the git
        staging area (index).
      </p>
      <CodeBlock
        code={`npx dg check --staged

# Internally:
#   old source = git show HEAD:<file>
#   new source = git show :0:<file>  // reads from git index`}
        language="bash"
      />

      <h3>CI mode</h3>
      <p>
        Used in GitHub Actions. Compares the PR base ref against the PR head SHA.
      </p>
      <CodeBlock
        code={`# GitHub Actions environment:
# GITHUB_BASE_REF=main
# GITHUB_HEAD_SHA=abc1234

# Internally:
#   old source = git show origin/main:<file>
#   new source = git show abc1234:<file>`}
        language="bash"
      />

      <h2 id="output-format">Output: FileDiff[]</h2>
      <p>
        The parser produces a <code>FileDiff</code> array — one entry per changed file.
        This is the contract between Phase 1 and Phase 2.
      </p>
      <CodeBlock
        language="typescript"
        filename="core/types.ts"
        code={`interface FileDiff {
  path: string;        // Relative path, e.g., "src/api/payments.ts"
  language: string;    // File extension without dot, e.g., "ts", "py", "go"
  oldSource: string;   // Full source code from the base ref
  newSource: string;   // Full source code from the head ref
}`}
      />

      <h2 id="special-cases">Special cases</h2>
      <div className="docs-table-wrapper">
        <table className="docs-table">
          <thead>
            <tr><th>Case</th><th>oldSource</th><th>newSource</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>New file added</td>
              <td><code>""</code> (empty string)</td>
              <td>Complete file contents</td>
            </tr>
            <tr>
              <td>File deleted</td>
              <td>Complete file contents</td>
              <td><code>""</code> (empty string)</td>
            </tr>
            <tr>
              <td>File renamed</td>
              <td>Source from old path</td>
              <td>Source from new path</td>
            </tr>
            <tr>
              <td>Binary file</td>
              <td colSpan={2}>Skipped entirely — binary files have no AST</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="performance">Performance</h2>
      <p>
        For a typical PR with 10-20 changed files, Phase 1 completes in under 100ms.
        The bottleneck is <code>git show</code> — one subprocess per file per ref.
        For a diff touching 50 files, that is 100 subprocess calls, which takes
        approximately 200-500ms depending on disk speed.
      </p>
      <p>
        Buffer limit: each <code>git show</code> call is capped at 10MB. Files
        larger than 10MB are skipped with a warning. This prevents out-of-memory
        crashes on generated files or vendor bundles.
      </p>

      <h2 id="next">Next phase</h2>
      <p>
        The <code>FileDiff[]</code> array is passed to{" "}
        <Link href="/docs/architecture/ast-mapper">Phase 2: AST Mapper</Link>, which
        parses the source strings into syntax trees and extracts structural signatures.
      </p>
    </>
  );
}
