import CodeBlock from "@/components/docs/CodeBlock";
import Link from "next/link";

export default function GettingStarted() {
  return (
    <>
      <h1 style={{ fontFamily: "var(--font-space-grotesk)" }}>Getting Started</h1>
      <p className="docs-lead">
        Diff Guardian is a CLI that parses your git diffs into abstract syntax trees,
        classifies every structural change, and traces call sites to show you exactly
        what breaks. This guide will have you running your first analysis in under two minutes.
      </p>

      <hr className="docs-divider" />

      <h2 id="requirements">Requirements</h2>
      <ul>
        <li>Node.js 18 or higher</li>
        <li>A git repository with at least two branches (or commits) to compare</li>
        <li>npm, yarn, or pnpm</li>
      </ul>

      <h2 id="install">1. Install</h2>
      <p>
        Install Diff Guardian as a dev dependency in your project. This gives you access
        to both the <code>diff-guardian</code> and the shorthand <code>dg</code> binary.
      </p>
      <CodeBlock
        code="npm install --save-dev diff-guardian"
        language="bash"
      />

      <h2 id="init">2. Initialize</h2>
      <p>
        Run the init command to scaffold two files into your project:
      </p>
      <CodeBlock code="npx dg init" language="bash" />
      <p>This creates:</p>
      <ul>
        <li>
          <code>.github/workflows/diff-guardian.yml</code> — a GitHub Actions workflow
          that runs Diff Guardian on every pull request and posts a comment with the results.
        </li>
        <li>
          <code>dg.config.json</code> — a minimal configuration file with sensible defaults.
        </li>
      </ul>
      <p>
        If either file already exists, the init command will skip it and tell you.
      </p>

      <CodeBlock
        filename="dg.config.json"
        language="json"
        code={`{
  "baseBranch": "main",
  "failOnWarnings": false
}`}
      />

      <h2 id="first-run">3. Run your first analysis</h2>
      <p>
        The fastest way to see Diff Guardian in action is the <code>check</code> command.
        It analyzes your uncommitted changes against HEAD:
      </p>
      <CodeBlock code="npx dg check" language="bash" />
      <p>
        If you have staged changes (<code>git add</code>), you can analyze only those:
      </p>
      <CodeBlock code="npx dg check --staged" language="bash" />
      <p>
        To compare two branches (e.g. your feature branch against main):
      </p>
      <CodeBlock code="npx dg compare main" language="bash" />

      <h2 id="output">4. Understanding the output</h2>
      <p>
        Diff Guardian prints a structured report to your terminal. Each
        detected change is categorized into one of three severity levels:
      </p>
      <div className="docs-table-wrapper">
        <table className="docs-table">
          <thead>
            <tr>
              <th>Severity</th>
              <th>Label</th>
              <th>Meaning</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code className="docs-severity-breaking">BREAKING</code></td>
              <td>Red</td>
              <td>Callers will fail at runtime or compile time. Requires action.</td>
            </tr>
            <tr>
              <td><code className="docs-severity-warning">WARNING</code></td>
              <td>Yellow</td>
              <td>Non-breaking but worth reviewing (e.g., return type widened).</td>
            </tr>
            <tr>
              <td><code className="docs-severity-safe">SAFE</code></td>
              <td>Green</td>
              <td>Harmless API expansion (e.g., new function added).</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        For breaking changes, Diff Guardian also traces call sites — showing you every
        file that imports the broken symbol and whether the caller has the correct
        number of arguments. This is powered by the{" "}
        <Link href="/docs/how-it-works">Lazy Graph Engine</Link>.
      </p>

      <h2 id="whats-next">What is next</h2>
      <ul>
        <li>
          <Link href="/docs/how-it-works">How It Works</Link> — understand the 4-phase pipeline
        </li>
        <li>
          <Link href="/docs/cli/check">CLI: dg check</Link> — working tree and staged analysis
        </li>
        <li>
          <Link href="/docs/cli/compare">CLI: dg compare</Link> — branch and tag comparison
        </li>
        <li>
          <Link href="/docs/git-hooks">Git Hooks</Link> — block broken pushes automatically
        </li>
        <li>
          <Link href="/docs/ci-cd">CI/CD</Link> — GitHub Actions integration
        </li>
      </ul>
    </>
  );
}
