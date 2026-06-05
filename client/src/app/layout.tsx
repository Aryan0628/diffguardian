import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import SmoothScroll from "@/components/SmoothScroll";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Diff Guardian — Catch Breaking API Changes Before They Ship",
  description:
    "A CLI that diffs git branches, parses both sides with WASM Tree-Sitter ASTs, classifies changes across 28 rules, then traces call sites to show you exactly what breaks. TypeScript, Go, Python, Java, Rust.",
  keywords: [
    "API breaking changes",
    "git diff",
    "AST parser",
    "tree-sitter",
    "TypeScript",
    "static analysis",
    "CI/CD",
    "developer tools",
  ],
  openGraph: {
    title: "Diff Guardian — Catch Breaking API Changes Before They Ship",
    description:
      "WASM Tree-Sitter AST parsing + 28 classification rules + JIT call-site tracing. Zero config. 6 languages.",
    type: "website",
    url: "https://diff-guardian.dev",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} bg-grid`}
        style={{ fontFamily: "var(--font-inter), sans-serif" }}
      >
        <div 
          className="fixed inset-0 pointer-events-none layout-glow" 
          style={{ zIndex: 0 }} 
        />
        <ThemeProvider attribute="class" defaultTheme="dark">
          <SmoothScroll>{children}</SmoothScroll>
        </ThemeProvider>
      </body>
    </html>
  );
}
