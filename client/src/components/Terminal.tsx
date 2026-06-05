"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────
type LineType =
  | "command"
  | "header"
  | "info"
  | "error"
  | "detail"
  | "trace"
  | "callsite"
  | "callsite-ok"
  | "summary"
  | "success"
  | "blank";

interface TermLine {
  text: string;
  type: LineType;
}

// ── Color map ────────────────────────────────────────────────────────────────
const lineColors: Record<string, string> = {
  command: "#ffffff",
  header: "#a3a3a3",
  info: "#737373",
  error: "#ef4444",
  detail: "#a3a3a3",
  trace: "#e5e5e5",
  callsite: "#52525b",
  "callsite-ok": "#10b981",
  summary: "#ef4444",
  success: "#10b981",
  blank: "transparent",
};

// ── Command outputs ──────────────────────────────────────────────────────────
const COMMANDS: Record<string, TermLine[]> = {
  "npx dg compare main feature/payments": [
    { text: "", type: "blank" },
    { text: "  Diff-Guardian API Analysis", type: "header" },
    { text: "  Base: main → Head: feature/payments", type: "info" },
    { text: "", type: "blank" },
    { text: "  [BREAKING] Changes (2)", type: "error" },
    { text: "", type: "blank" },
    { text: "  ► processPayment (signature_change)", type: "error" },
    { text: "    src/api/payments.ts:42", type: "trace" },
    { text: "    R01: Parameter 'currency' was removed.", type: "detail" },
    { text: "    Affected call sites (3):", type: "info" },
    { text: "      X  src/checkout/handler.ts:18 — provides 3 arg(s), needs 2", type: "callsite" },
    { text: "      OK src/invoices/gen.ts:31 — Fixed by developer in this PR", type: "callsite-ok" },
    { text: "      ✓ 1 other call site(s) have correct arguments", type: "info" },
    { text: "", type: "blank" },
    { text: "  ► UserConfig (interface_property_removed)", type: "error" },
    { text: "    src/types/config.ts:8", type: "trace" },
    { text: "    R26: Property 'timeout' was removed from interface.", type: "detail" },
    { text: "", type: "blank" },
    { text: "  ────────────────────────────────────────", type: "info" },
    { text: "  [STRICT MODE]", type: "summary" },
    { text: "  2 breaking changes found. Exiting with code 1.", type: "summary" },
  ],

  "npx dg check --staged": [
    { text: "", type: "blank" },
    { text: "  Diff-Guardian Check (staged)", type: "header" },
    { text: "", type: "blank" },
    { text: "  [SAFE] Additions / Expansions (3)", type: "success" },
    { text: "     Identified harmless API expansions.", type: "info" },
    { text: "", type: "blank" },
    { text: "  ────────────────────────────────────────", type: "info" },
    { text: "  [PASSED]", type: "success" },
    { text: "  API contract is intact. Safe to merge.", type: "success" },
  ],

  "npx dg check": [
    { text: "", type: "blank" },
    { text: "  Diff-Guardian Check (working tree)", type: "header" },
    { text: "", type: "blank" },
    { text: "  [WARNING] Non-Breaking Issues (1)", type: "detail" },
    { text: "", type: "blank" },
    { text: "  ► fetchUser (return_type_widened)", type: "detail" },
    { text: "    src/api/users.ts:15", type: "trace" },
    { text: "    R06: Return type now includes null.", type: "detail" },
    { text: "", type: "blank" },
    { text: "  ────────────────────────────────────────", type: "info" },
    { text: "  [PASSED WITH WARNINGS]", type: "detail" },
    { text: "  1 non-breaking issue(s) flagged. Review before merging.", type: "detail" },
  ],

  "npx dg rules": [
    { text: "", type: "blank" },
    { text: "  Diff-Guardian Rules", type: "header" },
    { text: "", type: "blank" },
    { text: "  R01 - Param Removed          [Target: function]", type: "trace" },
    { text: "  R02 - Param Reordered        [Target: function]", type: "trace" },
    { text: "  R03 - Required Param Added   [Target: function]", type: "trace" },
    { text: "  R04 - Param Type Narrowed    [Target: function]", type: "trace" },
    { text: "  R06 - Return Nullable        [Target: function]", type: "trace" },
    { text: "  R08 - Unexported             [Target: symbol]", type: "trace" },
    { text: "  R25 - Interface Prop Required [Target: interface]", type: "trace" },
    { text: "  R26 - Interface Prop Removed  [Target: interface]", type: "trace" },
    { text: "  R27 - Enum Member Changed    [Target: enum]", type: "trace" },
    { text: "  ... and 19 more rules", type: "info" },
  ],

  "npx dg init": [
    { text: "", type: "blank" },
    { text: "  Diff-Guardian Init", type: "header" },
    { text: "", type: "blank" },
    { text: "  [created] .github/workflows/diff-guardian.yml", type: "success" },
    { text: "  [created] dg.config.json", type: "success" },
    { text: "", type: "blank" },
    { text: "  Done. 2 file(s) created, 0 skipped.", type: "success" },
    { text: "  Commit these files and push to activate Diff-Guardian on your PRs.", type: "info" },
  ],

  "npx dg --help": [
    { text: "", type: "blank" },
    { text: "  Diff-Guardian — API Contract Enforcement Engine", type: "header" },
    { text: "", type: "blank" },
    { text: "  Usage: npx dg <command> [options]", type: "trace" },
    { text: "", type: "blank" },
    { text: "  check              Analyze uncommitted working tree changes", type: "trace" },
    { text: "  check --staged     Analyze only staged files", type: "trace" },
    { text: "  compare <base>     Compare two git refs", type: "trace" },
    { text: "  trace <symbol>     Show all importers and call sites", type: "trace" },
    { text: "  rules              List all classification rules", type: "trace" },
    { text: "  init               Scaffold config + GitHub Actions workflow", type: "trace" },
  ],

  "npx dg trace processPayment": [
    { text: "", type: "blank" },
    { text: "  Diff-Guardian Trace: processPayment", type: "header" },
    { text: "  Scanning repo for importers...", type: "info" },
    { text: "", type: "blank" },
    { text: "  processPayment — 3 importer(s) found", type: "success" },
    { text: "", type: "blank" },
    { text: "  src/checkout/handler.ts", type: "trace" },
    { text: "    L4  processPayment  [static]", type: "info" },
    { text: "  src/invoices/gen.ts", type: "trace" },
    { text: "    L2  processPayment  [static]", type: "info" },
    { text: "  tests/payments.test.ts", type: "trace" },
    { text: "    L1  processPayment  [static]", type: "info" },
    { text: "", type: "blank" },
    { text: "  Total: 3 import(s) across 3 file(s)", type: "info" },
  ],

  "git push": [
    { text: "", type: "blank" },
    { text: "  Diff-Guardian: Running pre-push API contract gatekeeper...", type: "header" },
    { text: "", type: "blank" },
    { text: "  Diff-Guardian API Analysis", type: "header" },
    { text: "  Base: main -> Head: feature/payments", type: "info" },
    { text: "", type: "blank" },
    { text: "  [BREAKING] Changes (2)", type: "error" },
    { text: "", type: "blank" },
    { text: "  > processPayment (signature_change)", type: "error" },
    { text: "    src/api/payments.ts:42", type: "trace" },
    { text: "    R01: Parameter 'currency' was removed.", type: "detail" },
    { text: "", type: "blank" },
    { text: "  > UserConfig (interface_property_removed)", type: "error" },
    { text: "    src/types/config.ts:8", type: "trace" },
    { text: "    R26: Property 'timeout' was removed from interface.", type: "detail" },
    { text: "", type: "blank" },
    { text: "  ────────────────────────────────────────", type: "info" },
    { text: "  [STRICT MODE]", type: "summary" },
    { text: "  2 breaking changes found. Exiting with code 1.", type: "summary" },
    { text: "", type: "blank" },
    { text: "  error: failed to push some refs to 'origin'", type: "error" },
    { text: "  hint: the pre-push hook returned exit code 1", type: "detail" },
  ],

  "git push --no-verify": [
    { text: "", type: "blank" },
    { text: "  Enumerating objects: 5, done.", type: "info" },
    { text: "  Counting objects: 100% (5/5), done.", type: "info" },
    { text: "  Writing objects: 100% (3/3), 312 bytes | 312.00 KiB/s, done.", type: "info" },
    { text: "  Total 3 (delta 2), reused 0 (delta 0)", type: "info" },
    { text: "  To github.com:your-org/your-repo.git", type: "trace" },
    { text: "     abc1234..def5678  feature/payments -> feature/payments", type: "trace" },
    { text: "", type: "blank" },
    { text: "  [WARNING] Pre-push hook was skipped (--no-verify).", type: "detail" },
    { text: "  API contract was NOT checked before push.", type: "detail" },
  ],

  "git merge feature/payments": [
    { text: "", type: "blank" },
    { text: "  Diff-Guardian: Running pre-merge API audit...", type: "header" },
    { text: "", type: "blank" },
    { text: "  Diff-Guardian API Analysis", type: "header" },
    { text: "  Base: main -> Head: feature/payments", type: "info" },
    { text: "", type: "blank" },
    { text: "  [BREAKING] Changes (1)", type: "error" },
    { text: "", type: "blank" },
    { text: "  > processPayment (signature_change)", type: "error" },
    { text: "    src/api/payments.ts:42", type: "trace" },
    { text: "    R01: Parameter 'currency' was removed.", type: "detail" },
    { text: "", type: "blank" },
    { text: "  ────────────────────────────────────────", type: "info" },
    { text: "  [STRICT MODE]", type: "summary" },
    { text: "  1 breaking change found. Exiting with code 1.", type: "summary" },
    { text: "", type: "blank" },
    { text: "  Automatic merge failed; pre-merge-commit hook returned exit code 1.", type: "error" },
  ],

  "git merge --no-verify feature/payments": [
    { text: "", type: "blank" },
    { text: "  Merge made by the 'ort' strategy.", type: "info" },
    { text: "   src/api/payments.ts | 12 ++++++------", type: "trace" },
    { text: "   src/types/config.ts |  3 +--", type: "trace" },
    { text: "   2 files changed, 7 insertions(+), 8 deletions(-)", type: "info" },
    { text: "", type: "blank" },
    { text: "  [WARNING] Pre-merge-commit hook was skipped (--no-verify).", type: "detail" },
    { text: "  API contract was NOT checked before merge.", type: "detail" },
    { text: "", type: "blank" },
    { text: "  Diff-Guardian: Generating post-merge API report...", type: "header" },
    { text: "  Report written to .dg-report.json", type: "success" },
  ],

  "npx dg --version": [
    { text: "", type: "blank" },
    { text: "  diff-guardian v0.1.3", type: "header" },
  ],
};

// Also accept aliases
const COMMAND_ALIASES: Record<string, string> = {
  "npx dg help": "npx dg --help",
  "npx dg -h": "npx dg --help",
  "npx dg -help": "npx dg --help",
  "dg --help": "npx dg --help",
  "dg -h": "npx dg --help",
  "dg help": "npx dg --help",
  "dg compare main feature/payments": "npx dg compare main feature/payments",
  "dg check": "npx dg check",
  "dg check --staged": "npx dg check --staged",
  "dg rules": "npx dg rules",
  "dg init": "npx dg init",
  "dg trace processPayment": "npx dg trace processPayment",
  "dg --version": "npx dg --version",
  "dg -v": "npx dg --version",
  "npx dg -v": "npx dg --version",
  "git push origin main": "git push",
  "git push origin feature/payments": "git push",
  "git push -n": "git push --no-verify",
  "git merge --no-verify feature": "git merge --no-verify feature/payments",
};

// ── Auto-play demo lines (initial animation) ─────────────────────────────────
const demoLines: Array<TermLine & { delay: number }> = [
  { text: "$ npx dg compare main feature/payments", type: "command", delay: 0 },
  ...COMMANDS["npx dg compare main feature/payments"].map((line, i) => ({
    ...line,
    delay: 600 + i * 180,
  })),
];

// ── Suggested commands shown in hint ─────────────────────────────────────────
const SUGGESTIONS = [
  "npx dg --help",
  "npx dg check --staged",
  "git push",
  "git push --no-verify",
  "git merge feature/payments",
  "clear",
];

export default function Terminal() {
  // ── State ────────────────────────────────────────────────────────────────
  const [lines, setLines] = useState<TermLine[]>([]);
  const [demoPhase, setDemoPhase] = useState(true);
  const [demoVisible, setDemoVisible] = useState(0);
  const [started, setStarted] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const [rotation, setRotation] = useState(20);
  const [scale, setScale] = useState(0.9);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // ── Intersection observer (auto-play trigger) ────────────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) setStarted(true);
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  // ── Auto-play demo ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!started || !demoPhase) return;
    const timeouts: NodeJS.Timeout[] = [];
    demoLines.forEach((line, i) => {
      timeouts.push(
        setTimeout(() => setDemoVisible((prev) => Math.max(prev, i + 1)), line.delay)
      );
    });
    // After demo completes, transition to interactive mode
    const lastDelay = demoLines[demoLines.length - 1].delay;
    timeouts.push(
      setTimeout(() => {
        // Copy demo content into interactive lines
        setLines(demoLines.map(({ text, type }) => ({ text, type })));
        setDemoPhase(false);
        // Show hint after a beat
        setTimeout(() => setShowHint(true), 800);
      }, lastDelay + 600)
    );
    return () => timeouts.forEach(clearTimeout);
  }, [started, demoPhase]);

  // ── Scroll to bottom on new output ───────────────────────────────────────
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [lines, demoVisible]);

  // ── 3D scroll perspective ────────────────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const progress = Math.max(
        0,
        Math.min(1, 1 - (rect.top - windowHeight * 0.3) / (windowHeight * 0.7))
      );
      setRotation(20 * (1 - progress));
      setScale(0.9 + 0.1 * progress);
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ── Execute a command ────────────────────────────────────────────────────
  const executeCommand = useCallback(
    (cmd: string) => {
      const trimmed = cmd.trim();
      if (!trimmed) return;

      setShowHint(false);

      // clear
      if (trimmed === "clear") {
        setLines([]);
        setHistory((prev) => [...prev, trimmed]);
        setHistoryIndex(-1);
        return;
      }

      // Resolve command
      const resolved = COMMANDS[trimmed] || COMMANDS[COMMAND_ALIASES[trimmed]];

      const commandLine: TermLine = { text: `$ ${trimmed}`, type: "command" };

      if (resolved) {
        setLines((prev) => [...prev, commandLine, ...resolved]);
      } else {
        setLines((prev) => [
          ...prev,
          commandLine,
          { text: "", type: "blank" },
          { text: `  Unknown command: "${trimmed}"`, type: "error" },
          { text: "  Try: npx dg --help", type: "info" },
        ]);
      }

      setHistory((prev) => [...prev, trimmed]);
      setHistoryIndex(-1);
    },
    []
  );

  // ── Key handler ──────────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      executeCommand(inputValue);
      setInputValue("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(newIndex);
      setInputValue(history[newIndex]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex === -1) return;
      const newIndex = historyIndex + 1;
      if (newIndex >= history.length) {
        setHistoryIndex(-1);
        setInputValue("");
      } else {
        setHistoryIndex(newIndex);
        setInputValue(history[newIndex]);
      }
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  };

  // ── Focus input on terminal click ────────────────────────────────────────
  const focusInput = () => {
    if (!demoPhase && inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div ref={ref} className="terminal-wrapper" style={{ perspective: "1200px" }}>
      <div
        className={`terminal ${!demoPhase ? "terminal-interactive" : "terminal-pulse"}`}
        onClick={focusInput}
        style={{
          transform: `rotateX(${rotation}deg) scale(${scale})`,
          transformOrigin: "bottom center",
          transition: "transform 0.1s ease-out, box-shadow 0.3s ease",
          boxShadow: `0 ${25 + (1 - scale) * 50}px 50px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.02) inset`,
          cursor: !demoPhase ? "text" : "default",
        }}
      >
        {/* macOS Title Bar */}
        <div className="terminal-header">
          <div className="terminal-dots">
            <div className="terminal-dot terminal-dot-red" />
            <div className="terminal-dot terminal-dot-yellow" />
            <div className="terminal-dot terminal-dot-green" />
          </div>
          <span
            className="terminal-title"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            diff-guardian — Terminal
          </span>

          {/* Interactive badge */}
          {!demoPhase && (
            <span className="terminal-badge">
              interactive
            </span>
          )}
        </div>

        {/* Terminal Body */}
        <div className="terminal-body" ref={bodyRef}>
          {demoPhase ? (
            // ── Demo phase: animated lines ──────────────────────────────
            <>
              {demoLines.map((line, i) => (
                <div
                  key={i}
                  className="terminal-line"
                  style={{
                    opacity: i < demoVisible ? 1 : 0,
                    transform: i < demoVisible ? "translateY(0)" : "translateY(4px)",
                    fontFamily: "var(--font-jetbrains), monospace",
                    color: lineColors[line.type] || "#94a3b8",
                    fontWeight: line.type === "error" || line.type === "summary" ? 600 : 400,
                  }}
                >
                  {line.text === "" ? "\u00A0" : line.text}
                </div>
              ))}
            </>
          ) : (
            // ── Interactive phase ───────────────────────────────────────
            <>
              {lines.map((line, i) => (
                <div
                  key={i}
                  className="terminal-line"
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    color: lineColors[line.type] || "#94a3b8",
                    fontWeight: line.type === "error" || line.type === "summary" ? 600 : 400,
                  }}
                >
                  {line.text === "" ? "\u00A0" : line.text}
                </div>
              ))}

              {/* Input line */}
              <div
                className="terminal-line terminal-input-line"
                style={{ fontFamily: "var(--font-jetbrains), monospace" }}
              >
                <span style={{ color: "#f1f5f9" }}>$ </span>
                <input
                  ref={inputRef}
                  type="text"
                  className="terminal-input"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  spellCheck={false}
                  autoComplete="off"
                  autoCapitalize="off"
                  aria-label="Terminal command input"
                  style={{ fontFamily: "var(--font-jetbrains), monospace" }}
                />
              </div>

              {/* Hint */}
              {showHint && (
                <div className="terminal-hint">
                  try: {SUGGESTIONS.map((s, i) => (
                    <button
                      key={s}
                      className="terminal-hint-cmd"
                      onClick={(e) => {
                        e.stopPropagation();
                        executeCommand(s);
                        setShowHint(false);
                      }}
                      style={{ fontFamily: "var(--font-jetbrains), monospace" }}
                    >
                      {s}{i < SUGGESTIONS.length - 1 ? "" : ""}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
