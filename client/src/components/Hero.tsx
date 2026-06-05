"use client";

import { useEffect, useState } from "react";
import Terminal from "./Terminal";

export default function Hero() {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => setVisible(true), []);

  return (
    <section className="hero">
      <div className="hero-glow" />

      <div className="page-container" style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* Decorative code tag */}
        <div className={`fade-in ${visible ? "visible" : ""}`}>
          <p className="hero-code-tag" style={{ fontFamily: "var(--font-jetbrains)" }}>
            tree-sitter · wasm · <code style={{ color: "var(--accent)" }}>zero-config</code>
          </p>
        </div>

        {/* Headline */}
        <div className={`fade-in ${visible ? "visible" : ""}`} style={{ transitionDelay: "0.1s", textAlign: "center" }}>
          <h1 className="hero-title" style={{ fontFamily: "var(--font-space-grotesk)" }}>
            Catch breaking API
            <br />
            <span className="gradient-text">changes before they ship.</span>
          </h1>
        </div>

        {/* Subtitle */}
        <div className={`fade-in ${visible ? "visible" : ""}`} style={{ transitionDelay: "0.2s", textAlign: "center" }}>
          <p className="hero-subtitle">
            Parses both sides of a git diff into ASTs, classifies every structural
            change, and traces call sites to show you exactly what breaks.
            {" "}<strong>TypeScript</strong>, <strong>Go</strong>, <strong>Python</strong>, <strong>Java</strong>, <strong>Rust</strong> — Say goodbye to PR merge headaches.
          </p>
        </div>

        {/* Command pills & Primary Button */}
        <div className={`fade-in ${visible ? "visible" : ""}`} style={{ transitionDelay: "0.3s" }}>
          <div className="hero-buttons">
            <a href="/docs" className="btn-primary" style={{ fontFamily: "var(--font-space-grotesk)" }}>
              Get Started
            </a>

            <button
              className="hero-cmd"
              onClick={() => { navigator.clipboard.writeText("npm i diff-guardian && npx dg init"); setCopied("cmd"); setTimeout(() => setCopied(null), 2000); }}
            >
              <code className="hero-cmd-code" style={{ fontFamily: "var(--font-jetbrains)" }}>
                npm i diff-guardian && npx dg init
              </code>
              <span className="hero-cmd-copy">
                {copied === "cmd" ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </span>
            </button>
          </div>
        </div>

        {/* Terminal */}
        <div className={`fade-in ${visible ? "visible" : ""}`} style={{ transitionDelay: "0.5s", width: "100%" }}>
          <Terminal />
        </div>
      </div>
    </section>
  );
}
