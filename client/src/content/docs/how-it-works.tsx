import CodeBlock from "@/components/docs/CodeBlock";
import Link from "next/link";

export default function HowItWorks() {
  return (
    <>
      <h1 style={{ fontFamily: "var(--font-space-grotesk)" }}>How It Works</h1>
      <p className="docs-lead">
        Diff Guardian runs a 4-phase pipeline every time you invoke it.
        Each phase feeds its output to the next, forming a lazy evaluation graph
        that only does expensive work when breaking changes exist.
      </p>

      <hr className="docs-divider" />

      <h2 id="pipeline-overview">Pipeline Overview</h2>
      <div className="docs-pipeline">
        <div className="docs-pipeline-step">
          <div className="docs-pipeline-num">1</div>
          <div>
            <strong>Git Diff Parser</strong>
            <p>Extracts old and new source code for every changed file between two git refs.</p>
          </div>
        </div>
        <div className="docs-pipeline-arrow">|</div>
        <div className="docs-pipeline-step">
          <div className="docs-pipeline-num">2</div>
          <div>
            <strong>AST Mapper</strong>
            <p>Parses both old and new source into concrete syntax trees using WASM-compiled Tree-Sitter grammars. Extracts structured signatures.</p>
          </div>
        </div>
        <div className="docs-pipeline-arrow">|</div>
        <div className="docs-pipeline-step">
          <div className="docs-pipeline-num">3</div>
          <div>
            <strong>Classifier Engine</strong>
            <p>Compares old vs new signatures using bucketed classification rules. Assigns severity: breaking, warning, or safe.</p>
          </div>
        </div>
        <div className="docs-pipeline-arrow">|</div>
        <div className="docs-pipeline-step">
          <div className="docs-pipeline-num">4</div>
          <div>
            <strong>Call-Site Tracer</strong>
            <p>For breaking changes only: scans the repo for importers, then counts arguments at each call site. Shows exactly which callers are broken.</p>
          </div>
        </div>
      </div>

      <h2 id="phase-1">Phase 1: Git Diff Parser</h2>
      <p>
        The pipeline begins by running <code>git diff</code> between two refs.
        For each changed file, it extracts the <strong>full source code</strong> from
        both the base and head commits — not just the diff hunks.
      </p>
      <p>
        Why full source? Because AST parsing requires complete, parseable files.
        A diff hunk in isolation is not valid syntax. By extracting full source from
        both sides, the AST mapper can build complete syntax trees.
      </p>
      <CodeBlock
        code={`// Internally, the parser runs equivalent to:
git show <base>:<filepath>   // → old source
git show <head>:<filepath>   // → new source`}
        language="bash"
      />
      <p>
        The parser also handles special cases:
      </p>
      <ul>
        <li><strong>New files</strong> — old source is empty, new source is the complete file</li>
        <li><strong>Deleted files</strong> — old source is the complete file, new source is empty</li>
        <li><strong>Working tree mode</strong> — reads the file from disk instead of git</li>
        <li><strong>Staged mode</strong> — reads from the git index via <code>git show :0:filepath</code></li>
      </ul>

      <h2 id="phase-2">Phase 2: AST Mapper</h2>
      <p>
        The AST Mapper is the orchestrator. It receives the file diffs, determines the
        language from the file extension, loads the correct WASM grammar, and dispatches
        to the appropriate language translator.
      </p>
      <p>
        Each language has a dedicated translator module:
      </p>
      <div className="docs-table-wrapper">
        <table className="docs-table">
          <thead>
            <tr>
              <th>Language</th>
              <th>Translator</th>
              <th>Grammar</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>TypeScript / JavaScript</td><td><code>translators/typescript.ts</code></td><td><code>tree-sitter-typescript.wasm</code></td></tr>
            <tr><td>Python</td><td><code>translators/python.ts</code></td><td><code>tree-sitter-python.wasm</code></td></tr>
            <tr><td>Go</td><td><code>translators/go.ts</code></td><td><code>tree-sitter-go.wasm</code></td></tr>
            <tr><td>Java</td><td><code>translators/java.ts</code></td><td><code>tree-sitter-java.wasm</code></td></tr>
            <tr><td>Rust</td><td><code>translators/rust.ts</code></td><td><code>tree-sitter-rust.wasm</code></td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Each translator extracts four types of signatures from the syntax tree:
      </p>
      <ul>
        <li><strong>FunctionSignature</strong> — name, parameters (name, type, optional, default, rest), return type, async, visibility, generics</li>
        <li><strong>InterfaceSignature</strong> — name, properties (name, type, optional), generics</li>
        <li><strong>EnumSignature</strong> — name, members (name, value)</li>
        <li><strong>TypeAliasSignature</strong> — name, type expression, generics</li>
      </ul>
      <p>
        Grammars are lazy-loaded and cached. If 10 TypeScript files appear in a diff,
        the WASM grammar is loaded exactly once. An in-flight deduplication map prevents
        thundering herd problems.
      </p>

      <h2 id="phase-3">Phase 3: Classifier Engine</h2>
      <p>
        The classifier receives a <code>ParseResult</code> per file — containing the
        old and new signature maps. It iterates every key across both maps and applies
        classification logic:
      </p>
      <ul>
        <li><strong>Symbol deleted</strong> — key exists in old but not new. Always breaking.</li>
        <li><strong>Symbol added</strong> — key exists in new but not old. Always safe.</li>
        <li><strong>Symbol changed</strong> — key exists in both. Run through the rule engine.</li>
      </ul>
      <p>
        For changed symbols, the engine performs a <code>deepStrictEqual</code> check first.
        If the signatures are identical, no rules run — this is a massive performance
        shortcut for files where only implementation (not API surface) changed.
      </p>
      <p>
        If signatures differ, the engine routes to pre-computed rule buckets based on
        symbol type. Function signatures run through function rules, interface signatures
        through interface rules, and so on. This is <strong>O(1) routing</strong>, not
        O(n) filtering.
      </p>
      <p>
        See <Link href="/docs/cli/rules">dg rules</Link> for the full list of classification rules.
      </p>

      <h2 id="phase-4">Phase 4: Call-Site Tracer</h2>
      <p>
        The tracer is the most expensive phase — and it only runs when breaking changes
        exist. This is the &quot;lazy&quot; part of the Lazy Graph Engine.
      </p>
      <p>
        For each breaking change, the tracer performs two sub-phases:
      </p>
      <h3>Scanner (Phase 4a)</h3>
      <p>
        The JIT Scanner finds every file that imports the broken symbol. It uses
        <code>git grep</code> for initial candidate discovery, then AST-parses import
        statements to confirm actual usage. It handles:
      </p>
      <ul>
        <li>Named imports: <code>{`import { processPayment } from './api'`}</code></li>
        <li>Default imports: <code>{`import processPayment from './api'`}</code></li>
        <li>Aliased imports: <code>{`import { processPayment as pay } from './api'`}</code></li>
        <li>Barrel re-exports: follows <code>index.ts</code> chains up to 10 levels deep</li>
      </ul>

      <h3>Tracer (Phase 4b)</h3>
      <p>
        For each importer file, the tracer AST-parses the file and locates every
        call expression of the broken symbol. Depending on the symbol type:
      </p>
      <ul>
        <li>
          <strong>Functions</strong> — counts the arguments at each call site and compares
          against the new signature&apos;s required and total parameter counts. Reports broken,
          fixed, or indeterminate (spread args) status.
        </li>
        <li>
          <strong>Enums</strong> — finds <code>EnumName.MemberName</code> access patterns
          and checks if the accessed member was removed or had its value changed.
        </li>
      </ul>

      <h2 id="reporters">Reporters</h2>
      <p>
        After the pipeline completes, one of three reporters renders the output:
      </p>
      <ul>
        <li><strong>Terminal Reporter</strong> — colorized output for local CLI usage and git hooks</li>
        <li><strong>GitHub Reporter</strong> — posts a structured comment on the PR via the GitHub API</li>
        <li><strong>JSON Reporter</strong> — writes structured JSON to stdout or a file for programmatic consumption</li>
      </ul>

      <h2 id="next">Next steps</h2>
      <ul>
        <li><Link href="/docs/architecture">Architecture Deep Dive</Link> — source tree map and data contracts</li>
        <li><Link href="/docs/cli/rules">Classification Rules</Link> — all rules explained with examples</li>
        <li><Link href="/docs/cli/trace">dg trace</Link> — standalone symbol tracing</li>
      </ul>
    </>
  );
}
