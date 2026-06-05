import CodeBlock from "@/components/docs/CodeBlock";
import Link from "next/link";

export default function PhaseAstMapper() {
  return (
    <>
      <h1 style={{ fontFamily: "var(--font-space-grotesk)" }}>Phase 2: AST Mapper</h1>
      <p className="docs-lead">
        The AST Mapper is the orchestrator of the parsing layer. It receives
        raw source strings from Phase 1, loads WASM-compiled Tree-Sitter grammars,
        parses each file into a concrete syntax tree, and dispatches to
        language-specific translators that extract structured signatures.
      </p>

      <hr className="docs-divider" />

      <h2 id="responsibilities">Responsibilities</h2>
      <ol>
        <li><strong>WASM grammar lifecycle</strong> — lazy load, deduplicate, cache</li>
        <li><strong>Sequential parsing</strong> — keeps WASM heap usage flat</li>
        <li><strong>Memory safety</strong> — <code>tree.delete()</code> in finally blocks</li>
        <li><strong>Error isolation</strong> — one bad file never aborts the entire run</li>
        <li><strong>filePath injection</strong> — the one place that knows both filename and signature</li>
      </ol>

      <h2 id="grammar-loading">WASM grammar loading</h2>
      <p>
        Tree-Sitter grammars are compiled to WebAssembly and loaded at runtime.
        The AST Mapper manages this with three guarantees:
      </p>

      <h3>Lazy loading</h3>
      <p>
        Grammars are loaded only when the first file of that language appears in
        the diff. If a PR only changes TypeScript files, the Python, Go, Java,
        and Rust grammars are never loaded.
      </p>

      <h3>Deduplication (thundering herd prevention)</h3>
      <p>
        If 10 <code>.ts</code> files appear in a diff, the TypeScript grammar is loaded
        exactly once. An in-flight promise map prevents concurrent load attempts:
      </p>
      <CodeBlock
        language="typescript"
        filename="parsers/ast-mapper.ts"
        code={`private async getLanguage(code: string): Promise<WasmLanguage> {
  // Already loaded — return instantly
  if (this.languages.has(code)) {
    return this.languages.get(code)!;
  }

  // Currently loading — wait for the in-flight promise
  // Prevents thundering herd: 10 .ts files = 1 WASM load
  if (this.loadingLanguages.has(code)) {
    return this.loadingLanguages.get(code)!;
  }

  // First request — start the load
  const loadPromise = this.loadGrammar(code).finally(() => {
    this.loadingLanguages.delete(code);
  });

  this.loadingLanguages.set(code, loadPromise);
  return loadPromise;
}`}
      />

      <h3>Grammar caching</h3>
      <p>
        Once loaded, grammars are cached in memory for the lifetime of the process.
        In CI, this means one load per run. Locally with <code>--watch</code> mode,
        grammars persist across re-runs.
      </p>

      <h2 id="parsing">Parsing process</h2>
      <p>
        For each <code>FileDiff</code>, the mapper:
      </p>
      <ol>
        <li>Resolves the file extension to a language code</li>
        <li>Loads (or retrieves cached) the WASM grammar</li>
        <li>Swaps the grammar on the shared parser instance</li>
        <li>Parses old source → tree → extract signatures</li>
        <li>Parses new source → tree → extract signatures</li>
        <li>Returns a <code>ParseResult</code> with both signature maps</li>
      </ol>

      <h3>Sequential processing</h3>
      <p>
        Files are parsed sequentially, not concurrently. This is a deliberate
        design choice:
      </p>
      <ul>
        <li>Tree-sitter parses at ~100,000 lines/sec — concurrency adds negligible throughput</li>
        <li>Sequential processing keeps WASM heap allocation flat and deterministic</li>
        <li>Error traces are cleaner when failures occur in a known order</li>
        <li>One shared parser instance avoids multiple WASM runtime costs</li>
      </ul>

      <h3>Memory safety</h3>
      <p>
        Every parsed tree is freed in a <code>finally</code> block via <code>tree.delete()</code>.
        This is critical — Tree-Sitter trees are allocated on the WASM heap, not the
        JavaScript heap. The garbage collector cannot reclaim them. Without explicit
        deletion, the WASM heap grows without bound.
      </p>
      <CodeBlock
        language="typescript"
        code={`let tree: Tree | null = null;

try {
  tree = this.parser!.parse(source);
  if (!tree) return new Map();

  // If the file has syntax errors, warn but continue
  if (tree.rootNode.hasError) {
    console.warn(\`Parse errors in "\${filePath}" — signatures may be incomplete\`);
  }

  return this.dispatch(tree, ext, lang);

} finally {
  // CRITICAL: always free WASM-allocated tree memory.
  // Runs even if dispatch() throws.
  tree?.delete();
}`}
      />

      <h2 id="translators">Language translators</h2>
      <p>
        Each language has a dedicated translator module responsible for
        walking the concrete syntax tree and extracting signatures:
      </p>
      <div className="docs-table-wrapper">
        <table className="docs-table">
          <thead>
            <tr><th>Language</th><th>Extensions</th><th>Grammar</th><th>Translator</th></tr>
          </thead>
          <tbody>
            <tr><td>TypeScript / JavaScript</td><td>.ts, .tsx, .js, .jsx</td><td>tree-sitter-typescript</td><td>translators/typescript.ts</td></tr>
            <tr><td>Python</td><td>.py</td><td>tree-sitter-python</td><td>translators/python.ts</td></tr>
            <tr><td>Go</td><td>.go</td><td>tree-sitter-go</td><td>translators/go.ts</td></tr>
            <tr><td>Java</td><td>.java</td><td>tree-sitter-java</td><td>translators/java.ts</td></tr>
            <tr><td>Rust</td><td>.rs</td><td>tree-sitter-rust</td><td>translators/rust.ts</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        JavaScript files use the TypeScript grammar because TypeScript is a
        syntactic superset — all valid JS is valid TS.
      </p>

      <h2 id="signatures">Extracted signatures</h2>
      <p>
        Each translator extracts four types of API signatures:
      </p>
      <CodeBlock
        language="typescript"
        filename="core/types.ts"
        code={`interface FunctionSignature {
  name: string;
  params: ParamSignature[];    // name, type, optional, default, rest
  returnType: string;
  async: boolean;
  exported: boolean;
  isStatic: boolean;
  isConstructor: boolean;
  className?: string;
  visibility?: 'public' | 'protected' | 'private';
  generics: TypeParameter[];
  overloadIndex?: number;
  filePath: string;            // Injected by ASTMapper
  line: number;
}

interface InterfaceSignature {
  name: string;
  properties: PropertySignature[];  // name, type, optional
  generics: TypeParameter[];
  line: number;
}

interface EnumSignature {
  name: string;
  members: EnumMember[];  // name, value
  line: number;
}

interface TypeAliasSignature {
  name: string;
  typeExpression: string;
  generics: TypeParameter[];
  line: number;
}`}
      />

      <h2 id="output-format">Output: ParseResult[]</h2>
      <p>
        Each file produces a <code>ParseResult</code> containing signature maps
        for both old and new source. The classifier (Phase 3) uses the key
        to determine what changed:
      </p>
      <CodeBlock
        language="typescript"
        code={`interface ParseResult {
  file: string;                              // "src/api/payments.ts"
  language: Language;                        // "typescript"
  oldSigs: Map<string, AnySignature>;        // signatures from base ref
  newSigs: Map<string, AnySignature>;        // signatures from head ref
  skipped: boolean;                          // true if parsing failed
  skipReason?: string;                       // reason for skipping
}`}
      />
      <p>
        Map keys use a prefix convention for type routing:
      </p>
      <ul>
        <li><code>processPayment</code> — function (no prefix)</li>
        <li><code>interface:UserConfig</code> — interface</li>
        <li><code>enum:PaymentStatus</code> — enum</li>
        <li><code>type:ConfigOptions</code> — type alias</li>
      </ul>

      <h2 id="next">Next phase</h2>
      <p>
        The <code>ParseResult[]</code> array is passed to{" "}
        <Link href="/docs/architecture/classifier">Phase 3: Classifier Engine</Link>, which
        compares old vs new signatures and assigns severity.
      </p>
    </>
  );
}
