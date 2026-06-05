import CodeBlock from "@/components/docs/CodeBlock";
import Link from "next/link";

export default function CliInit() {
  return (
    <>
      <h1 style={{ fontFamily: "var(--font-space-grotesk)" }}>dg init</h1>
      <p className="docs-lead">
        Scaffold a configuration file and a GitHub Actions workflow into your project.
        Run once, commit, and Diff Guardian starts protecting your PRs.
      </p>

      <hr className="docs-divider" />

      <h2 id="usage">Usage</h2>
      <CodeBlock code="npx dg init" language="bash" />

      <h2 id="what-gets-created">What gets created</h2>
      <p>
        The init command creates two files in your project root:
      </p>

      <h3 id="config-file">1. dg.config.json</h3>
      <p>
        A minimal configuration file with sensible defaults:
      </p>
      <CodeBlock
        filename="dg.config.json"
        language="json"
        code={`{
  "baseBranch": "main",
  "failOnWarnings": false
}`}
      />
      <p>
        See <Link href="/docs/configuration">Configuration</Link> for all available options.
      </p>

      <h3 id="workflow">2. .github/workflows/diff-guardian.yml</h3>
      <p>
        A ready-to-use GitHub Actions workflow:
      </p>
      <CodeBlock
        filename=".github/workflows/diff-guardian.yml"
        language="yaml"
        code={`name: "Diff-Guardian"

on:
  pull_request:
    branches: [ "main", "master" ]

permissions:
  contents: read
  pull-requests: write

jobs:
  analyze:
    name: API Contract Audit
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Build WASM Grammars
        run: npm run build:grammars

      - name: Build
        run: npm run build

      - name: Run Diff-Guardian
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          GITHUB_HEAD_SHA: \${{ github.event.pull_request.head.sha }}
        run: npx dg`}
      />

      <h2 id="skip-behavior">Skip behavior</h2>
      <p>
        If a file already exists, the init command skips it instead of overwriting.
        This means you can safely re-run <code>npx dg init</code> without losing
        any customizations you have made.
      </p>
      <CodeBlock
        code={`$ npx dg init

  Diff-Guardian Init

  [skip] .github/workflows/diff-guardian.yml already exists.
  [created] dg.config.json

  Done. 1 file(s) created, 1 skipped.
  Commit these files and push to activate Diff-Guardian on your PRs.`}
        language="bash"
      />

      <h2 id="next-steps">Next steps</h2>
      <ol>
        <li>Commit both files: <code>git add -A && git commit -m &quot;chore: add diff-guardian&quot;</code></li>
        <li>Push to trigger the workflow on your next PR</li>
        <li>Customize <Link href="/docs/configuration">dg.config.json</Link> as needed</li>
        <li>Set up <Link href="/docs/git-hooks">Git Hooks</Link> for local enforcement</li>
      </ol>
    </>
  );
}
