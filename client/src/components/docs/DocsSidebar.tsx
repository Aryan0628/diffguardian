"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface SidebarItem {
  label: string;
  slug: string;
}

interface SidebarSection {
  title: string;
  items: SidebarItem[];
  collapsible?: boolean;
}

const sections: SidebarSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Getting Started", slug: "getting-started" },
      { label: "How It Works", slug: "how-it-works" },
    ],
  },
  {
    title: "Architecture",
    items: [
      { label: "Overview", slug: "architecture" },
      { label: "Git Diff Parser", slug: "architecture/git-diff" },
      { label: "AST Mapper", slug: "architecture/ast-mapper" },
      { label: "Classifier Engine", slug: "architecture/classifier" },
      { label: "Call-Site Tracer", slug: "architecture/tracer" },
    ],
  },
  {
    title: "CLI Reference",
    items: [
      { label: "dg check", slug: "cli/check" },
      { label: "dg compare", slug: "cli/compare" },
      { label: "dg trace", slug: "cli/trace" },
      { label: "dg init", slug: "cli/init" },
      { label: "dg rules", slug: "cli/rules" },
      { label: "dg --help", slug: "cli/help" },
    ],
  },
  {
    title: "Classification Rules",
    collapsible: true,
    items: [
      { label: "All Rules", slug: "rules/all" },
      { label: "R01 Param Removed", slug: "rules/r01" },
      { label: "R02 Param Reordered", slug: "rules/r02" },
      { label: "R03 Required Param Added", slug: "rules/r03" },
      { label: "R04 Type Narrowed", slug: "rules/r04" },
      { label: "R05 Optional Param Added", slug: "rules/r05" },
      { label: "R06 Return Nullable", slug: "rules/r06" },
      { label: "R07 Return Narrowed", slug: "rules/r07" },
      { label: "R08 Unexported", slug: "rules/r08" },
      { label: "R11 Sync to Async", slug: "rules/r11" },
      { label: "R12 Type Widened", slug: "rules/r12" },
      { label: "R13 Generic Narrowed", slug: "rules/r13" },
      { label: "R14 Rest Param Changed", slug: "rules/r14" },
      { label: "R15 Overload Removed", slug: "rules/r15" },
      { label: "R16 Overload Added", slug: "rules/r16" },
      { label: "R17 Static Changed", slug: "rules/r17" },
      { label: "R18 Mutability Narrowed", slug: "rules/r18" },
      { label: "R19 Mutability Widened", slug: "rules/r19" },
      { label: "R20 Visibility Narrowed", slug: "rules/r20" },
      { label: "R21 Async to Sync", slug: "rules/r21" },
      { label: "R22 Return Never", slug: "rules/r22" },
      { label: "R23 Default Changed", slug: "rules/r23" },
      { label: "R24 Constructor Changed", slug: "rules/r24" },
      { label: "R25 Interface Required", slug: "rules/r25" },
      { label: "R26 Interface Removed", slug: "rules/r26" },
      { label: "R27 Enum Changed", slug: "rules/r27" },
      { label: "R28 Exported", slug: "rules/r28" },
    ],
  },
  {
    title: "Configuration",
    items: [
      { label: "dg.config.json", slug: "configuration" },
    ],
  },
  {
    title: "Integration",
    items: [
      { label: "Git Hooks", slug: "git-hooks" },
      { label: "CI/CD", slug: "ci-cd" },
    ],
  },
  {
    title: "Reference",
    items: [
      { label: "Language Support", slug: "languages" },
    ],
  },
];

// Export sections for use in search
export { sections };
export type { SidebarSection, SidebarItem };

interface DocsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DocsSidebar({ isOpen, onClose }: DocsSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    "Classification Rules": true,
  });

  const isActive = (slug: string) => {
    return pathname === `/docs/${slug}`;
  };

  const isSectionActive = (section: SidebarSection) => {
    return section.items.some((item) => isActive(item.slug));
  };

  const toggleSection = (title: string) => {
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  // Auto-expand if a child is active
  const isCollapsed = (section: SidebarSection) => {
    if (!section.collapsible) return false;
    if (isSectionActive(section)) return false;
    return collapsed[section.title] ?? false;
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="docs-sidebar-overlay" onClick={onClose} />}

      <aside className={`docs-sidebar ${isOpen ? "docs-sidebar-open" : ""}`}>
        <div className="docs-sidebar-inner">
          {sections.map((section) => (
            <div key={section.title} className="docs-sidebar-section">
              <h4
                className={`docs-sidebar-title ${section.collapsible ? "docs-sidebar-title-collapsible" : ""}`}
                style={{ fontFamily: "var(--font-space-grotesk)" }}
                onClick={() => section.collapsible && toggleSection(section.title)}
              >
                {section.title}
                {section.collapsible && (
                  <svg
                    className={`docs-sidebar-chevron ${isCollapsed(section) ? "" : "docs-sidebar-chevron-open"}`}
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                )}
              </h4>
              {!isCollapsed(section) && (
                <ul className="docs-sidebar-list">
                  {section.items.map((item) => (
                    <li key={item.slug}>
                      <Link
                        href={`/docs/${item.slug}`}
                        className={`docs-sidebar-link ${isActive(item.slug) ? "docs-sidebar-link-active" : ""}`}
                        onClick={onClose}
                        style={{ fontFamily: "var(--font-jetbrains)" }}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
