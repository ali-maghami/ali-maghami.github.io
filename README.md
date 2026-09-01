# maghamis - Personal Website & Portfolio

A modern, fast, and content-driven personal website built with [Astro](https://astro.build/) and [Tailwind CSS](https://tailwindcss.com/).

## ✨ Features

- 💼 **Project Showcase:** Separate sections and categorization for **Personal Projects** and **Previous Work / Professional Experience**.
- 📝 **Blog & Markdown Support:** MDX and Markdown content collections with schema validation.
- 🎨 **Tailwind CSS Integration:** Fast and flexible styling.
- ⚡ **Blazing Fast:** Static site generation with Astro for 100/100 Lighthouse performance.
- 🚀 **GitHub Pages Ready:** Built-in GitHub Actions CI/CD workflow (`.github/workflows/deploy.yml`).
- 📡 **SEO & Feeds:** Automatic sitemap and RSS feed generation.

## 📁 Content Structure

- **Projects (`src/content/projects/`):**
  Add markdown files with `type: 'personal'` or `type: 'previous'` frontmatter to showcase your work.
  ```yaml
  ---
  title: 'My Project Name'
  description: 'A brief description of what was built.'
  type: 'personal' # or 'previous'
  pubDate: 2026-09-01
  tags: ['Astro', 'TypeScript', 'TailwindCSS']
  repoUrl: 'https://github.com/maghamis/...'
  liveUrl: 'https://...'
  ---
  ```
- **Blog Posts (`src/content/blog/`):**
  Add markdown / MDX articles to share technical insights, tutorials, and notes.

## 🚀 Quick Start

```sh
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Build for production
npm run build

# 4. Preview production build
npm run preview
```

## 🌐 Deploying to GitHub Pages

1. In your GitHub repository settings, go to **Settings > Pages**.
2. Under **Build and deployment > Source**, select **GitHub Actions**.
3. Push to `main` branch and the workflow will build and deploy automatically!

