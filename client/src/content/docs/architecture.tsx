import CodeBlock from "@/components/docs/CodeBlock";
import Link from "next/link";

export default function Architecture() {
  return (
    <>
      <h1 style={{ fontFamily: "var(--font-space-grotesk)" }}>Architecture</h1>
      <p className="docs-lead">
        A deep dive into the source tree, data contracts, and design decisions
        behind Diff Guardian.
      </p>

      <hr className="docs-divider" />

      <h2 id="source-tree">Source tree</h2>
      <CodeBlock
        code={`src/
  cli.ts                      # Entry point — command router
  pipeline.ts                 # Orchestrates the 4-phase pipeline
  config.ts                   # dg.config.json loader

  core/
    types.ts                  # All TypeScript interfaces and type aliases
    constants.ts              # Extension maps, supported languages

  parsers/
    git-diff.ts               # Phase 1: git diff → FileDiff[]
    ast-mapper.ts             # Phase 2: FileDiff[] → ParseResult[]
    translators/
      typescript.ts           # TS/JS/TSX/JSX translator
      python.ts               # Python translator
      go.ts                   # Go translator
      java.ts                 # Java translator
      rust.ts                 # Rust translator

  classifier/
    engine.ts                 # Phase 3: ParseResult[] → FunctionChange[]
    types.ts                  # Rule contract interface
    rules/
      R01_param_removed.ts    # ...through R28_exported.ts
      index.ts                # Barrel export of all rules

  tracer/
    index.ts                  # Phase 4: JIT Scanner + Call-Site Tracer

  reporter/
    types.ts                  # ReporterConfig interface
    terminal.ts               # Terminal reporter (colorized output)
    github.ts                 # GitHub PR comment reporter
    index.ts                  # Reporter factory

grammars/                     # WASM files (tree-sitter-*.wasm)
.husky/                       # Git hook scripts`}
        language="bash"
      />

      <h2 id="data-contracts">Data contracts</h2>
      <p>
        Data flows through the pipeline as strongly-typed TypeScript interfaces.
        Each phase consumes the output of the previous phase:
      </p>

      <h3>FileDiff (Phase 1 output)</h3>
      <CodeBlock
        language="typescript"
        code={`interface FileDiff {
  path: string;        // Relative file path
  language: string;    // File extension (e.g., "ts", "py")
  oldSource: string;   // Full source from base ref
  newSource: string;   // Full source from head ref
}`}
      />

      <h3>ParseResult (Phase 2 output)</h3>
      <CodeBlock
        language="typescript"
        code={`interface ParseResult {
  file: string;
  language: Language;
  oldSigs: Map<string, AnySignature>;  // Base signatures
  newSigs: Map<string, AnySignature>;  // Head signatures
  skipped: boolean;
  skipReason?: string;
}`}
      />

      <h3>FunctionChange (Phase 3 output)</h3>
      <CodeBlock
        language="typescript"
        code={`interface FunctionChange {
  id: string;
  name: string;
  file: string;
  lineStart: number;
  lineEnd: number;
  language: Language;
  symbolType: 'function' | 'interface' | 'enum' | 'type_alias';
  severity: 'breaking' | 'warning' | 'safe';
  changeType: ChangeType;
  breaking: boolean;
  message: string;
  before: AnySignature | null;
  after: AnySignature | null;
  callers: CallerInfo[];
}`}
      />

      <h2 id="classifier-design">Classifier design</h2>
      <p>
        The classifier engine uses a technique called <strong>bucketed rule
        routing</strong>. Instead of iterating all 28 rules for every changed symbol,
        it pre-computes four rule buckets at startup — one per symbol type
        (function, interface, enum, type_alias). When a symbol change is detected,
        only the rules in the matching bucket are executed:
      </p>
      <CodeBlock
        language="typescript"
        code={`// Pre-computed once per file
const buckets = {
  function:   rules.filter(r => r.target === 'function'),
  interface:  rules.filter(r => r.target === 'interface'),
  enum:       rules.filter(r => r.target === 'enum'),
  type_alias: rules.filter(r => r.target === 'type_alias'),
};

// Per-symbol: O(1) lookup + iterate only relevant rules
if (key.startsWith('interface:')) {
  rulesToRun = buckets.interface;
}`}
      />

      <h2 id="wasm-lifecycle">WASM grammar lifecycle</h2>
      <p>
        The AST Mapper manages WASM grammar loading with three guarantees:
      </p>
      <ol>
        <li>
          <strong>Lazy loading</strong> — grammars are loaded only when needed.
          If a diff contains only TypeScript files, Go/Python/Java/Rust grammars
          are never loaded.
        </li>
        <li>
          <strong>Deduplication</strong> — if 10 <code>.ts</code> files appear
          in a diff, the TypeScript grammar is loaded exactly once. An in-flight
          promise map prevents thundering herd.
        </li>
        <li>
          <strong>Memory safety</strong> — every parsed tree is freed in a
          <code>finally</code> block via <code>tree.delete()</code>, even if
          the translator throws. This prevents WASM heap leaks.
        </li>
      </ol>

      <h2 id="sequential-parsing">Sequential parsing</h2>
      <p>
        Files are parsed sequentially, not concurrently. This is intentional:
      </p>
      <ul>
        <li>Tree-sitter parses at approximately 100,000 lines per second — concurrent
        parsing adds negligible throughput improvement</li>
        <li>Sequential processing keeps WASM heap usage flat and deterministic</li>
        <li>Error traces are cleaner when failures happen in a known order</li>
      </ul>

      <h2 id="tracer-architecture">Tracer architecture</h2>
      <p>
        The call-site tracer is split into two components:
      </p>
      <h3>JIT Scanner</h3>
      <p>
        Uses <code>git grep</code> for O(repo) candidate discovery, then
        AST-parses import statements to confirm actual usage. Handles barrel
        re-exports by following <code>index.ts</code> chains recursively.
      </p>
      <h3>Call-Site Counter</h3>
      <p>
        For each confirmed importer, parses the file and locates call expressions
        of the broken symbol. Counts arguments and compares against the new
        signature to determine &quot;broken&quot;, &quot;fixed&quot;, or &quot;indeterminate&quot; status.
      </p>

      <h2 id="related">Related</h2>
      <ul>
        <li><Link href="/docs/how-it-works">How It Works</Link> — high-level pipeline overview</li>
        <li><Link href="/docs/languages">Language Support</Link> — per-language translator details</li>
        <li><Link href="/docs/cli/rules">Classification Rules</Link> — all 28 rules</li>
      </ul>
    </>
  );
}
