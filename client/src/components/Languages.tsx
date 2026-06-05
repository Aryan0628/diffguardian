"use client";

import { useEffect, useRef, useState } from "react";

const languages = [
  { name: "TypeScript", ext: ".ts .tsx", color: "#3178c6" },
  { name: "JavaScript", ext: ".js .jsx", color: "#f7df1e" },
  { name: "Python", ext: ".py", color: "#3776ab" },
  { name: "Go", ext: ".go", color: "#00add8" },
  { name: "Java", ext: ".java", color: "#ed8b00" },
  { name: "Rust", ext: ".rs", color: "#dea584" },
];

export default function Languages() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="languages-section">
      <div className="page-container">
        <div className="languages-grid">
          {/* Left — text */}
          <div className={`languages-text fade-in ${visible ? "visible" : ""}`}>
            <span className="section-label" style={{ fontFamily: "var(--font-space-grotesk)" }}>
              Multi-Language
            </span>
            <h2 className="section-title" style={{ marginBottom: "1.5rem" }}>
              One tool for your
              <br />
              <span className="gradient-text">entire stack.</span>
            </h2>
            <p>
              Each language has a dedicated translator module built on
              Tree-Sitter queries. Add a grammar, write a translator —
              the engine handles the rest.
            </p>
          </div>

          {/* Right — cards */}
          <div className="lang-cards">
            {languages.map((lang, i) => (
              <div
                key={lang.name}
                className={`lang-card fade-in ${visible ? "visible" : ""}`}
                style={{ transitionDelay: `${i * 80 + 200}ms` }}
              >
                <div
                  className="lang-dot"
                  style={{
                    background: lang.color,
                    boxShadow: `0 0 12px ${lang.color}40`,
                  }}
                />
                <div className="lang-name">{lang.name}</div>
                <span className="lang-ext" style={{ fontFamily: "var(--font-jetbrains)" }}>
                  {lang.ext}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
