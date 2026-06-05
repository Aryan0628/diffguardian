"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { sections } from "./docs/DocsSidebar";

interface SearchResult {
  label: string;
  slug: string;
  section: string;
}

export default function SearchModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Build search index from sidebar sections
  const allItems: SearchResult[] = sections.flatMap((section) =>
    section.items.map((item) => ({
      label: item.label,
      slug: item.slug,
      section: section.title,
    }))
  );

  // Cmd+K handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setActiveIndex(0);
    }
  }, [isOpen]);

  // Filter results
  useEffect(() => {
    if (!query.trim()) {
      setResults(allItems);
    } else {
      const q = query.toLowerCase();
      setResults(
        allItems.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            item.section.toLowerCase().includes(q) ||
            item.slug.toLowerCase().includes(q)
        )
      );
    }
    setActiveIndex(0);
  }, [query]);

  const navigate = useCallback(
    (slug: string) => {
      setIsOpen(false);
      router.push(`/docs/${slug}`);
    },
    [router]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      navigate(results[activeIndex].slug);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="search-overlay" onClick={() => setIsOpen(false)}>
      <div className="search-modal" onClick={(e) => e.stopPropagation()}>
        {/* Search input */}
        <div className="search-input-wrapper">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#737373" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder="Search documentation..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          />
          <kbd className="search-kbd" style={{ fontFamily: "var(--font-jetbrains)" }}>
            esc
          </kbd>
        </div>

        {/* Results */}
        <div className="search-results">
          {results.length === 0 ? (
            <div className="search-empty">No results found</div>
          ) : (
            results.map((item, index) => (
              <button
                key={item.slug}
                className={`search-result ${index === activeIndex ? "search-result-active" : ""}`}
                onClick={() => navigate(item.slug)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <span className="search-result-section" style={{ fontFamily: "var(--font-jetbrains)" }}>
                  {item.section}
                </span>
                <span className="search-result-label" style={{ fontFamily: "var(--font-space-grotesk)" }}>
                  {item.label}
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-result-arrow">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="search-footer" style={{ fontFamily: "var(--font-jetbrains)" }}>
          <span><kbd>↑↓</kbd> Navigate</span>
          <span><kbd>↵</kbd> Open</span>
          <span><kbd>esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}
