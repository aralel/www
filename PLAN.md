# Plan / Prompt Log

Running log of prompts given to Claude in this repo and what was done in response. Newest entries first.

## 2026-09-28

**Prompt:** "anava is now also published in app store https://apps.apple.com/us/app/anava/id6814415159 please update the website"

**Done:**
- Anava was a catalog entry with `hidden: true` (Android-only). Added `stores.appStore` and `"iphone"` to `platforms` in `_data/products.json`, and set `hidden: false` so it is now publicly listed (catalog pages, platform pages, sitemap, llms.txt).
- Updated EN/DE copy in `_data/locales/` (`primaryCta`, `availabilityText`, `metaDescription`).
- Left `scripts/catalog-data.mjs` untouched (stale legacy copy; not updated by the previous Solar Compass change either).
- Verified with `bundle exec jekyll build`. Logged in `CHANGELOG.md` under `[0.12.16]`.

## 2026-09-17

**Prompt:** "https://apps.apple.com/us/app/a-solar-compass/id6813109002 was published, add it to the site"

**Done:**
- A Solar Compass was already a catalog entry (Android-only, via `sunquest.codehospital.com`). Added its new App Store listing: `"iphone"` to `platforms` and `stores.appStore` in `_data/products.json`, matching the `"iphone"` convention used by other dual-platform products (e.g. `arena-sudoku`).
- Updated EN/DE copy in `_data/locales/` (`primaryCta`, `availabilityText`, `metaDescription`) since it previously said "Android" only.
- No template/layout changes needed — `_layouts/product.html` renders store badges and platform pills straight from `products.json`.
- Verified with `bundle exec jekyll build` and the local dev server: App Store badge, iPhone pill, and updated availability text all render correctly on `apps/a-solar-compass.html` / `apps/a-solar-compass_en.html`.
- Logged in `CHANGELOG.md` under `[0.12.15]`.

## 2026-09-06 (2)

**Prompt:** "apps.html should contain all apps and games.html should show all games"

**Done:**
- Checked `_layouts/catalog_list.html` first: it already renders every product where `type` matches the page and `hidden != true` — no filtering bug.
- Took the request as a completeness check instead, and audited Aralel's actual published listings against `_data/products.json` across every storefront represented there: Google Play (developer page `play.google.com/store/apps/dev?id=5186409271854647347`), the App Store (developer page `id1876153136`), the Amazon Appstore, the Samsung Galaxy Store, and the Shopify App Store (`apps.shopify.com/partners/aralel-gmbh`).
- Found one real gap: **Alien Planetary Ambush** (`com.codehospital.turnovers`) was live on Google Play with no catalog entry at all. Added it the same way as Buzzbelt (`_data/products.json`, EN/DE locale copy, `games/alien-planetary-ambush.html` / `_en.html`, cached icon).
- Caught my own mistake mid-task: the first icon I cached for it was wrong (grabbed via a stale `<img>` src right after a same-tab SPA click on the Play Store, before the page's own JS swapped in the real image). Re-fetched from a direct page load and confirmed against a screenshot before finalizing — worth repeating for any icon sourced by clicking through a store UI rather than loading its URL directly.
- Confirmed App Store, Amazon, Samsung, and Shopify have no other gaps — everything published there already has a catalog entry.
- Flagged but did not change: the App Store listing behind `navigating-strait-of-hormuz` (id6785057111) now shows as "Hormuz Strait: Escape the Blockade" rather than "Navigating Strait of Hormuz" on the live store — same app id, so it's a possible stale-name cleanup, not a missing-entry issue. Left for a future prompt since it wasn't what was asked.
- Verified with `bundle exec jekyll build` and the local dev server (card + detail page in both locales, catalog counts cross-checked 1:1 against non-hidden entries in the data). Logged in `CHANGELOG.md` under `[0.12.14]`.

## 2026-09-06

**Prompt:** "add our new app to the portfolio https://buzzbelt.aralel.com/index.html"

**Done:**
- Researched the live site (buzzbelt.aralel.com), its Google Play listing (`com.aralel.buzzbelt`), and its EN/DE privacy pages to source name, description, icon, and copy.
- Found the site's "Download for iPhone" button points to a placeholder App Store id (`id0000000000`, confirmed dead) — listed the product as Android + website only; no App Store link added.
- Added the `buzzbelt` product entry to `_data/products.json`, EN/DE copy to `_data/locales/`, and detail pages `apps/buzzbelt.html` / `apps/buzzbelt_en.html`.
- Cached the icon locally via `node scripts/refresh-product-icons.mjs buzzbelt`.
- Verified with `bundle exec jekyll build` and by browsing the local dev server (both locales, catalog cards, platform pages, sitemap.xml, llms.txt).
- Logged the change in `CHANGELOG.md` under `[0.12.13]`.

**Follow-up when it exists:** once Buzzbelt ships a real App Store listing, add `stores.appStore` in `_data/products.json` and re-run `node scripts/refresh-product-icons.mjs buzzbelt` if the icon should be re-sourced.
