<p align="center">
  <img src="assets/banner.png" alt="Diff Guardian" width="500" />
</p>

<p align="center">
  <strong>The official documentation and marketing site for <a href="https://github.com/Aryan0628/diff-guardian">Diff Guardian</a>.</strong>
</p>

<p align="center">
  <a href="https://diffguardian.space">Live Site</a> &middot;
  <a href="https://github.com/Aryan0628/diff-guardian">CLI Repository</a>
</p>

---

## About

This is the source code for [diffguardian.space](https://diffguardian.space) — the documentation, guides, and landing page for the Diff Guardian CLI.

### What's inside

- **Landing page** — Hero, features, terminal demo, and language support
- **Documentation** — 25+ pages covering architecture, CLI reference, all 26 classification rules, configuration, CI/CD integration, and git hooks
- **Search** — `Cmd+K` powered search across all docs
- **Dark/Light mode** — Theme toggle with system preference detection

---

## Tech Stack

| Technology | Purpose |
|---|---|
| [Next.js 16](https://nextjs.org) | App Router, static generation, file-based routing |
| [React 19](https://react.dev) | UI components |
| [Tailwind CSS 4](https://tailwindcss.com) | Styling |
| [Lenis](https://lenis.darkroom.engineering) | Smooth scrolling |
| [Lucide React](https://lucide.dev) | Icons |
| [TypeScript](https://www.typescriptlang.org) | Type safety |

---

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9

### Development

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

### Build

```bash
# Production build
npm run build

# Serve the production build
npm start
```

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── layout.tsx                  # Root layout (fonts, metadata, providers)
│   ├── globals.css                 # Global styles
│   └── docs/[[...slug]]/           # Dynamic docs routing
│       └── page.tsx                # Docs page with slug → component mapping
│
├── components/
│   ├── Hero.tsx                    # Landing hero section
│   ├── Features.tsx                # Feature grid
│   ├── Terminal.tsx                # Interactive terminal demo
│   ├── Languages.tsx               # Supported languages section
│   ├── Navbar.tsx                  # Navigation bar
│   ├── Footer.tsx                  # Site footer
│   ├── SearchModal.tsx             # Cmd+K search modal
│   ├── SmoothScroll.tsx            # Lenis smooth scroll provider
│   ├── SyntaxBackground.tsx        # Animated code background
│   ├── ThemeProvider.tsx           # Dark/light mode provider
│   ├── ThemeToggle.tsx             # Theme switch button
│   └── docs/
│       ├── DocsLayout.tsx          # Docs page layout (sidebar + content)
│       ├── DocsSidebar.tsx         # Docs navigation sidebar
│       └── RuleDetailPage.tsx      # Individual rule detail pages
│
└── content/
    └── docs/                       # Documentation content (TSX components)
        ├── getting-started.tsx
        ├── how-it-works.tsx
        ├── architecture.tsx
        ├── cli-check.tsx
        ├── cli-compare.tsx
        ├── ...
        └── rules-data.ts           # Classification rules data
```

---

## Adding Documentation

All docs are TSX components in `src/content/docs/`. To add a new page:

1. Create a new file in `src/content/docs/your-page.tsx`
2. Register the slug → component mapping in `src/app/docs/[[...slug]]/page.tsx`
3. Add it to the sidebar in `src/components/docs/DocsSidebar.tsx`

---

## License

[ISC](https://github.com/Aryan0628/diff-guardian/blob/main/LICENSE) &copy; Aryan Gupta
