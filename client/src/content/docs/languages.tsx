import Link from "next/link";

export default function Languages() {
  return (
    <>
      <h1 style={{ fontFamily: "var(--font-space-grotesk)" }}>Language Support</h1>
      <p className="docs-lead">
        Diff Guardian uses WASM-compiled Tree-Sitter grammars to parse source code.
        Each language has a dedicated translator module that extracts structured
        signatures from the syntax tree.
      </p>

      <hr className="docs-divider" />

      <h2 id="supported">Supported languages</h2>
      <div className="docs-table-wrapper">
        <table className="docs-table">
          <thead>
            <tr>
              <th>Language</th>
              <th>Extensions</th>
              <th>Grammar</th>
              <th>Translator</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>TypeScript</td>
              <td><code>.ts</code>, <code>.tsx</code></td>
              <td><code>tree-sitter-typescript</code></td>
              <td><code>translators/typescript.ts</code></td>
            </tr>
            <tr>
              <td>JavaScript</td>
              <td><code>.js</code>, <code>.jsx</code></td>
              <td><code>tree-sitter-javascript</code></td>
              <td><code>translators/typescript.ts</code></td>
            </tr>
            <tr>
              <td>Python</td>
              <td><code>.py</code></td>
              <td><code>tree-sitter-python</code></td>
              <td><code>translators/python.ts</code></td>
            </tr>
            <tr>
              <td>Go</td>
              <td><code>.go</code></td>
              <td><code>tree-sitter-go</code></td>
              <td><code>translators/go.ts</code></td>
            </tr>
            <tr>
              <td>Java</td>
              <td><code>.java</code></td>
              <td><code>tree-sitter-java</code></td>
              <td><code>translators/java.ts</code></td>
            </tr>
            <tr>
              <td>Rust</td>
              <td><code>.rs</code></td>
              <td><code>tree-sitter-rust</code></td>
              <td><code>translators/rust.ts</code></td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="what-gets-extracted">What gets extracted</h2>
      <p>
        Every translator extracts the same four signature types from the syntax tree,
        regardless of language:
      </p>

      <h3>FunctionSignature</h3>
      <ul>
        <li>Name, parameters (name, type, optional flag, default value, rest flag)</li>
        <li>Return type, async modifier, visibility (public/protected/private)</li>
        <li>Generic type parameters with constraints</li>
        <li>Constructor detection, static detection, export status</li>
      </ul>

      <h3>InterfaceSignature</h3>
      <ul>
        <li>Name, properties (name, type, optional flag)</li>
        <li>Generic type parameters</li>
      </ul>

      <h3>EnumSignature</h3>
      <ul>
        <li>Name, members (name, optional value)</li>
      </ul>

      <h3>TypeAliasSignature</h3>
      <ul>
        <li>Name, the full type expression, generics</li>
      </ul>

      <h2 id="language-specifics">Language-specific notes</h2>

      <h3>TypeScript and JavaScript</h3>
      <p>
        TypeScript and JavaScript share the same translator module. The TypeScript
        grammar handles JSX/TSX syntax natively. JavaScript files are parsed with
        the TypeScript grammar since it is a superset.
      </p>
      <p>
        Extracted constructs: <code>function</code> declarations, <code>class</code> methods,
        arrow functions assigned to <code>const</code>/<code>let</code>,
        <code>interface</code>, <code>type</code> aliases, and <code>enum</code>.
      </p>

      <h3>Python</h3>
      <p>
        Python functions are identified by <code>def</code> statements. Type
        annotations (PEP 484+) are extracted when present. Since Python does not
        have native interfaces or enums at the language level, only function
        signatures and class methods are analyzed. Dataclasses and TypedDict are
        treated as interfaces when decorated.
      </p>

      <h3>Go</h3>
      <p>
        Go functions and methods are extracted from <code>func</code> and
        <code>func (receiver) name</code> syntax. Interfaces are extracted from
        <code>type Name interface</code> blocks. Structs with exported fields
        are treated as interface-like contracts. Enums are inferred from
        <code>const</code> blocks with <code>iota</code>.
      </p>

      <h3>Java</h3>
      <p>
        Java methods, constructors, and interfaces are fully supported. The
        translator extracts visibility modifiers, generics, and static flags.
        Enums are extracted from <code>enum</code> declarations with their
        constant values.
      </p>

      <h3>Rust</h3>
      <p>
        Rust functions (<code>fn</code>), trait definitions (<code>trait</code>),
        and enums (<code>enum</code>) are supported. Visibility is determined by
        the <code>pub</code> modifier. Generic lifetime and type parameters are
        extracted. The translator handles <code>impl</code> blocks for method
        extraction.
      </p>

      <h2 id="adding-language">Adding a new language</h2>
      <p>
        To add support for a new language, you need:
      </p>
      <ol>
        <li>Install the Tree-Sitter grammar: <code>npm install tree-sitter-langname</code></li>
        <li>Copy the WASM file to the <code>grammars/</code> directory</li>
        <li>Add a translator module in <code>src/parsers/translators/</code></li>
        <li>Register the extension mapping in <code>src/core/constants.ts</code></li>
        <li>Add a case to the <code>ASTMapper.dispatch()</code> switch</li>
      </ol>

      <h2 id="related">Related</h2>
      <ul>
        <li><Link href="/docs/how-it-works">How It Works</Link> — AST mapper phase</li>
        <li><Link href="/docs/architecture">Architecture</Link> — source tree and data contracts</li>
      </ul>
    </>
  );
}
