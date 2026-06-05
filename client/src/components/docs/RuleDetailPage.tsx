import CodeBlock from "@/components/docs/CodeBlock";
import Link from "next/link";
import { rulesData, type RuleData } from "@/content/docs/rules-data";

function SeverityBadge({ severity }: { severity: string }) {
  const cls =
    severity === "breaking"
      ? "docs-severity-breaking"
      : severity === "warning"
      ? "docs-severity-warning"
      : "docs-severity-safe";
  return <code className={cls}>{severity.toUpperCase()}</code>;
}

export default function RuleDetailPage({ ruleId }: { ruleId: string }) {
  const rule = rulesData[ruleId];
  if (!rule) return <p>Rule not found.</p>;

  return (
    <>
      <div className="docs-rule-page-header">
        <code className="docs-rule-page-id">{rule.id}</code>
        <SeverityBadge severity={rule.severity} />
        <span className="docs-rule-page-target">{rule.target}</span>
      </div>

      <h1 style={{ fontFamily: "var(--font-space-grotesk)" }}>{rule.name}</h1>
      <p className="docs-lead">{rule.summary}</p>

      <hr className="docs-divider" />

      {/* Languages */}
      <h2 id="languages">Applies to</h2>
      <div className="docs-rule-langs">
        {rule.languages.map((lang) => (
          <span key={lang} className="docs-rule-lang-badge">{lang}</span>
        ))}
      </div>

      {/* Why it matters */}
      <h2 id="why-it-matters">Why it matters</h2>
      {rule.whyItMatters.split("\n\n").map((para, i) => (
        <div
          key={i}
          className="docs-content"
          dangerouslySetInnerHTML={{
            __html: para
              .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
              .replace(/`(.+?)`/g, '<code>$1</code>')
              .replace(/\n- /g, "\n<br/>• ")
              .replace(/^\- /gm, "• "),
          }}
        />
      ))}

      {/* Before / After code */}
      <h2 id="example">Example</h2>
      <div className="docs-rule-comparison">
        <div className="docs-rule-comparison-panel">
          <div className="docs-rule-comparison-label docs-rule-comparison-before">{rule.beforeLabel}</div>
          <CodeBlock code={rule.beforeCode} language="typescript" />
        </div>
        <div className="docs-rule-comparison-panel">
          <div className="docs-rule-comparison-label docs-rule-comparison-after">{rule.afterLabel}</div>
          <CodeBlock code={rule.afterCode} language="typescript" />
        </div>
      </div>

      {/* CLI output */}
      <h2 id="cli-output">What you see in the terminal</h2>
      <CodeBlock code={rule.cliOutput} language="bash" />

      {/* How detection works */}
      <h2 id="detection">How detection works</h2>
      {rule.howItWorks.split("```").map((segment, i) => {
        if (i % 2 === 0) {
          return segment.split("\n\n").map((para, j) => (
            <p key={`${i}-${j}`} dangerouslySetInnerHTML={{
              __html: para
                .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                .replace(/`(.+?)`/g, '<code>$1</code>'),
            }} />
          ));
        }
        const lines = segment.split("\n");
        const lang = lines[0]?.trim() || "typescript";
        const code = lines.slice(1).join("\n").trim();
        return <CodeBlock key={i} code={code} language={lang} />;
      })}

      {/* Real-world scenario */}
      <h2 id="scenario">Real-world scenario</h2>
      <div className="docs-callout">
        <p>{rule.realWorldScenario}</p>
      </div>

      {/* Edge cases */}
      {rule.edgeCases.length > 0 && (
        <>
          <h2 id="edge-cases">Edge cases</h2>
          <ul>
            {rule.edgeCases.map((edge, i) => (
              <li key={i} dangerouslySetInnerHTML={{
                __html: edge
                  .replace(/`(.+?)`/g, '<code>$1</code>'),
              }} />
            ))}
          </ul>
        </>
      )}

      {/* Related rules */}
      {rule.relatedRules.length > 0 && (
        <>
          <h2 id="related">Related rules</h2>
          <div className="docs-related-rules">
            {rule.relatedRules.map((id) => {
              const related = rulesData[id];
              return related ? (
                <Link
                  key={id}
                  href={`/docs/rules/${id.toLowerCase()}`}
                  className="docs-related-rule-link"
                >
                  <code>{id}</code>
                  <span>{related.name}</span>
                  <SeverityBadge severity={related.severity} />
                </Link>
              ) : null;
            })}
          </div>
        </>
      )}

      {/* Navigation */}
      <div className="docs-rule-nav">
        <Link href="/docs/cli/rules">Back to all rules</Link>
      </div>
    </>
  );
}
