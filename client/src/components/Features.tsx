"use client";

import { useEffect, useRef, useState } from "react";

const features = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="url(#grad1)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--text-secondary)" />
          </linearGradient>
        </defs>
        <line x1="6" y1="3" x2="6" y2="15" />
        <circle cx="18" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <path d="M6 6a9 9 0 0 0 9 0" />
      </svg>
    ),
    title: "Tree-Sitter AST Parsing",
    description: "WASM-compiled grammars parse your old and new source into structured signatures — functions, interfaces, enums, and type aliases.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="url(#grad2)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <defs>
          <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--text-secondary)" />
          </linearGradient>
        </defs>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    title: "Lazy Graph Engine",
    description: "Signature caching and on-demand tracing — only breaking changes trigger call-site resolution. No wasted compute.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="url(#grad3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <defs>
          <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--text-secondary)" />
          </linearGradient>
        </defs>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
    title: "CI/CD & IDE Ready",
    description: "Ships with GitHub Actions workflows, pre-push git hooks, and PR comment reports. Works in your terminal, your editor, and your pipeline.",
  },
];

export default function Features() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty("--x", `${x}px`);
    e.currentTarget.style.setProperty("--y", `${y}px`);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="features" ref={ref} className="trio-section">
      <div className="page-container">
        <div className="trio-grid">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`trio-card-wrapper fade-in ${visible ? "visible" : ""}`}
              style={{ transitionDelay: `${i * 150 + 100}ms` }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              onMouseMove={handleMouseMove}
            >
              {/* Animated gradient border */}
              <div className={`trio-card-border ${hoveredIndex === i ? "trio-card-border-active" : ""}`} />

              <div className="trio-card">
                {/* Icon with glow background */}
                <div className="trio-icon-wrap">
                  <div className={`trio-icon-glow ${hoveredIndex === i ? "trio-icon-glow-active" : ""}`} />
                  <div className="trio-icon">
                    {f.icon}
                  </div>
                </div>

                <h3 className="trio-title">{f.title}</h3>
                <p className="trio-desc">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
