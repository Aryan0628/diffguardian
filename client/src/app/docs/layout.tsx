"use client";

import { useState } from "react";
import Link from "next/link";
import DocsSidebar from "@/components/docs/DocsSidebar";
import SearchModal from "@/components/SearchModal";
import ThemeToggle from "@/components/ThemeToggle";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <SearchModal />

      {/* Docs Navbar */}
      <nav className="docs-navbar">
        <div className="docs-navbar-inner">
          <div className="docs-navbar-left">
            {/* Mobile hamburger */}
            <button
              className="docs-hamburger"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <Link href="/" className="docs-navbar-brand">
              <div className="navbar-logo-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
              </div>
              <span style={{ fontFamily: "var(--font-space-grotesk)" }}>
                diff-guardian
              </span>
            </Link>

            <span className="docs-navbar-sep">/</span>
            <span className="docs-navbar-label" style={{ fontFamily: "var(--font-space-grotesk)" }}>
              docs
            </span>
          </div>

          <div className="docs-navbar-right">
            <button
              className="navbar-search docs-search-btn"
              onClick={() => {
                // Trigger Cmd+K
                window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
              }}
              style={{ fontFamily: "var(--font-space-grotesk)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <span className="navbar-search-text" style={{ color: "#a1a1aa" }}>Search</span>
              <span className="navbar-search-kbd" style={{ fontFamily: "var(--font-jetbrains)", color: "#a1a1aa", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}>
                &#8984;K
              </span>
            </button>

            <a
              href="https://github.com/Aryan0628/diff-guardian"
              className="navbar-icon-link"
              aria-label="GitHub"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#a1a1aa">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>

            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Docs body */}
      <div className="docs-layout">
        <DocsSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="docs-main">
          <article className="docs-content">
            {children}
          </article>
        </main>
      </div>
    </>
  );
}
