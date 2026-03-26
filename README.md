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

## Content Structure

- [`_config.yml`](/Users/maysam/Workspace/aralel/aralel-software-studios/_config.yml): Jekyll configuration
- [`Gemfile`](/Users/maysam/Workspace/aralel/aralel-software-studios/Gemfile): Ruby dependencies
- [`_data/products.json`](/Users/maysam/Workspace/aralel/aralel-software-studios/_data/products.json): central catalog data for apps and games
- [`_data/locales/`](/Users/maysam/Workspace/aralel/aralel-software-studios/_data/locales): shared German and English locale content for navigation, page copy, metadata, and product text
- [`_layouts/`](/Users/maysam/Workspace/aralel/aralel-software-studios/_layouts): shared page layouts
- [`_includes/`](/Users/maysam/Workspace/aralel/aralel-software-studios/_includes): reusable partials such as head, header, footer, cards, and store links
- [`styles.css`](/Users/maysam/Workspace/aralel/aralel-software-studios/styles.css): shared site styling
- [`script.js`](/Users/maysam/Workspace/aralel/aralel-software-studios/script.js): shared interactive behavior

## Main Pages

- [`index.html`](/Users/maysam/Workspace/aralel/aralel-software-studios/index.html): German homepage
- [`en.html`](/Users/maysam/Workspace/aralel/aralel-software-studios/en.html): English homepage
- [`apps.html`](/Users/maysam/Workspace/aralel/aralel-software-studios/apps.html): German apps listing
- [`apps_en.html`](/Users/maysam/Workspace/aralel/aralel-software-studios/apps_en.html): English apps listing
- [`games.html`](/Users/maysam/Workspace/aralel/aralel-software-studios/games.html): German games listing
- [`games_en.html`](/Users/maysam/Workspace/aralel/aralel-software-studios/games_en.html): English games listing

Product detail pages live under:

- [`apps/`](/Users/maysam/Workspace/aralel/aralel-software-studios/apps)
- [`games/`](/Users/maysam/Workspace/aralel/aralel-software-studios/games)

## Updating Products

The product catalog is driven by [`_data/products.json`](/Users/maysam/Workspace/aralel/aralel-software-studios/_data/products.json).

Each product entry contains:

- `slug`
- `type`
- `iconUrl`
- `stores`
- optional `websiteUrl`
- optional `privacyUrl`

Shared translated copy lives in [`_data/locales/de.json`](/Users/maysam/Workspace/aralel/aralel-software-studios/_data/locales/de.json) and [`_data/locales/en.json`](/Users/maysam/Workspace/aralel/aralel-software-studios/_data/locales/en.json).

To add or update a product:

1. Edit the product entry in [`_data/products.json`](/Users/maysam/Workspace/aralel/aralel-software-studios/_data/products.json).
2. Update the matching translated product copy under `products.<slug>` in both locale files.
3. Ensure the matching page file exists under `apps/` or `games/`.
4. Run `bundle exec jekyll build` to verify the site still renders correctly.

## Notes

- The repo still contains some standalone utility pages such as [`market.html`](/Users/maysam/Workspace/aralel/aralel-software-studios/market.html) and [`map.html`](/Users/maysam/Workspace/aralel/aralel-software-studios/map.html).
- `available/` and `.well-known/` are included explicitly through Jekyll config.
- The source catalog script files remain under [`scripts/`](/Users/maysam/Workspace/aralel/aralel-software-studios/scripts), but the live site reads from [`_data/products.json`](/Users/maysam/Workspace/aralel/aralel-software-studios/_data/products.json).
