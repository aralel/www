# Aralel GmbH Website

This repository contains the bilingual Aralel company website built with Jekyll.

The site includes:

- German and English homepages
- Dedicated listing pages for apps and games
- Dedicated product pages for each published app and game
- Shared header, footer, SEO metadata, and styling through Jekyll layouts and includes
- Direct links to Google Play, the App Store, and product websites where applicable

## Stack

- Jekyll 4
- Liquid templates
- Shared product and locale data in JSON
- Static assets served directly from the repo

## Local Development

1. Install Ruby and Bundler.
2. Install dependencies:

```bash
bundle install
```

3. Start the local Jekyll server:

```bash
bundle exec jekyll serve
```

4. Build the site:

```bash
bundle exec jekyll build
```

The generated output is written to `_site/`.

5. Run the consistency checks (Node 18+, no dependencies):

```bash
node scripts/check-site.mjs          # data, locales, page stubs, job metadata, icons
node scripts/check-site.mjs _site    # + built output: JSON-LD, hreflang, internal links, sitemap
```

CI runs both on every push and pull request (see [Deployment](#deployment)).

## Content Structure

- [`_config.yml`](_config.yml): Jekyll configuration
- [`Gemfile`](Gemfile): Ruby dependencies
- [`_data/products.json`](_data/products.json): central catalog data for apps and games
- [`_data/locales/`](_data/locales): shared German and English locale content for navigation, page copy, metadata, and product text. Both files must have the same key structure (`check-site.mjs` enforces it).
- [`_data/company.yml`](_data/company.yml): company facts (legal name, managing director, address, VAT, register, emails, social profiles). Rendered by the Impressum, footer, homepage contact block, contact forms and the Organization / JobPosting structured data — change them here only.
- [`_data/jobs.yml`](_data/jobs.yml): per-role `date_posted` (and optional `valid_through`) for JobPosting structured data. Add an entry for every new role.
- [`_data/icons.json`](_data/icons.json): SVG path data for the Font Awesome icons the site uses, rendered inline by `_includes/icon.html`. Generated — see [Icons](#icons).
- [`_plugins/`](_plugins): `git_last_modified.rb` sets each page's sitemap `<lastmod>` from git history.
- [`_layouts/`](_layouts): shared page layouts
- [`_includes/`](_includes): reusable partials such as head, header, footer, cards, and store links. URL helpers: `localized_path.html` (`/apps` → `/apps.html` / `/apps_en.html`, `/` → `/` / `/en.html`) and `product_path.html`; use them instead of building `_en` URLs by hand.
- [`styles.css`](styles.css): shared site styling
- [`script.js`](script.js): shared interactive behavior

## Main Pages

- [`index.html`](index.html): German homepage
- [`en.html`](en.html): English homepage
- [`apps.html`](apps.html): German apps listing
- [`apps_en.html`](apps_en.html): English apps listing
- [`games.html`](games.html): German games listing
- [`games_en.html`](games_en.html): English games listing
- [`services.html`](services.html) / [`services_en.html`](services_en.html): software services page (DE / EN)
- [`company.html`](company.html) / [`company_en.html`](company_en.html): company / about page (DE / EN)
- [`frontpage.html`](frontpage.html) / [`frontpage_en.html`](frontpage_en.html): featured-products portfolio page (products with `front_page: true`), the target of the homepage hero button

Product detail pages live under:

- [`apps/`](apps)
- [`games/`](games)

## Updating Products

The product catalog is driven by [`_data/products.json`](_data/products.json).

Each product entry contains:

- `slug`
- `type`
- `hidden`
- `iconUrl`
- `stores`
- optional `websiteUrl`
- optional `privacyUrl`

Shared translated copy lives in [`_data/locales/de.json`](_data/locales/de.json) and [`_data/locales/en.json`](_data/locales/en.json).

Optional product fields:

- `schemaCategory`: schema.org `applicationCategory` for apps (e.g. `TravelApplication`); defaults to `UtilitiesApplication`. Games are always `GameApplication`.
- `price`: price in EUR for structured data; defaults to `"0"`.
- `front_page`: `true` to feature the product on the homepage and the portfolio page.

To add a new product, scaffold it so no file is forgotten:

```bash
node scripts/new-product.mjs <slug> <app|game>
```

This creates both page stubs, a hidden skeleton entry in `products.json` and TODO copy in both locale files, then prints the remaining steps (fill in copy and store links, `node scripts/refresh-product-icons.mjs <slug>`, set `hidden: false`, run `node scripts/check-site.mjs`).

To update a product:

1. Edit the product entry in [`_data/products.json`](_data/products.json).
2. Update the matching translated product copy under `products.<slug>` in both locale files.
3. Run `bundle exec jekyll build` and `node scripts/check-site.mjs _site`.

`availabilityText` in the locale copy is optional. Without it, the detail page builds the sentence from the product's store links and `websiteUrl` (`_includes/availability_text.html`), so adding a store only needs the `products.json` change. `primaryCta` is not rendered anywhere.

Set `hidden` to `true` when a product should be removed from homepage cards, catalog pages, platform pages, and the sitemap without deleting its catalog entry. Hidden product detail pages are also marked `noindex`.

## SEO, Google & AI Discoverability

The site is optimized for search engines, Google rich results, and AI assistants:

- **Canonical host is `https://www.aralel.com`** (`url` in `_config.yml`). It must match `CNAME`: GitHub Pages 301-redirects the apex `aralel.com` to `www`, and canonical URLs must not point at a redirect.
- **Per-page metadata** is resolved centrally in [`_includes/head.html`](_includes/head.html): title, description, canonical, `hreflang` (`de` / `en` / `x-default`, each page also listing itself), Open Graph, Twitter cards, and robots directives (`max-image-preview:large`). Set `noindex: true` in a page's front matter to keep it out of search results and the sitemap.
- **Social sharing (Facebook / LinkedIn / X).** A dedicated 1200×630 share image ([`images/og-image.png`](images/og-image.png)) is the default `og:image`; pages may override it via the `og_image` (+ optional `og_image_width` / `og_image_height`) front-matter keys. `og:image:width/height/type/secure_url`, `og:image:alt`, and `twitter:image:alt` are emitted so cards render correctly on first scrape. Optional `facebook_page`, `facebook_app_id`, and `twitter_handle` keys in [`_config.yml`](_config.yml) add `article:publisher`, `fb:app_id`, and `twitter:site` when set.
- **Structured data (JSON-LD).** A sitewide `@graph` in the head defines a rich `Organization` (`#organization`) and `WebSite` (`#website`) entity; page layouts reference these via `@id` and add page-specific types: `WebPage`, `CollectionPage` + `ItemList` (listings), `SoftwareApplication` / `VideoGame` + `offers` + `BreadcrumbList` (products), `JobPosting` (careers, Google-rich-result compliant), `Service` + `OfferCatalog` (services), and `AboutPage` (company).
- **[`sitemap.xml`](sitemap.xml)** lists all indexable pages with `xhtml:link` hreflang alternates for each bilingual pair. `lastmod` is the date of the last commit touching the page (or `_data/` for data-driven pages), set by `_plugins/git_last_modified.rb`; where plugins don't run, `lastmod` is omitted. Hidden products, `noindex` pages and internal pages are excluded.
- **Job postings** take `datePosted` from `_data/jobs.yml`, so it stays stable across builds.
- **[`robots.txt`](robots.txt)** explicitly welcomes search-engine and AI crawlers (Googlebot, Bingbot, GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Applebot, CCBot, …) and points to the sitemap.
- **[`llms.txt`](llms.txt)** provides AI assistants a concise, build-time-generated markdown map of the company, apps, games, platform pages, and legal pages.
- **No third-party requests before consent.** Icons are inline SVG and product icons are cached in the repo, so pages load only same-origin assets. AdSense (marketing) and the relay.codehospital.com page-view pixel (analytics) load only after consent in `cookie-consent.js`.

These are driven by data — adding a product, role, or service automatically updates the sitemap, structured data, and `llms.txt` on the next build.

## Contact Forms

The homepage and services forms share [`_includes/contact_form.html`](_includes/contact_form.html). By default they open the visitor's email app with a pre-filled message to `emails.contact` from `_data/company.yml` (works without JavaScript too). To deliver submissions directly, set `contact_form_endpoint` in `_config.yml` to a form backend that accepts POSTed form data (e.g. Formspree); `script.js` then submits with `fetch` and shows success/error messages. When you switch, update section 2.2 of both privacy policies to name the provider. Spam protection: a hidden honeypot field (`_gotcha`) and a minimum fill time.

## Icons

Icons are inline SVG from Font Awesome Free (CC BY 4.0), not the Font Awesome CDN. After using a new icon in a template (`{% include icon.html name="envelope" %}`, brands: `style="fab"`), a locale file (`"icon": "fa-users"`), or `_data/company.yml`, regenerate the data file:

```bash
npm pack @fortawesome/fontawesome-free@6.7.2 && tar -xzf fortawesome-fontawesome-free-6.7.2.tgz
node scripts/build-icons.mjs package
```

## Deployment

The site is published on GitHub Pages from `aralel/www` with the custom domain `www.aralel.com` (`CNAME`).

[`.github/workflows/site.yml`](.github/workflows/site.yml) runs on every push and pull request: source checks → `jekyll build` with the pinned Jekyll from `Gemfile.lock` (Ruby from `.ruby-version`) → built-site checks → Lighthouse CI (budgets in [`lighthouserc.json`](lighthouserc.json): accessibility and SEO ≥ 0.95 and CLS ≤ 0.05 fail the run; performance is a warning).

Deploying from the workflow is opt-in. Until it is enabled, GitHub's classic Pages build keeps publishing the site; that build uses GitHub's own Jekyll 3.x and ignores `_plugins/`, so sitemap `lastmod` is omitted there. To deploy through the workflow instead:

1. Repo Settings → Pages → Build and deployment → Source: **GitHub Actions**.
2. Repo Settings → Secrets and variables → Actions → Variables: `PAGES_DEPLOY_VIA_ACTIONS` = `true`.

The deploy job then runs after the checks pass on `main`, so a broken build or failing check blocks the deploy.

## Notes

- Standalone utility pages [`market.html`](market.html) and [`map.html`](map.html) are published but marked `noindex`.
- `available/` and `.well-known/` are included explicitly through Jekyll config. `.well-known/assetlinks.json` lists only the release-signed Availabell app.
- Repo-only files (`README.md`, `PLAN.md`, `plan2.md`, `CHANGELOG.md`, `lighthouserc.json`, `scripts/`, …) are in `exclude:` in `_config.yml`. Jekyll publishes any file not excluded, so add new repo-only files there.
- [`scripts/`](scripts): `check-site.mjs` (consistency checks), `new-product.mjs` (product scaffolder), `build-icons.mjs` (icon data), `refresh-product-icons.mjs` (cached store icons). The site reads catalog data from [`_data/products.json`](_data/products.json) only.
- **Product icons are cached locally** in [`images/products/`](images/products) rather than hotlinked from the App Store / Play Store / Amazon / Shopify CDNs, so the site does not depend on those hosts staying reachable or on their URLs staying stable. In [`_data/products.json`](_data/products.json) each product carries `iconUrl` (the local, site-root-relative path that templates render) alongside `iconSourceUrl` (the store URL it was fetched from). Run `node scripts/refresh-product-icons.mjs [slug ...]` to re-pull them when a store listing ships a new icon; icons are normalised to 512×512, PNGs are compressed with `pngquant` and JPEGs kept as delivered.
