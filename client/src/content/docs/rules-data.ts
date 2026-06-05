/**
 * Comprehensive rule data for individual rule documentation pages.
 * Each rule includes full before/after code examples, real-world scenarios,
 * detection logic explanation, and edge cases.
 */

export interface RuleData {
  id: string;
  name: string;
  severity: "breaking" | "warning" | "safe";
  target: "function" | "interface" | "enum" | "type_alias";
  languages: string[];
  summary: string;
  whyItMatters: string;
  howItWorks: string;
  beforeCode: string;
  afterCode: string;
  beforeLabel: string;
  afterLabel: string;
  cliOutput: string;
  realWorldScenario: string;
  edgeCases: string[];
  relatedRules: string[];
}

export const rulesData: Record<string, RuleData> = {
  "R01": {
    id: "R01",
    name: "Parameter Removed",
    severity: "breaking",
    target: "function",
    languages: ["TypeScript", "Python", "Go", "Java", "Rust"],
    summary: "Flags when a parameter (required or optional) is entirely removed from a function signature. Every caller that passes this argument will break.",
    whyItMatters: `When a parameter is removed from a function, every call site that passes that argument will either:
- **Fail to compile** in statically typed languages (TypeScript strict mode, Java, Rust, Go)
- **Silently shift argument positions** in dynamically typed languages (JavaScript, Python positional args)

The second case is especially dangerous — code appears to work but receives the wrong values.`,
    howItWorks: `The classifier iterates through the old signature's parameter list and checks if each parameter name still exists in the new signature. If a parameter from the old signature cannot be found in the new signature by name, the rule fires.

\`\`\`typescript
for (const oldParam of oldSig.params) {
  const stillExists = newSig.params.some(
    newParam => newParam.name === oldParam.name
  );
  if (!stillExists) {
    // BREAKING: parameter was removed
  }
}
\`\`\``,
    beforeCode: `// payments.ts — v1.0.0
export function processPayment(
  amount: number,
  currency: string,
  metadata?: Record<string, string>
): PaymentResult {
  return gateway.charge(amount, currency, metadata);
}`,
    afterCode: `// payments.ts — v2.0.0 (BREAKING)
export function processPayment(
  amount: number,
  metadata?: Record<string, string>
): PaymentResult {
  // currency was removed — now defaults to USD internally
  return gateway.charge(amount, 'USD', metadata);
}`,
    beforeLabel: "Before (v1.0.0)",
    afterLabel: "After (v2.0.0)",
    cliOutput: `$ npx dg compare main

  [BREAKING] processPayment (signature_change)
  src/api/payments.ts:42
  Parameter 'currency' was removed. Callers providing this argument will fail.

  Affected call sites (3):
    X  src/checkout/handler.ts:18 -- provides 3 arg(s), needs max 2
    X  src/invoices/gen.ts:31 -- provides 3 arg(s), needs max 2
    .  src/subscriptions/renew.ts:9 -- 2 arg(s), OK`,
    realWorldScenario: `A payments team removes the \`currency\` parameter from \`processPayment()\` because they've decided to default to USD. The checkout handler still passes three arguments: \`processPayment(100, 'EUR', {})\`. After the change, \`'EUR'\` lands in the \`metadata\` parameter position, and the function silently processes a USD payment with metadata as a string instead of an object.`,
    edgeCases: [
      "Removing an optional parameter is still breaking — callers may be providing it",
      "Renaming a parameter counts as removal of the old + addition of the new",
      "Destructured parameters are matched by their top-level name, not nested keys",
    ],
    relatedRules: ["R02", "R03", "R24"],
  },
  "R02": {
    id: "R02",
    name: "Parameter Reordered",
    severity: "breaking",
    target: "function",
    languages: ["TypeScript", "Python", "Go", "Java", "Rust"],
    summary: "Flags when the positional order of parameters changes. Callers using positional arguments receive wrong values at each argument position.",
    whyItMatters: `Most function calls use positional arguments. If parameters are reordered, callers silently pass values to the wrong parameters. In dynamically typed languages, this causes runtime errors or data corruption. In typed languages, it may catch the mistake — but only if the types differ.`,
    howItWorks: `The classifier checks the intersection of old and new parameter names. For each parameter that exists in both signatures, it compares the index position. If a parameter's position changed, the rule fires.

\`\`\`typescript
for (const oldParam of oldSig.params) {
  const newParam = newSig.params.find(p => p.name === oldParam.name);
  if (newParam) {
    const oldIndex = oldSig.params.indexOf(oldParam);
    const newIndex = newSig.params.indexOf(newParam);
    if (oldIndex !== newIndex) {
      // BREAKING: parameter was reordered
    }
  }
}
\`\`\``,
    beforeCode: `// users.ts
export function createUser(
  name: string,
  age: number,
  email: string
): User { ... }`,
    afterCode: `// users.ts (BREAKING — parameters reordered)
export function createUser(
  email: string,
  name: string,
  age: number
): User { ... }`,
    beforeLabel: "Before",
    afterLabel: "After (parameters reordered)",
    cliOutput: `$ npx dg check --staged

  [BREAKING] createUser (signature_change)
  src/users.ts:8
  Parameters were reordered. Callers using positional arguments will pass values incorrectly.`,
    realWorldScenario: `A developer reorders the parameters of \`createUser()\` to put email first for consistency. All existing callers — \`createUser("Alice", 30, "alice@co")\` — now pass "Alice" as the email, 30 as the name, and "alice@co" as the age. The function may not crash, but it writes garbage data to the database.`,
    edgeCases: [
      "If all parameters have the same type (e.g., all strings), TypeScript won't catch this",
      "Named/keyword arguments (Python, Rust struct init) are not affected by reordering",
      "Reordering + renaming simultaneously triggers both R01 and R02",
    ],
    relatedRules: ["R01", "R03"],
  },
  "R03": {
    id: "R03",
    name: "Required Parameter Added",
    severity: "breaking",
    target: "function",
    languages: ["TypeScript", "Python", "Go", "Java", "Rust"],
    summary: "Flags when a new required parameter is added to a function. All existing callers are missing the new argument and will fail to compile or crash at runtime.",
    whyItMatters: `Adding a required parameter means every single call site must be updated. In a large codebase, this could be hundreds of files. Miss one, and you get a compilation error (typed languages) or a runtime \`undefined\` (JavaScript).`,
    howItWorks: `The classifier counts the number of required parameters in both signatures. If the new signature has more required parameters than the old one, the rule fires.

\`\`\`typescript
const oldRequired = oldSig.params.filter(p => !p.optional && !p.defaultValue);
const newRequired = newSig.params.filter(p => !p.optional && !p.defaultValue);
if (newRequired.length > oldRequired.length) {
  // BREAKING: new required parameter added
}
\`\`\``,
    beforeCode: `// auth.ts
export function authenticate(
  token: string
): AuthResult { ... }`,
    afterCode: `// auth.ts (BREAKING)
export function authenticate(
  token: string,
  tenantId: string  // NEW required parameter
): AuthResult { ... }`,
    beforeLabel: "Before",
    afterLabel: "After (new required param)",
    cliOutput: `$ npx dg compare main feature/multi-tenant

  [BREAKING] authenticate (signature_change)
  src/auth.ts:5
  Required parameter 'tenantId' was added. All existing callers will fail.

  Affected call sites (12):
    X  src/middleware/auth.ts:23 -- provides 1 arg(s), needs 2
    X  src/routes/login.ts:45 -- provides 1 arg(s), needs 2
    ...and 10 more`,
    realWorldScenario: `A team adds multi-tenant support by requiring a \`tenantId\` parameter on the \`authenticate()\` function. Every middleware, route handler, and test file that calls this function — potentially dozens of files — must be updated. The call-site tracer shows exactly which files are affected and how many arguments each provides.`,
    edgeCases: [
      "Adding a parameter with a default value is R05 (safe), not R03",
      "Adding an optional parameter (?) is R05 (safe), not R03",
      "Adding a REST parameter (...args) is R14 (warning), not R03",
    ],
    relatedRules: ["R01", "R05", "R24"],
  },
  "R04": {
    id: "R04",
    name: "Parameter Type Narrowed",
    severity: "breaking",
    target: "function",
    languages: ["TypeScript", "Python", "Go", "Java", "Rust"],
    summary: "Flags when a parameter's type becomes more restrictive. Callers passing the previously valid, broader type will fail type checking.",
    whyItMatters: `Narrowing a parameter type invalidates all callers that relied on the broader type. For example, changing \`string | number\` to \`string\` breaks every caller passing a number.`,
    howItWorks: `For each parameter, the classifier compares the old and new type annotations. If the new type is a strict subset of the old type (e.g., the old type was a union and the new type removes members), the rule fires. Type comparison is text-based for reliability across languages.`,
    beforeCode: `// parser.ts
export function parseInput(
  input: string | number | Buffer
): ParsedData { ... }`,
    afterCode: `// parser.ts (BREAKING — type narrowed)
export function parseInput(
  input: string  // Buffer and number no longer accepted
): ParsedData { ... }`,
    beforeLabel: "Before (accepts string | number | Buffer)",
    afterLabel: "After (only string)",
    cliOutput: `$ npx dg check

  [BREAKING] parseInput (signature_change)
  src/parser.ts:3
  Parameter 'input' type was narrowed from 'string | number | Buffer' to 'string'. Callers passing number or Buffer values will fail type checking.`,
    realWorldScenario: `A library function initially accepts both strings and Buffers for flexibility. In a refactor, the team removes Buffer support because it complicates the implementation. Every consumer that passes a Buffer — common in Node.js stream pipelines — will see a TypeScript compilation error.`,
    edgeCases: [
      "Replacing a union type with just one of its members is always narrowing",
      "Going from 'any' to a specific type is technically narrowing",
      "Generic constraints narrowing is handled by R13, not R04",
    ],
    relatedRules: ["R12", "R13"],
  },
  "R05": {
    id: "R05",
    name: "Optional Parameter Added",
    severity: "safe",
    target: "function",
    languages: ["TypeScript", "Python", "Go", "Java", "Rust"],
    summary: "Flags when a new optional parameter is added. Existing callers are unaffected because they are not required to provide the new argument.",
    whyItMatters: `This is flagged as **safe** because optional parameters do not break existing callers. The function continues to work with the same call signatures. However, it is still reported in the analysis because it represents a change to the public API surface that reviewers should be aware of.`,
    howItWorks: `The classifier counts the total parameter count in both signatures. If a new parameter exists in the new signature that was not in the old signature and it is marked optional (?, default value, or rest param), the rule fires with a safe severity.`,
    beforeCode: `// fetcher.ts
export function fetchData(
  url: string
): Promise<Response> { ... }`,
    afterCode: `// fetcher.ts (SAFE — optional param added)
export function fetchData(
  url: string,
  options?: RequestOptions  // New optional parameter
): Promise<Response> { ... }`,
    beforeLabel: "Before",
    afterLabel: "After (optional param added)",
    cliOutput: `$ npx dg check

  [SAFE] fetchData (signature_change)
  src/fetcher.ts:3
  Optional parameter 'options' was added. Existing callers are unaffected.`,
    realWorldScenario: `A team adds an optional \`options\` parameter to a fetch utility function to support custom headers. All existing callers that call \`fetchData(url)\` continue to work without changes.`,
    edgeCases: [
      "A parameter with a default value is treated as optional",
      "Adding multiple optional params in one change generates one report per param",
    ],
    relatedRules: ["R03", "R12"],
  },
  "R06": {
    id: "R06",
    name: "Return Type Nullable",
    severity: "warning",
    target: "function",
    languages: ["TypeScript", "Python", "Go", "Java", "Rust"],
    summary: "Flags when a function's return type gains null or undefined as a possible value. Callers that do not check for null may crash at runtime.",
    whyItMatters: `When a function that previously always returned a value starts returning null, any caller that directly accesses properties on the return value will crash: \`getUser().name\` throws \`TypeError: Cannot read property 'name' of null\` if \`getUser()\` returns null.`,
    howItWorks: `The classifier compares the old and new return type strings. If the new return type contains 'null', 'undefined', or 'None' and the old one did not, the rule fires.`,
    beforeCode: `// users.ts
export function getUser(id: string): User {
  return db.findUser(id)!; // always returns
}`,
    afterCode: `// users.ts (WARNING — return may be null)
export function getUser(id: string): User | null {
  return db.findUser(id); // may return null
}`,
    beforeLabel: "Before (always returns User)",
    afterLabel: "After (may return null)",
    cliOutput: `$ npx dg check

  [WARNING] getUser (signature_change)
  src/users.ts:2
  Return type now includes null. Callers not checking for null may crash.`,
    realWorldScenario: `A previous version used a non-null assertion (\`!\`) to guarantee a return value. A new version removes this assertion for correctness, meaning the function can now return null when a user is not found. All callers doing \`getUser(id).email\` need to add null checks.`,
    edgeCases: [
      "Going from T to T | undefined is also caught by this rule",
      "Python Optional[T] is equivalent to T | None",
      "Rust's raw type to Option<T> is a breaking change in Rust land, handled differently",
    ],
    relatedRules: ["R07", "R22"],
  },
  "R07": {
    id: "R07",
    name: "Return Type Narrowed",
    severity: "safe",
    target: "function",
    languages: ["TypeScript", "Python", "Go", "Java", "Rust"],
    summary: "Flags when a function's return type becomes more specific. Callers expecting the broader type are safe because the narrower type satisfies the original contract.",
    whyItMatters: `Narrowing a return type is **safe** because any value of the narrower type is also a valid value of the broader type. A function that previously returned \`string | number\` now returning just \`string\` will not break any caller that handles both types.`,
    howItWorks: `The classifier detects when the new return type is a subset of the old return type (fewer union members, removed null, etc.) and reports it as safe.`,
    beforeCode: `// config.ts
export function getValue(key: string): string | number {
  return store.get(key);
}`,
    afterCode: `// config.ts (SAFE)
export function getValue(key: string): string {
  return String(store.get(key)); // always returns string now
}`,
    beforeLabel: "Before (string | number)",
    afterLabel: "After (string only)",
    cliOutput: `$ npx dg check

  [SAFE] getValue (signature_change)
  src/config.ts:2
  Return type narrowed from 'string | number' to 'string'. Callers are unaffected.`,
    realWorldScenario: `A configuration function previously returned both strings and numbers. The team normalizes it to always return strings for consistency. Callers handling \`string | number\` already handle strings, so no breakage.`,
    edgeCases: [
      "Removing null from a return type (T | null -> T) is covered by this rule",
      "Going from 'any' to a specific type is technically narrowing but may break callers relying on 'any' behavior",
    ],
    relatedRules: ["R06", "R22"],
  },
  "R08": {
    id: "R08",
    name: "Symbol Unexported",
    severity: "breaking",
    target: "function",
    languages: ["TypeScript", "Python", "Go", "Java", "Rust"],
    summary: "Flags when a previously exported symbol loses its export keyword. All external modules importing this symbol will break.",
    whyItMatters: `When a symbol is unexported, every file in the codebase (and every downstream consumer of the package) that imports it will get a compilation error. Unlike parameter changes that affect call sites, unexporting affects import statements — a fundamentally different blast radius.`,
    howItWorks: `The classifier checks the \`exported\` boolean field on both old and new signatures. If the old signature was exported and the new one is not, the rule fires.

\`\`\`typescript
if (oldSig.exported === true && newSig.exported !== true) {
  // BREAKING: symbol was unexported
}
\`\`\``,
    beforeCode: `// utils.ts
export function calculateTax(amount: number): number {
  return amount * 0.2;
}`,
    afterCode: `// utils.ts (BREAKING — no longer exported)
function calculateTax(amount: number): number {
  return amount * 0.2;
}`,
    beforeLabel: "Before (exported)",
    afterLabel: "After (unexported)",
    cliOutput: `$ npx dg check

  [BREAKING] calculateTax (visibility_changed)
  src/utils.ts:2
  Symbol was unexported. All external importers will fail to resolve this symbol.`,
    realWorldScenario: `A developer moves a utility function to be module-internal because it is only used within the file. However, three other modules import it. Those imports will break with "Module has no exported member 'calculateTax'".`,
    edgeCases: [
      "In Go, changing an exported function from uppercase to lowercase (Calc -> calc) is equivalent",
      "In Rust, removing the pub modifier triggers this rule",
      "In Python, adding a leading underscore (_calc) is a convention, not enforcement",
    ],
    relatedRules: ["R20", "R28"],
  },
  "R11": {
    id: "R11",
    name: "Sync to Async",
    severity: "breaking",
    target: "function",
    languages: ["TypeScript", "Python", "Go", "Java", "Rust"],
    summary: "Flags when a synchronous function becomes async. The return type changes from T to Promise<T>, breaking all callers that expect a synchronous return value.",
    whyItMatters: `Adding the \`async\` keyword changes the function's return type from \`T\` to \`Promise<T>\`. Every caller that uses the return value directly (\`const x = fn()\`) will now get a Promise object instead of the actual value. This is a silent logical bug if the caller doesn't \`await\` the result.`,
    howItWorks: `The classifier checks the \`async\` boolean on both signatures. If the old signature was not async and the new one is, the rule fires.`,
    beforeCode: `// validator.ts
export function validate(input: string): boolean {
  return schema.test(input);
}

// caller.ts
if (validate(userInput)) {
  proceed();
}`,
    afterCode: `// validator.ts (BREAKING)
export async function validate(input: string): Promise<boolean> {
  const schema = await loadSchema();
  return schema.test(input);
}

// caller.ts — NOW A BUG!
// validate() returns Promise<boolean>, which is always truthy
if (validate(userInput)) {
  proceed(); // ALWAYS runs — Promise object is truthy
}`,
    beforeLabel: "Before (sync)",
    afterLabel: "After (async)",
    cliOutput: `$ npx dg check

  [BREAKING] validate (signature_change)
  src/validator.ts:2
  Function changed from sync to async. Return type is now Promise<boolean> instead of boolean. Callers using the return value without await will receive a Promise object.`,
    realWorldScenario: `A validation function is changed from sync to async because it now needs to load a schema from a database. The \`if (validate(input))\` check in 15 call sites now always evaluates to \`true\` because a Promise object (even one that resolves to false) is truthy in JavaScript.`,
    edgeCases: [
      "If the function already returned Promise<T> without the async keyword, this rule may not fire",
      "Python's def to async def is caught by this rule",
      "In Go, adding a channel return is conceptually similar but not detected by this rule",
    ],
    relatedRules: ["R21"],
  },
  "R12": {
    id: "R12",
    name: "Parameter Type Widened",
    severity: "safe",
    target: "function",
    languages: ["TypeScript", "Python", "Go", "Java", "Rust"],
    summary: "Flags when a parameter type becomes more permissive. All existing callers remain valid because the broader type accepts everything the narrow type did.",
    whyItMatters: `Widening a parameter type is **safe**. If a function accepted \`string\` and now accepts \`string | number\`, all callers passing strings still work.`,
    howItWorks: `The classifier detects when the new parameter type is a superset of the old type (more union members, added null, etc.) and reports it as safe.`,
    beforeCode: `// parser.ts
export function parse(input: string): AST { ... }`,
    afterCode: `// parser.ts (SAFE)
export function parse(input: string | Buffer): AST { ... }`,
    beforeLabel: "Before (string only)",
    afterLabel: "After (string | Buffer)",
    cliOutput: `$ npx dg check

  [SAFE] parse (signature_change)
  src/parser.ts:2
  Parameter 'input' type widened from 'string' to 'string | Buffer'. Existing callers are unaffected.`,
    realWorldScenario: `A parser library adds Buffer support for stream pipelines. Existing callers passing strings are unaffected.`,
    edgeCases: [
      "Widening from a specific type to 'any' is technically safe but suspicious",
      "Adding 'undefined' to a required param's type may change behavior",
    ],
    relatedRules: ["R04", "R13"],
  },
  "R13": {
    id: "R13",
    name: "Generic Constraint Narrowed",
    severity: "breaking",
    target: "function",
    languages: ["TypeScript", "Java", "Rust"],
    summary: "Flags when a generic type parameter gains a more restrictive constraint. Callers using types that no longer satisfy the new constraint will fail compilation.",
    whyItMatters: `Generic constraints define the contract for type parameters. Narrowing a constraint means type arguments that previously satisfied the constraint may no longer be valid.`,
    howItWorks: `The classifier compares the generic type parameters' constraint fields in old and new signatures. If a constraint is added or made more restrictive, the rule fires.`,
    beforeCode: `// transform.ts
export function transform<T>(value: T): T {
  return value;
}

// caller — works with any type
transform(42);
transform("hello");
transform({ x: 1 });`,
    afterCode: `// transform.ts (BREAKING)
export function transform<T extends Serializable>(value: T): T {
  return serialize(value);
}

// caller — primitive types may not implement Serializable
transform(42); // ERROR if number doesn't satisfy Serializable`,
    beforeLabel: "Before (unconstrained generic)",
    afterLabel: "After (constrained to Serializable)",
    cliOutput: `$ npx dg check

  [BREAKING] transform (signature_change)
  src/transform.ts:2
  Generic type parameter 'T' constraint narrowed. Type arguments not satisfying 'Serializable' will fail.`,
    realWorldScenario: `A utility function gains a Serializable constraint because the implementation now needs to serialize the value. All callers passing primitive or non-Serializable types will break.`,
    edgeCases: [
      "Adding a constraint where none existed is the most common case",
      "Changing 'extends object' to 'extends Record<string, string>' is narrowing",
      "Only applies to languages with generics: TypeScript, Java, Rust",
    ],
    relatedRules: ["R04", "R12"],
  },
  "R14": {
    id: "R14",
    name: "Rest Parameter Changed",
    severity: "warning",
    target: "function",
    languages: ["TypeScript", "Python", "Go", "Java", "Rust"],
    summary: "Flags when a rest parameter is added or removed, changing how the function collects extra arguments.",
    whyItMatters: `Rest parameters (\`...args\`) change the argument collection behavior. Adding a rest parameter allows callers to pass unlimited args. Removing one breaks callers that pass extra args.`,
    howItWorks: `The classifier checks the \`rest\` flag on the last parameter of both signatures. If the rest status changes, the rule fires.`,
    beforeCode: `// logger.ts
export function log(message: string): void { ... }`,
    afterCode: `// logger.ts (WARNING)
export function log(...messages: string[]): void { ... }`,
    beforeLabel: "Before (single param)",
    afterLabel: "After (rest param)",
    cliOutput: `$ npx dg check

  [WARNING] log (signature_change)
  src/logger.ts:2
  Function now uses a rest parameter. Argument collection behavior changed.`,
    realWorldScenario: `A logging function is updated to accept variadic arguments. Existing callers still work, but the behavior may differ if they were relying on the fixed arity.`,
    edgeCases: [
      "Python's *args and **kwargs changes are captured",
      "Go's variadic parameter (...Type) changes are captured",
    ],
    relatedRules: ["R01", "R03"],
  },
  "R15": {
    id: "R15",
    name: "Overload Removed",
    severity: "breaking",
    target: "function",
    languages: ["TypeScript", "Java"],
    summary: "Flags when a function overload signature is removed. Callers using the removed overload will fail to compile.",
    whyItMatters: `Function overloads define multiple call signatures. Removing one invalidates callers that rely on that specific argument combination.`,
    howItWorks: `The classifier compares the overload count between old and new signatures. If the new signature has fewer overloads, the rule fires.`,
    beforeCode: `// parser.ts
export function parse(input: string): AST;
export function parse(input: Buffer): AST;
export function parse(input: string | Buffer): AST { ... }`,
    afterCode: `// parser.ts (BREAKING — Buffer overload removed)
export function parse(input: string): AST;
export function parse(input: string): AST { ... }`,
    beforeLabel: "Before (two overloads)",
    afterLabel: "After (Buffer overload removed)",
    cliOutput: `$ npx dg check

  [BREAKING] parse (signature_change)
  src/parser.ts:2
  Function overload was removed. Callers using the removed overload will fail.`,
    realWorldScenario: `A library removes the Buffer overload of a parse function. Callers passing Buffers will get a TypeScript error.`,
    edgeCases: [
      "Only applies to TypeScript and Java — Go, Rust, and Python don't have overloads",
      "Removing all overloads and keeping just the implementation signature is caught",
    ],
    relatedRules: ["R16"],
  },
  "R16": {
    id: "R16",
    name: "Overload Added",
    severity: "safe",
    target: "function",
    languages: ["TypeScript", "Java"],
    summary: "Flags when a new function overload is added. Existing callers are unaffected.",
    whyItMatters: `Adding an overload expands the function's call signatures. All existing callers remain valid.`,
    howItWorks: `The classifier detects when the new signature has more overloads than the old one and reports it as safe.`,
    beforeCode: `// parser.ts
export function parse(input: string): AST;
export function parse(input: string): AST { ... }`,
    afterCode: `// parser.ts (SAFE — new overload)
export function parse(input: string): AST;
export function parse(input: Buffer): AST;
export function parse(input: string | Buffer): AST { ... }`,
    beforeLabel: "Before",
    afterLabel: "After (new overload)",
    cliOutput: `$ npx dg check

  [SAFE] parse (signature_change)
  src/parser.ts:2
  New function overload added. Existing callers are unaffected.`,
    realWorldScenario: `A library adds a Buffer overload to a parse function. All existing string callers continue to work.`,
    edgeCases: [],
    relatedRules: ["R15"],
  },
  "R17": {
    id: "R17",
    name: "Static Changed",
    severity: "breaking",
    target: "function",
    languages: ["TypeScript", "Java"],
    summary: "Flags when a method changes between static and instance (or vice versa). All call sites need to change syntax.",
    whyItMatters: `Static methods are called on the class (\`MyClass.create()\`), while instance methods require an object (\`obj.create()\`). Changing between the two invalidates all call sites.`,
    howItWorks: `The classifier compares the \`isStatic\` flag on both signatures.`,
    beforeCode: `// factory.ts
export class UserFactory {
  static create(name: string): User {
    return new User(name);
  }
}

// caller
const user = UserFactory.create("Alice");`,
    afterCode: `// factory.ts (BREAKING)
export class UserFactory {
  create(name: string): User {
    return new User(name);
  }
}

// caller — NOW BROKEN
const user = UserFactory.create("Alice"); // ERROR: not a static method`,
    beforeLabel: "Before (static)",
    afterLabel: "After (instance method)",
    cliOutput: `$ npx dg check

  [BREAKING] create (signature_change)
  src/factory.ts:3
  Method changed from static to instance. Call site syntax must change.`,
    realWorldScenario: `A factory pattern is refactored from static methods to instance methods for dependency injection. All callers using the static syntax will break.`,
    edgeCases: [
      "Only relevant in class-based languages (TypeScript, Java)",
      "In Go, this is the difference between a function and a method with a receiver",
    ],
    relatedRules: ["R20"],
  },
  "R18": {
    id: "R18",
    name: "Parameter Mutability Narrowed",
    severity: "breaking",
    target: "function",
    languages: ["TypeScript", "Rust"],
    summary: "Flags when a parameter loses its readonly constraint. Callers passing readonly data will fail because the function now expects mutable data.",
    whyItMatters: `If a function previously accepted \`readonly T[]\` and now expects \`T[]\`, callers passing readonly arrays will get a type error.`,
    howItWorks: `The classifier detects when a parameter's type text loses 'readonly', 'Readonly', or 'ReadonlyArray' keywords.`,
    beforeCode: `// processor.ts
export function process(data: readonly number[]): number {
  return data.reduce((a, b) => a + b, 0);
}`,
    afterCode: `// processor.ts (BREAKING — mutability narrowed)
export function process(data: number[]): number {
  data.sort(); // now mutates the input
  return data.reduce((a, b) => a + b, 0);
}`,
    beforeLabel: "Before (readonly)",
    afterLabel: "After (mutable)",
    cliOutput: `$ npx dg check

  [BREAKING] process (signature_change)
  src/processor.ts:2
  Parameter 'data' mutability narrowed. Callers passing readonly arrays will fail type checking.`,
    realWorldScenario: `A function that used to accept readonly arrays now mutates its input and no longer accepts readonly data. Callers with \`const data: readonly number[] = [1,2,3]\` will get compilation errors.`,
    edgeCases: [
      "In Rust, this corresponds to &T -> &mut T",
      "Only detects explicit readonly/Readonly annotations",
    ],
    relatedRules: ["R19"],
  },
  "R19": {
    id: "R19",
    name: "Parameter Mutability Widened",
    severity: "safe",
    target: "function",
    languages: ["TypeScript", "Rust"],
    summary: "Flags when a parameter gains a readonly constraint. Callers passing mutable data automatically satisfy the new read-only constraint.",
    whyItMatters: `This is a **safe** change. A function that now accepts \`readonly T[]\` will happily accept mutable \`T[]\` arrays too.`,
    howItWorks: `The classifier detects when a parameter's type text gains 'readonly', 'Readonly', or 'ReadonlyArray' keywords.`,
    beforeCode: `// processor.ts
export function process(data: number[]): number { ... }`,
    afterCode: `// processor.ts (SAFE)
export function process(data: readonly number[]): number { ... }`,
    beforeLabel: "Before (mutable)",
    afterLabel: "After (readonly)",
    cliOutput: `$ npx dg check

  [SAFE] process (signature_change)
  src/processor.ts:2
  Parameter 'data' now accepts readonly data. Existing mutable callers are unaffected.`,
    realWorldScenario: `A function adds readonly to its parameter to signal it won't mutate the input. All existing callers with mutable arrays still work.`,
    edgeCases: [],
    relatedRules: ["R18"],
  },
  "R20": {
    id: "R20",
    name: "Visibility Narrowed",
    severity: "breaking",
    target: "function",
    languages: ["TypeScript", "Java", "Rust"],
    summary: "Flags when a class method's access modifier becomes more restrictive. External consumers or subclasses lose access.",
    whyItMatters: `Changing \`public\` to \`protected\` means external callers can no longer access the method. Changing \`protected\` to \`private\` means subclasses lose access.`,
    howItWorks: `The classifier assigns numeric weights to visibility modifiers (public=1, protected=2, private=3) and checks if the weight increased. If so, access was narrowed.`,
    beforeCode: `// renderer.ts
export class Renderer {
  public render(template: string): string {
    return this.compile(template);
  }
}`,
    afterCode: `// renderer.ts (BREAKING)
export class Renderer {
  protected render(template: string): string {
    return this.compile(template);
  }
}`,
    beforeLabel: "Before (public)",
    afterLabel: "After (protected)",
    cliOutput: `$ npx dg check

  [BREAKING] render (visibility_changed)
  src/renderer.ts:3
  Method visibility narrowed from 'public' to 'protected'. External callers will lose access.`,
    realWorldScenario: `A public method is made protected because the maintainer wants to discourage direct use. However, external consumers still call it.`,
    edgeCases: [
      "In Go, this is uppercase -> lowercase function name",
      "Defaults vary: TypeScript defaults to public, Java to package-private",
    ],
    relatedRules: ["R08", "R28"],
  },
  "R21": {
    id: "R21",
    name: "Async to Sync",
    severity: "breaking",
    target: "function",
    languages: ["TypeScript", "Python", "Go", "Java", "Rust"],
    summary: "Flags when an async function becomes synchronous. Callers using .then(), .catch(), or await will crash at runtime.",
    whyItMatters: `The reverse of R11. Callers that \`await\` the function or chain \`.then()\` on the result will get runtime errors because the return value is no longer a Promise.`,
    howItWorks: `The classifier checks if the old signature had \`async: true\` and the new signature has \`async: false\`. It also checks if the return type changed from \`Promise<T>\` to \`T\`.`,
    beforeCode: `// data.ts
export async function fetchData(url: string): Promise<Data> {
  const res = await fetch(url);
  return res.json();
}

// caller
const data = await fetchData("/api/users");`,
    afterCode: `// data.ts (BREAKING)
export function fetchData(url: string): Data {
  return cache.get(url); // now synchronous, reads from cache
}

// caller — NOW BROKEN
const data = await fetchData("/api/users");
// 'await' on a non-Promise is a no-op in loose mode,
// but .then() would crash: fetchData(...).then is not a function`,
    beforeLabel: "Before (async)",
    afterLabel: "After (sync)",
    cliOutput: `$ npx dg check

  [BREAKING] fetchData (signature_change)
  src/data.ts:2
  Function changed from async to sync. Callers using await or .then() will encounter runtime errors.`,
    realWorldScenario: `A data fetching function is refactored to read from a cache instead of making network requests. It no longer needs to be async. All callers using \`.then()\` chains will crash because the return value is no longer a Promise.`,
    edgeCases: [
      "await on a non-Promise is actually a no-op in JavaScript — the value is wrapped in Promise.resolve()",
      "But .then() and .catch() calls will throw TypeError",
    ],
    relatedRules: ["R11"],
  },
  "R22": {
    id: "R22",
    name: "Return Type Never",
    severity: "breaking",
    target: "function",
    languages: ["TypeScript", "Rust"],
    summary: "Flags when a function's return type becomes 'never' (TypeScript) or '!' (Rust), indicating it now always throws or diverges.",
    whyItMatters: `A function returning \`never\` means it never successfully completes. It either always throws an error or enters an infinite loop. Any code after the call becomes unreachable.`,
    howItWorks: `The classifier checks if the new return type is 'never' (TypeScript) or '!' (Rust) and the old return type was not.`,
    beforeCode: `// handler.ts
export function handleError(err: Error): string {
  return \`Error: \${err.message}\`;
}`,
    afterCode: `// handler.ts (BREAKING)
export function handleError(err: Error): never {
  throw new FatalError(err.message);
  // function never returns
}`,
    beforeLabel: "Before (returns string)",
    afterLabel: "After (never returns)",
    cliOutput: `$ npx dg check

  [BREAKING] handleError (signature_change)
  src/handler.ts:2
  Return type changed to 'never'. Function now always throws — code after this call is unreachable.`,
    realWorldScenario: `A graceful error handler is changed to always throw a FatalError. Callers that expected a returned error message and continued execution will encounter unreachable code.`,
    edgeCases: [
      "In Rust, this is the '!' (diverging) return type",
      "Only TypeScript and Rust have explicit 'never' types",
    ],
    relatedRules: ["R06", "R07"],
  },
  "R23": {
    id: "R23",
    name: "Default Value Changed",
    severity: "warning",
    target: "function",
    languages: ["TypeScript", "Python", "Go", "Java", "Rust"],
    summary: "Flags when a parameter's default value is modified. Callers omitting this argument will silently receive different behavior.",
    whyItMatters: `Changing a default value is **not** a compilation error — it is a silent behavioral change. Callers that rely on the old default will get different results without any warning at compile time. This makes it one of the most dangerous "non-breaking" changes.`,
    howItWorks: `The classifier compares the \`defaultValue\` field of each parameter. If both old and new have a default value and they differ, the rule fires with warning severity.`,
    beforeCode: `// retry.ts
export function fetchWithRetry(
  url: string,
  retries: number = 3  // retries up to 3 times
): Promise<Response> { ... }`,
    afterCode: `// retry.ts (WARNING — default changed)
export function fetchWithRetry(
  url: string,
  retries: number = 1  // now only retries once
): Promise<Response> { ... }`,
    beforeLabel: "Before (default: 3)",
    afterLabel: "After (default: 1)",
    cliOutput: `$ npx dg check

  [WARNING] fetchWithRetry (signature_change)
  src/retry.ts:3
  Default value for parameter 'retries' changed from '3' to '1'. Callers omitting this argument will receive different behavior.`,
    realWorldScenario: `A team reduces the default retry count from 3 to 1 to reduce latency. Any service calling \`fetchWithRetry(url)\` without specifying retries will now fail faster, potentially causing cascading failures in production.`,
    edgeCases: [
      "Default value comparison is text-based — equivalent expressions like '3' and '2+1' are treated as different",
      "Removing a default value entirely (making the param required) is handled by R03",
    ],
    relatedRules: ["R01", "R03"],
  },
  "R24": {
    id: "R24",
    name: "Constructor Changed",
    severity: "breaking",
    target: "function",
    languages: ["TypeScript", "Python", "Go", "Java", "Rust"],
    summary: "Flags when a class constructor's parameters change incompatibly. All 'new ClassName()' instantiation sites will fail.",
    whyItMatters: `Constructor changes affect every instantiation site. In large codebases, a class may be instantiated in dozens of files — factories, tests, dependency injection containers, and handler files.`,
    howItWorks: `The classifier checks if the function is a constructor (via the \`isConstructor\` flag), then applies the same parameter removal and required addition heuristics used by R01 and R03 specifically for constructors.`,
    beforeCode: `// database.ts
export class Database {
  constructor(connectionString: string) {
    this.connect(connectionString);
  }
}

// caller
const db = new Database("postgres://localhost/app");`,
    afterCode: `// database.ts (BREAKING)
export class Database {
  constructor(connectionString: string, pool: ConnectionPool) {
    this.pool = pool;
    this.connect(connectionString);
  }
}

// caller — NOW BROKEN
const db = new Database("postgres://localhost/app");
// Missing required argument: pool`,
    beforeLabel: "Before",
    afterLabel: "After (new required param in constructor)",
    cliOutput: `$ npx dg check

  [BREAKING] Database (signature_change)
  src/database.ts:3
  Constructor signature for 'Database' changed incompatibly. Downstream consumers calling 'new Database()' will encounter compilation errors.`,
    realWorldScenario: `A database class adds a connection pool parameter to its constructor for resource management. Every \`new Database()\` call across the codebase needs to provide a pool instance.`,
    edgeCases: [
      "Only fires for constructor functions (isConstructor flag must be set)",
      "Adding an optional constructor parameter is not caught — that's the safe R05 path",
    ],
    relatedRules: ["R01", "R03"],
  },
  "R25": {
    id: "R25",
    name: "Interface Property Required",
    severity: "breaking",
    target: "interface",
    languages: ["TypeScript", "Java", "Go", "Rust"],
    summary: "Flags when a new required property is added to an interface, or an existing optional property becomes required. All implementations must now provide the new field.",
    whyItMatters: `Adding a required property to an interface means every object literal, class implementation, or struct that conforms to the interface must now include the new field. This can affect dozens of files.`,
    howItWorks: `The classifier iterates through the new interface's properties. For each required property (not optional), it checks:
1. If the property is completely new (didn't exist in old) — that's a new required field.
2. If the property existed in old but was optional and is now required — that's a tightened constraint.`,
    beforeCode: `// types.ts
export interface UserConfig {
  name: string;
  theme?: string;
}

// implementations
const config: UserConfig = { name: "Alice" }; // valid`,
    afterCode: `// types.ts (BREAKING)
export interface UserConfig {
  name: string;
  theme?: string;
  email: string;  // NEW required property
}

// implementations — NOW BROKEN
const config: UserConfig = { name: "Alice" };
// ERROR: Property 'email' is missing`,
    beforeLabel: "Before",
    afterLabel: "After (new required property)",
    cliOutput: `$ npx dg check

  [BREAKING] UserConfig (interface_property_added)
  src/types.ts:2
  A new required property 'email' was added to the interface. Consumers must update their objects.`,
    realWorldScenario: `A configuration interface gains a required \`email\` field for notification support. Every place that creates a UserConfig object — tests, seed data, factories — needs to add the email field.`,
    edgeCases: [
      "Adding an optional property (?) is not caught by this rule — that's safe",
      "Changing optional to required (theme?: string -> theme: string) is caught",
      "In Go, adding a required struct field is equivalent",
    ],
    relatedRules: ["R26"],
  },
  "R26": {
    id: "R26",
    name: "Interface Property Removed",
    severity: "breaking",
    target: "interface",
    languages: ["TypeScript", "Java", "Go", "Rust"],
    summary: "Flags when a property is deleted from an interface. Consumers accessing that property will get compilation errors or runtime undefined.",
    whyItMatters: `Removing a property from an interface affects two groups:
1. **Implementers** — objects providing the property now have an unused field (harmless)
2. **Consumers** — code reading the property gets undefined or a compile error (breaking)`,
    howItWorks: `The classifier iterates through the old interface's properties and checks if each one still exists in the new interface. If a property is missing, the rule fires.`,
    beforeCode: `// types.ts
export interface UserConfig {
  name: string;
  email: string;
  timeout: number;
}

// consumer
console.log(config.timeout); // works`,
    afterCode: `// types.ts (BREAKING)
export interface UserConfig {
  name: string;
  email: string;
  // timeout was removed
}

// consumer — NOW BROKEN
console.log(config.timeout); // ERROR: Property 'timeout' does not exist`,
    beforeLabel: "Before",
    afterLabel: "After (property removed)",
    cliOutput: `$ npx dg check

  [BREAKING] UserConfig (interface_property_removed)
  src/types.ts:2
  The required property 'timeout' was removed from the interface. Callers accessing this property will fail to compile.`,
    realWorldScenario: `A team removes the timeout field from a configuration interface because they now use a global timeout setting. Every component that reads \`config.timeout\` will break.`,
    edgeCases: [
      "Removing an optional property is still breaking — consumers may be reading it",
      "Renaming a property (timeout -> timeoutMs) shows as removal + addition",
    ],
    relatedRules: ["R25"],
  },
  "R27": {
    id: "R27",
    name: "Enum Member Changed",
    severity: "breaking",
    target: "enum",
    languages: ["TypeScript", "Java", "Rust"],
    summary: "Flags when an enum member is removed, renamed, or has its value changed. References to the removed member fail to compile, and value changes cause silent data corruption.",
    whyItMatters: `Enum changes are especially dangerous because they often flow into databases and API payloads. If \`Status.Active = 1\` changes to \`Status.Active = 0\`, every database record with the old value is now misinterpreted.`,
    howItWorks: `The classifier iterates through the old enum's members:
1. If a member name is not found in the new enum — it was removed/renamed
2. If a member exists in both but the value changed — silent data corruption

New members added to the enum are safe (API expansion).`,
    beforeCode: `// status.ts
export enum PaymentStatus {
  Pending = 0,
  Active = 1,
  Failed = 2,
  Refunded = 3,
}

// database — stores numeric values
// Row: { userId: 42, status: 1 }  (means Active)`,
    afterCode: `// status.ts (BREAKING — member removed + value changed)
export enum PaymentStatus {
  Pending = 0,
  Processing = 1,  // value 1 was Active, now Processing
  Failed = 2,
  Refunded = 3,
}

// database — SILENT CORRUPTION
// Row: { userId: 42, status: 1 }  (was Active, now reads as Processing!)`,
    beforeLabel: "Before",
    afterLabel: "After (member removed, value collision)",
    cliOutput: `$ npx dg check

  [BREAKING] PaymentStatus (enum_member_changed)
  src/status.ts:2
  Enum member 'Active' was removed or renamed. Downstream consumers referencing this member will fail.

  [BREAKING] PaymentStatus (enum_member_changed)
  src/status.ts:4
  Enum member 'Processing' value changed. This may cause silent data corruption in existing records.`,
    realWorldScenario: `A team renames the \`Active\` enum member to \`Processing\` and assigns it the same numeric value. All code referencing \`PaymentStatus.Active\` breaks. Worse, historical database rows with value \`1\` now map to a different status meaning.`,
    edgeCases: [
      "Adding a new member is safe — reported separately as symbol_added",
      "Value changes are only flagged when both old and new have explicit values",
      "In Rust, enum variants can carry data — structural changes are more complex",
    ],
    relatedRules: ["R25", "R26"],
  },
  "R28": {
    id: "R28",
    name: "Visibility Widened (Exported)",
    severity: "safe",
    target: "function",
    languages: ["TypeScript", "Python", "Go", "Java", "Rust"],
    summary: "Flags when a previously internal function becomes exported. The API surface expands, but existing callers are unaffected.",
    whyItMatters: `This is a **warning** (not truly safe) because exporting a function creates a new backward-compatibility contract. Once consumers depend on it, you cannot unexport it without breaking them.`,
    howItWorks: `The classifier checks if the old signature had \`exported: false\` and the new has \`exported: true\`.`,
    beforeCode: `// utils.ts
function calculateTax(amount: number): number {
  return amount * 0.2;
}`,
    afterCode: `// utils.ts (WARNING — now public)
export function calculateTax(amount: number): number {
  return amount * 0.2;
}`,
    beforeLabel: "Before (internal)",
    afterLabel: "After (exported)",
    cliOutput: `$ npx dg check

  [WARNING] calculateTax (visibility_changed)
  src/utils.ts:2
  Function is now exported. This expands the public API surface and introduces a new backward-compatibility contract.`,
    realWorldScenario: `A developer exports a utility function so another module can use it. Nothing breaks, but the team should be aware that this function is now part of the public API and cannot be freely modified.`,
    edgeCases: [
      "In Go, this is lowercase -> uppercase function name",
      "In Rust, this is adding the pub modifier",
    ],
    relatedRules: ["R08", "R20"],
  },
};

/** Return ordered list of rule IDs */
export const ruleIds = Object.keys(rulesData).sort((a, b) => {
  const numA = parseInt(a.replace("R", ""), 10);
  const numB = parseInt(b.replace("R", ""), 10);
  return numA - numB;
});
