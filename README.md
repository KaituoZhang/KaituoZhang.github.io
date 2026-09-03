# Kaituo Zhang — Personal Website

Kaituo Zhang's personal website, built with Astro and statically deployed to GitHub Pages. Notion is used only as the private writing CMS; visitors receive fast static HTML and locally stored image assets.

## How publishing works

1. Write or edit a page in the connected Notion `Blogs` data source.
2. Fill in `Slug`, `Language`, `Summary`, and `PublishedDate`, then set `Status` to `Published`.
3. Run the GitHub Actions workflow manually, or wait for its scheduled six-hour rebuild.
4. The build downloads published page content and images, generates static routes, and deploys them to GitHub Pages.

The Notion token and data source ID live only in GitHub Actions Secrets. They are never included in browser JavaScript or Git history.

## Local development

```sh
pnpm install
pnpm dev
```

Without a local `.env`, the site uses the checked-in preview content. To test a live Notion sync, copy `.env.example` to `.env`, add private credentials, then run:

```sh
pnpm build
pnpm preview
```

Never commit `.env`.

## Main directories

- `src/pages/` — static site routes
- `src/components/` — layout and Notion block rendering
- `scripts/sync-notion.mjs` — build-time Notion sync and image localization
- `src/generated/notion.json` — local preview/build input
- `public/notion-assets/` — stable copies of Notion-hosted images
- `.github/workflows/deploy.yml` — scheduled and push-triggered GitHub Pages deployment
