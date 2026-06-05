import CodeBlock from "@/components/docs/CodeBlock";
import Link from "next/link";

export default function Configuration() {
  return (
    <>
      <h1 style={{ fontFamily: "var(--font-space-grotesk)" }}>Configuration</h1>
      <p className="docs-lead">
        Diff Guardian uses a single JSON configuration file at the root of your
        project. All fields are optional — the tool works with zero configuration
        out of the box.
      </p>

      <hr className="docs-divider" />

      <h2 id="file">Config file</h2>
      <p>
        The configuration file is <code>dg.config.json</code> in your project root.
        Create it manually or run <code>npx dg init</code> to scaffold it.
      </p>

      <h2 id="full-reference">Full reference</h2>
      <CodeBlock
        filename="dg.config.json"
        language="json"
        code={`{
  "baseBranch": "main",
  "failOnWarnings": false,
  "enableTracer": true,
  "maxGrepResults": 500,
  "maxBarrelDepth": 10,
  "maxTracerFiles": 100
}`}
      />

      <h2 id="options">Options</h2>

      <h3 id="baseBranch"><code>baseBranch</code></h3>
      <div className="docs-table-wrapper">
        <table className="docs-table">
          <tbody>
            <tr><td>Type</td><td><code>string</code></td></tr>
            <tr><td>Default</td><td><code>&quot;main&quot;</code></td></tr>
          </tbody>
        </table>
      </div>
      <p>
        The default branch used as the base ref when running <code>npx dg</code>
        in smart default mode (no command specified). Diff Guardian auto-detects
        the default branch by querying <code>git remote show origin</code>, but
        this field overrides that behavior.
      </p>

      <h3 id="failOnWarnings"><code>failOnWarnings</code></h3>
      <div className="docs-table-wrapper">
        <table className="docs-table">
          <tbody>
            <tr><td>Type</td><td><code>boolean</code></td></tr>
            <tr><td>Default</td><td><code>false</code></td></tr>
          </tbody>
        </table>
      </div>
      <p>
        When enabled, warning-level changes (e.g., return type widened, default
        value changed) will also cause exit code 1. Useful for teams that want
        strict API stability guarantees.
      </p>

      <h3 id="enableTracer"><code>enableTracer</code></h3>
      <div className="docs-table-wrapper">
        <table className="docs-table">
          <tbody>
            <tr><td>Type</td><td><code>boolean</code></td></tr>
            <tr><td>Default</td><td><code>true</code></td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Enable or disable the call-site tracer. When disabled, breaking changes
        are still detected, but the report will not show affected call sites.
        Useful for very large repos where tracing is too slow.
      </p>

      <h3 id="maxGrepResults"><code>maxGrepResults</code></h3>
      <div className="docs-table-wrapper">
        <table className="docs-table">
          <tbody>
            <tr><td>Type</td><td><code>number</code></td></tr>
            <tr><td>Default</td><td><code>500</code></td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Maximum number of files returned by <code>git grep</code> per symbol
        during the tracing phase. If a symbol name is very common (e.g., &quot;get&quot;),
        this prevents the tracer from scanning thousands of files.
      </p>

      <h3 id="maxBarrelDepth"><code>maxBarrelDepth</code></h3>
      <div className="docs-table-wrapper">
        <table className="docs-table">
          <tbody>
            <tr><td>Type</td><td><code>number</code></td></tr>
            <tr><td>Default</td><td><code>10</code></td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Maximum depth for following barrel re-export chains (e.g., <code>index.ts</code>
        files that re-export from other index files). Prevents infinite loops in
        circular re-exports.
      </p>

      <h3 id="maxTracerFiles"><code>maxTracerFiles</code></h3>
      <div className="docs-table-wrapper">
        <table className="docs-table">
          <tbody>
            <tr><td>Type</td><td><code>number</code></td></tr>
            <tr><td>Default</td><td><code>100</code></td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Maximum number of importer files to AST-parse for call-site analysis
        per symbol. Caps the work done by the tracer for extremely popular symbols.
      </p>

      <h2 id="related">Related</h2>
      <ul>
        <li><Link href="/docs/cli/init">dg init</Link> — scaffold this config file</li>
        <li><Link href="/docs/cli/trace">dg trace</Link> — uses tracer settings</li>
      </ul>
    </>
  );
}
