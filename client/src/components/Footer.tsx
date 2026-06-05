"use client";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="page-container">
        
        {/* Top 3 Columns */}
        <div className="footer-top-grid">
          
          {/* Column 1: Resources */}
          <div className="footer-column">
            <h4 className="footer-col-title" style={{ fontFamily: "var(--font-space-grotesk)" }}>Resources</h4>
            <div className="footer-col-links">
              <a href="/docs/getting-started" className="footer-link" style={{ fontFamily: "var(--font-space-grotesk)" }}>Getting Started</a>
              <a href="/docs" className="footer-link" style={{ fontFamily: "var(--font-space-grotesk)" }}>CLI Reference</a>
              <a href="/docs/configuration" className="footer-link" style={{ fontFamily: "var(--font-space-grotesk)" }}>Configuration</a>
              <a href="https://github.com/Aryan0628/diff-guardian/releases" target="_blank" rel="noopener noreferrer" className="footer-link" style={{ fontFamily: "var(--font-space-grotesk)" }}>Changelog</a>
            </div>
          </div>

          {/* Column 2: Community */}
          <div className="footer-column">
            <h4 className="footer-col-title" style={{ fontFamily: "var(--font-space-grotesk)" }}>Community</h4>
            <div className="footer-col-links">
              <a href="https://github.com/Aryan0628/diff-guardian" target="_blank" rel="noopener noreferrer" className="footer-link" style={{ fontFamily: "var(--font-space-grotesk)" }}>GitHub Repository</a>
              <a href="https://github.com/Aryan0628/diff-guardian/issues/new" target="_blank" rel="noopener noreferrer" className="footer-link" style={{ fontFamily: "var(--font-space-grotesk)" }}>Report a Bug</a>
              <a href="https://github.com/Aryan0628/diff-guardian/issues/new" target="_blank" rel="noopener noreferrer" className="footer-link" style={{ fontFamily: "var(--font-space-grotesk)" }}>Request a Feature</a>
              <a href="mailto:aryan072806@gmail.com" className="footer-link" style={{ fontFamily: "var(--font-space-grotesk)" }}>Contact Us</a>
            </div>
          </div>

          {/* Column 3: Contribute */}
          <div className="footer-column">
            <h4 className="footer-col-title" style={{ fontFamily: "var(--font-space-grotesk)" }}>Contribute</h4>
            <div className="footer-col-links">
              <a href="https://github.com/Aryan0628/diff-guardian/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer" className="footer-link" style={{ fontFamily: "var(--font-space-grotesk)" }}>Contributing Guide</a>
              <a href="https://github.com/Aryan0628/diff-guardian/blob/main/CODE_OF_CONDUCT.md" target="_blank" rel="noopener noreferrer" className="footer-link" style={{ fontFamily: "var(--font-space-grotesk)" }}>Code of Conduct</a>
              <a href="https://npmjs.com/package/diff-guardian" target="_blank" rel="noopener noreferrer" className="footer-link" style={{ fontFamily: "var(--font-space-grotesk)" }}>NPM Package</a>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom-bar">
          <div className="footer-copyright">
            &copy; {new Date().getFullYear()} diff-guardian. Built by <a href="https://www.linkedin.com/in/aryan-gupta-278376313/" target="_blank" rel="noopener noreferrer" className="footer-author-link">Aryan Gupta</a>.
          </div>
          <div className="footer-copyright">
            Distributed under the MIT License.
          </div>
        </div>

      </div>
    </footer>
  );
}
