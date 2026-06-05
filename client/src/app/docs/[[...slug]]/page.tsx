import { notFound, redirect } from "next/navigation";

// Content pages
import GettingStarted from "@/content/docs/getting-started";
import HowItWorks from "@/content/docs/how-it-works";
import Architecture from "@/content/docs/architecture";
import CliCheck from "@/content/docs/cli-check";
import CliCompare from "@/content/docs/cli-compare";
import CliTrace from "@/content/docs/cli-trace";
import CliInit from "@/content/docs/cli-init";
import CliRules from "@/content/docs/cli-rules";
import CliHelp from "@/content/docs/cli-help";
import Configuration from "@/content/docs/configuration";
import GitHooks from "@/content/docs/git-hooks";
import CiCd from "@/content/docs/ci-cd";
import Languages from "@/content/docs/languages";

// Architecture sub-pages
import PhaseGitDiff from "@/content/docs/architecture-git-diff";
import PhaseAstMapper from "@/content/docs/architecture-ast-mapper";
import PhaseClassifier from "@/content/docs/architecture-classifier";
import PhaseTracer from "@/content/docs/architecture-tracer";

// Rule detail pages — rendered dynamically from data
import RuleDetailPage from "@/components/docs/RuleDetailPage";
import { ruleIds, rulesData } from "@/content/docs/rules-data";

// Slug → Component mapping
const pages: Record<string, React.ComponentType> = {
  "getting-started": GettingStarted,
  "how-it-works": HowItWorks,
  "architecture": Architecture,
  "cli/check": CliCheck,
  "cli/compare": CliCompare,
  "cli/trace": CliTrace,
  "cli/init": CliInit,
  "cli/rules": CliRules,
  "rules/all": CliRules,
  "cli/help": CliHelp,
  "configuration": Configuration,
  "git-hooks": GitHooks,
  "ci-cd": CiCd,
  "languages": Languages,
  // Architecture deep dives
  "architecture/git-diff": PhaseGitDiff,
  "architecture/ast-mapper": PhaseAstMapper,
  "architecture/classifier": PhaseClassifier,
  "architecture/tracer": PhaseTracer,
};

// Build rule routes: /docs/rules/r01 .. /docs/rules/r28
for (const ruleId of ruleIds) {
  const id = ruleId;
  pages[`rules/${ruleId.toLowerCase()}`] = function RulePage() {
    return <RuleDetailPage ruleId={id} />;
  };
}

// Generate static params for all known pages
export function generateStaticParams() {
  return Object.keys(pages).map((slug) => ({
    slug: slug.split("/"),
  }));
}

// Generate metadata per page
const titles: Record<string, string> = {
  "getting-started": "Getting Started",
  "how-it-works": "How It Works",
  "architecture": "Architecture",
  "cli/check": "dg check",
  "cli/compare": "dg compare",
  "cli/trace": "dg trace",
  "cli/init": "dg init",
  "cli/rules": "dg rules",
  "rules/all": "All Classification Rules",
  "cli/help": "dg --help",
  "configuration": "Configuration",
  "git-hooks": "Git Hooks",
  "ci-cd": "CI/CD Integration",
  "languages": "Language Support",
  "architecture/git-diff": "Phase 1: Git Diff Parser",
  "architecture/ast-mapper": "Phase 2: AST Mapper",
  "architecture/classifier": "Phase 3: Classifier Engine",
  "architecture/tracer": "Phase 4: Call-Site Tracer",
};

// Add rule titles
for (const ruleId of ruleIds) {
  const rule = rulesData[ruleId];
  titles[`rules/${ruleId.toLowerCase()}`] = `${ruleId}: ${rule.name}`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const key = slug?.join("/") || "getting-started";
  const title = titles[key] || "Documentation";
  return {
    title: `${title} - Diff Guardian Docs`,
    description: `Diff Guardian documentation: ${title}`,
  };
}

export default async function DocsSlugPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;

  // /docs with no slug → redirect to getting-started
  if (!slug || slug.length === 0) {
    redirect("/docs/getting-started");
  }

  const key = slug.join("/");
  const PageComponent = pages[key];

  if (!PageComponent) {
    notFound();
  }

  return <PageComponent />;
}
