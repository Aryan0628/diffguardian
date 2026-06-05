import Link from "next/link";

interface RuleEntry {
  id: string;
  name: string;
  target: string;
  severity: "breaking" | "warning" | "safe";
  languages: string;
  description: string;
  example: string;
}

const allRules: RuleEntry[] = [
  { id: "R01", name: "Parameter Removed", target: "function", severity: "breaking", languages: "All", description: "A parameter is removed from a function signature. Any caller that passes this argument will break.", example: "processPayment(amount, currency) -> processPayment(amount)" },
  { id: "R02", name: "Parameter Reordered", target: "function", severity: "breaking", languages: "All", description: "The order of parameters changes. Callers using positional arguments will receive wrong values.", example: "createUser(name, age) -> createUser(age, name)" },
  { id: "R03", name: "Required Param Added", target: "function", severity: "breaking", languages: "All", description: "A new required parameter is added. All existing callers will be missing the new argument.", example: "fetchUser(id) -> fetchUser(id, token)" },
  { id: "R04", name: "Param Type Narrowed", target: "function", severity: "breaking", languages: "All", description: "A parameter type becomes more restrictive. Callers passing the previously-valid broader type will fail.", example: "process(input: string | number) -> process(input: string)" },
  { id: "R05", name: "Optional Param Added", target: "function", severity: "safe", languages: "All", description: "A new optional parameter is added. Existing callers are unaffected.", example: "fetch(url) -> fetch(url, options?)" },
  { id: "R06", name: "Return Nullable", target: "function", severity: "warning", languages: "All", description: "The return type now includes null or undefined. Callers not checking for null may crash.", example: "getUser(): User -> getUser(): User | null" },
  { id: "R07", name: "Return Narrowed", target: "function", severity: "safe", languages: "All", description: "The return type becomes more specific. Callers expecting the broader type are safe.", example: "getValue(): string | number -> getValue(): string" },
  { id: "R08", name: "Unexported", target: "function", severity: "breaking", languages: "All", description: "A previously exported symbol is no longer exported. All external importers will break.", example: "export function calc() -> function calc()" },
  { id: "R11", name: "Sync to Async", target: "function", severity: "breaking", languages: "All", description: "A synchronous function becomes async. The return value changes from T to Promise<T>.", example: "function getData(): Data -> async function getData(): Promise<Data>" },
  { id: "R12", name: "Param Type Widened", target: "function", severity: "safe", languages: "All", description: "A parameter type becomes more permissive. All existing callers remain valid.", example: "parse(input: string) -> parse(input: string | Buffer)" },
  { id: "R13", name: "Generic Narrowed", target: "function", severity: "breaking", languages: "TS, Java, Rust", description: "A generic type parameter gains a stricter constraint. Callers using types that no longer satisfy the constraint will fail.", example: "transform<T>(v: T) -> transform<T extends Serializable>(v: T)" },
  { id: "R14", name: "Rest Parameter", target: "function", severity: "warning", languages: "All", description: "A rest parameter is added or removed, changing the argument collection behavior.", example: "log(msg: string) -> log(...msgs: string[])" },
  { id: "R15", name: "Overload Removed", target: "function", severity: "breaking", languages: "TS, Java", description: "A function overload signature is removed. Callers invoking the removed overload will fail to compile.", example: "function parse(s: string): T; (removed)" },
  { id: "R16", name: "Overload Added", target: "function", severity: "safe", languages: "TS, Java", description: "A new overload signature is added. Existing callers are unaffected.", example: "function parse(s: string): T; function parse(n: number): T; (added)" },
  { id: "R17", name: "Static Changed", target: "function", severity: "breaking", languages: "TS, Java", description: "A method changes between static and instance (or vice versa). All call sites change syntax.", example: "static create() -> create() (or vice versa)" },
  { id: "R18", name: "Param Mutability Narrowed", target: "function", severity: "breaking", languages: "TS, Rust", description: "A parameter type gains a mutability constraint (e.g., readonly removed), breaking callers passing readonly data.", example: "process(data: readonly T[]) -> process(data: T[])" },
  { id: "R19", name: "Param Mutability Widened", target: "function", severity: "safe", languages: "TS, Rust", description: "A parameter gains a readonly constraint. Callers passing mutable data automatically satisfy the new constraint.", example: "process(data: T[]) -> process(data: readonly T[])" },
  { id: "R20", name: "Visibility Narrowed", target: "function", severity: "breaking", languages: "TS, Java, Rust", description: "A class method's access modifier becomes more restrictive. External consumers or subclasses lose access.", example: "public render() -> protected render()" },
  { id: "R21", name: "Async to Sync", target: "function", severity: "breaking", languages: "All", description: "An async function becomes synchronous. Callers using .then() or await will crash.", example: "async function fetchData() -> function fetchData()" },
  { id: "R22", name: "Return Never", target: "function", severity: "breaking", languages: "TS, Rust", description: "A return type transitions to 'never' (TS) or '!' (Rust), indicating the function now always throws or diverges.", example: "process(): Result -> process(): never" },
  { id: "R23", name: "Default Value Changed", target: "function", severity: "warning", languages: "All", description: "A parameter's default value is modified. Callers omitting this argument will silently receive different behavior.", example: "retry(count = 3) -> retry(count = 1)" },
  { id: "R24", name: "Constructor Changed", target: "function", severity: "breaking", languages: "All", description: "A class constructor's parameters change structurally. All 'new ClassName()' instantiations may fail.", example: "constructor(name: string) -> constructor(name: string, id: number)" },
  { id: "R25", name: "Interface Prop Required", target: "interface", severity: "breaking", languages: "TS, Java, Go, Rust", description: "A new required property is added to an interface, or an optional property becomes required. Downstream implementations will fail.", example: "{ name: string } -> { name: string; email: string }" },
  { id: "R26", name: "Interface Prop Removed", target: "interface", severity: "breaking", languages: "TS, Java, Go, Rust", description: "A property is completely deleted from an interface. Consumers relying on this property will fail.", example: "{ name: string; age: number } -> { name: string }" },
  { id: "R27", name: "Enum Member Changed", target: "enum", severity: "breaking", languages: "TS, Java, Rust", description: "An enum member is removed, renamed, or has its value modified. Downstream references will break or silently corrupt data.", example: "enum Status { Active = 1, Pending = 2 } -> enum Status { Active = 1 }" },
  { id: "R28", name: "Visibility Widened", target: "function", severity: "safe", languages: "All", description: "A previously internal symbol becomes exported. The API surface expands, but existing callers are unaffected.", example: "function helper() -> export function helper()" },
];

function SeverityBadge({ severity }: { severity: string }) {
  const cls =
    severity === "breaking"
      ? "docs-severity-breaking"
      : severity === "warning"
      ? "docs-severity-warning"
      : "docs-severity-safe";
  return <code className={cls}>{severity.toUpperCase()}</code>;
}

export default function CliRules() {
  const renderRuleCard = (rule: RuleEntry) => (
    <Link
      key={rule.id}
      href={`/docs/rules/${rule.id.toLowerCase()}`}
      className="docs-rule-card-link"
    >
      <div className="docs-rule-card">
        <div className="docs-rule-header">
          <code className="docs-rule-id">{rule.id}</code>
          <strong>{rule.name}</strong>
          <SeverityBadge severity={rule.severity} />
        </div>
        <p>{rule.description}</p>
        <div className="docs-rule-meta">
          <span>Languages: {rule.languages}</span>
        </div>
        <div className="docs-rule-example">
          <code>{rule.example}</code>
        </div>
      </div>
    </Link>
  );

  return (
    <>
      <h1 style={{ fontFamily: "var(--font-space-grotesk)" }}>Classification Rules</h1>
      <p className="docs-lead">
        Diff Guardian classifies API changes using a set of structural rules.
        Each rule targets a specific symbol type (function, interface, enum, or type alias)
        and assigns a severity: breaking, warning, or safe. Click any rule to see its
        full documentation with before/after code examples.
      </p>

      <hr className="docs-divider" />

      <h2 id="viewing-rules">Viewing rules in your terminal</h2>
      <p>
        Run <code>npx dg rules</code> to list all active rules with their IDs, names,
        and target types.
      </p>

      <h2 id="severity-levels">Severity levels</h2>
      <div className="docs-table-wrapper">
        <table className="docs-table">
          <thead>
            <tr><th>Severity</th><th>Exit Code</th><th>Meaning</th></tr>
          </thead>
          <tbody>
            <tr><td><SeverityBadge severity="breaking" /></td><td>1</td><td>Callers will fail. Blocks CI in strict mode.</td></tr>
            <tr><td><SeverityBadge severity="warning" /></td><td>0 (or 1 if <code>failOnWarnings</code>)</td><td>Non-breaking but worth reviewing.</td></tr>
            <tr><td><SeverityBadge severity="safe" /></td><td>0</td><td>Harmless API expansion.</td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="function-rules">Function rules</h2>
      <div className="docs-rules-list">
        {allRules.filter((r) => r.target === "function").map(renderRuleCard)}
      </div>

      <h2 id="interface-rules">Interface rules</h2>
      <div className="docs-rules-list">
        {allRules.filter((r) => r.target === "interface").map(renderRuleCard)}
      </div>

      <h2 id="enum-rules">Enum rules</h2>
      <div className="docs-rules-list">
        {allRules.filter((r) => r.target === "enum").map(renderRuleCard)}
      </div>

      <h2 id="related">Related</h2>
      <ul>
        <li><Link href="/docs/how-it-works">How It Works</Link> — understand the classifier engine</li>
        <li><Link href="/docs/architecture/classifier">Classifier Engine</Link> — bucketed rule routing</li>
        <li><Link href="/docs/configuration">Configuration</Link> — configure <code>failOnWarnings</code></li>
      </ul>
    </>
  );
}
