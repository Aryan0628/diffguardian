# Changelog

All notable changes to this project will be documented in this file.

---

## [0.1.0] - 2026-06-05

### Added

#### Core Engine
- Impact-aware git diff pipeline — parses both sides of a diff into AST signatures and classifies every structural change
- `ClassifierEngine` — O(1) rule routing by key prefix, deep-equality short-circuit, pre-computed rule buckets per type
- `ASTMapper` — WASM grammar lifecycle with lazy load, thundering-herd deduplication, sequential parsing, and guaranteed `tree.delete()` memory cleanup
- `pipeline.ts` — full orchestration: git diff extraction → AST mapping → classification → blast-radius tracing → reporting

#### Classification Rules (26 rules)
- `R01` — Parameter removed
- `R02` — Parameter reordered
- `R03` — Required parameter added
- `R04` — Parameter type narrowed
- `R05` — Optional parameter added
- `R06` — Return type made nullable
- `R07` — Return type narrowed
- `R08` — Symbol unexported
- `R11` — Sync to async
- `R12` — Parameter type widened
- `R13` — Generic constraint narrowed
- `R14` — Rest parameter changed
- `R15` — Overload removed
- `R16` — Overload added
- `R17` — Static modifier changed
- `R18` — Parameter mutability narrowed
- `R19` — Parameter mutability widened
- `R20` — Visibility narrowed
- `R21` — Async to sync
- `R22` — Return type changed to never / `!`
- `R23` — Default value changed
- `R24` — Constructor signature changed
- `R25` — Interface property made required
- `R26` — Interface property removed
- `R27` — Enum member removed or value reassigned
- `R28` — Symbol exported (new export)

#### Language Support
- TypeScript / JavaScript (`.ts`, `.tsx`, `.js`, `.jsx`) via `tree-sitter-typescript` and `tree-sitter-javascript`
- Python (`.py`) via `tree-sitter-python`
- Go (`.go`) via `tree-sitter-go`
- Java (`.java`) via `tree-sitter-java`
- Rust (`.rs`) via `tree-sitter-rust`

#### Blast-Radius Tracer
- `JIT Scanner` — `git grep` based import scanner, finds all files importing a broken symbol
- `CallSiteTracer` — AST-based call site resolution, validates argument counts against new signature
- Lazy graph — only traces files that import broken symbols, never scans the full repo

#### CLI
- `npx dg` — smart default, auto-detects GitHub Actions vs local terminal
- `npx dg check` — analyze uncommitted working tree changes
- `npx dg check --staged` — analyze only staged files
- `npx dg compare <base> [head]` — compare two git refs, branches, or tags
- `npx dg trace <symbol>` — show all importers and call sites for a symbol
- `npx dg rules` — list all 26 classification rules
- `npx dg init` — scaffold `dg.config.json` and GitHub Actions workflow

#### CI/CD & Git Hooks
- GitHub Actions workflow — auto-posts PR comment with full audit report
- `pre-push` hook — blocks push if breaking changes are detected
- `pre-merge-commit` hook — blocks merge if breaking changes are detected
- `post-merge` hook — advisory scan, writes `.dg-report.json`

#### Reporters
- Terminal reporter — chalk-formatted output with severity levels (BREAKING / WARNING / SAFE)
- GitHub reporter — formatted PR comment with file links and call site details
- JSON reporter — machine-readable output via `--report-file`

#### Documentation Site (`client/`)
- Next.js 16 landing page with interactive terminal demo
- Full documentation: getting started, CLI reference, architecture deep-dives, CI/CD, configuration, rules registry
- `Cmd+K` search, dark/light mode, Lenis smooth scroll
