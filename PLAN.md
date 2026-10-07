# Plan / Prompt Log

Running log of prompts given to Claude in this repo and what was done in response. Newest entries first.

## 2026-10-07 (7)

**Prompt:** "do the next steps, also mark tasks that are done in plan2.md"

**Done:**
- Phase 5: `scripts/store-sync.mjs` store audit (+ weekly CI `store-audit.yml`), screenshots cached from the stores and shown in a product-page gallery, `aggregateRating` wiring (no app has ratings yet), 10 verified privacy links from the store listings, platform filter chips, consent-gated analytics hook with store-click events, news page + RSS feeds, press kit.
- Phase 6: dark mode (tokens + `data-theme` override), WebP copies via `scripts/build-webp.mjs` + `<picture>` include (−70% image weight), content-hash asset versions plugin, meta CSP + referrer policy, products JSON Schema, meta-refresh redirect for hidden products, rAF parallax, console logs removed, deprecated metas fixed, footer featured products from data.
- `plan2.md`: per-ID status table (✅ / ⏳ / ⬜), every backlog item and roadmap phase marked, open questions annotated.
- Store audit findings for the owner: **LLM Grid Worker** (Mac) published but not in the catalog; renamed listings "Hormuz Strait" and "A Solar Compass"; Streakbox has no privacy page (Shopify requires one).
- Verified: build + `check-site.mjs _site` pass (88 pages), feeds parse as XML, all JS/JSON valid; Chrome: dark mode on product/services/FAQ, light mode unchanged, filter preselection, WebP served, zero cross-origin requests.
- Not done (needs owner): F9 per-app privacy policies, F11 third language, L3, relay operator, S5 decision. Logged in `CHANGELOG.md` under `[0.17.0]`.

## 2026-10-07 (6)

**Prompt:** "improve on the marketing and sales aspects"

**Done:**
- Sales: services page "Shipped by us" proof chips per group (`_data/marketing.yml`), "How we work" process, FAQ with FAQPage schema, enquiry-topic select on both forms, "Need an app like this?" cross-sell panel on every product page.
- Marketing: value-led homepage hero (DE/EN), hero "Discuss a project" → services form instead of mailto, stats band computed from data, iOS Smart App Banner, device-aware store badge order, "More from Aralel" related products, Google Play UTM referrer attribution (App Store `pt`/`ct` ready behind a token).
- Found and fixed: Google Fonts `@import` was a pre-consent third-party request (and contradicted the README); fonts now self-hosted in `fonts/`.
- Kept claims honest: removed iPad and "our own products support RTL" from the FAQ draft since nothing on the site backs them.
- Verified: build + `check-site.mjs _site` pass; FAQ JSON-LD valid; Chrome: zero cross-origin requests, fonts local, proof row/process/FAQ/cross-sell render. Logged in `CHANGELOG.md` under `[0.16.0]`.
- Gotcha: the Chrome extension lost newly navigated tabs; navigating via `location.href` in an attached tab worked.

## 2026-10-07 (5)

**Prompt:** "create a separate page for 'apps for travelling as family or friends' and put buzzbelt and albumara in it and put a link in the footer to it"

**Done:**
- Made it data-driven rather than a one-off page: `collections: ["travel"]` on Buzzbelt and Albumara in `_data/products.json`, new `_layouts/collection_list.html`, pages `travel-apps.html` / `travel-apps_en.html`, DE/EN copy (`pages.travelApps`, `collections.travel`, `footer.travelApps`), footer link in the Portfolio column, `llms.txt` entry, collection-copy check in `check-site.mjs`.
- Verified: build + `check-site.mjs _site` pass (84 pages); both locales list exactly the two apps; hreflang paired; footer link on every page; sitemap includes both; visual check in Chrome.
- Gotcha: commit 5a4c1fa moved `.ruby-version` to 3.3.8 and bumped gems in `Gemfile.lock`; the build failed until `bundle install` under 3.3.8.
- Logged in `CHANGELOG.md` under `[0.15.0]`.

## 2026-10-07 (4)

**Prompt:** "do phase 1 and 2 and 3 and 4" (of `plan2.md`).

**Done:**
- Implemented Phases 1–4; details in `CHANGELOG.md` under `[0.14.0]`, status and deviations at the top of `plan2.md`.
- Phase 1: working contact forms (mailto by default, `contact_form_endpoint` optional), relay pixel behind analytics consent, Impressum (ODR removed, TMG→DDG, data from new `_data/company.yml`), `site.url` → `https://www.aralel.com` (apex verified to 301 to www), debug app removed from `assetlinks.json`, JS page-fade replaced by CSS View Transitions.
- Phase 2: hreflang self-reference + German home unified on `/`, stable JobPosting dates (`_data/jobs.yml`), git-based sitemap `lastmod` plugin, portfolio page metadata, `noindex` for market/map, DE/EN services drift fixed, legacy scripts deleted, `scripts/check-site.mjs`, GitHub Actions workflow (deploy opt-in), Linux platform in `Gemfile.lock`.
- Phase 3: Font Awesome CDN → inline SVG (`scripts/build-icons.mjs`), hero/LCP not hidden by JS, image dimensions, a11y fixes, service worker rewrite, Lighthouse CI budgets, privacy policies updated.
- Phase 4: `localized_path`/`product_path` URL helpers across all templates, company data everywhere, derived availability text, `schemaCategory`/`price`, `scripts/new-product.mjs`.
- New finding: `PLAN.md`/`README.md` were publicly served; repo-only files now excluded from the build.
- Verified: `jekyll build` clean, `check-site.mjs _site` passes (and catches the original bugs on the pre-change code), all JS passes `node --check`, browser check in Chrome (icons, form error path, bfcache back-nav, active nav, hero paint, no console errors).
- Gotchas: `git rm` stages deletions (unstaged again, nothing committed); Python `json.dump` reformats `products.json` (inline arrays), so it is edited with text inserts; this shell has no node/rbenv on PATH (use `/opt/homebrew/bin/node`, `~/.rbenv/shims`).
- Needs the owner: managing director's full name, relay pixel operator, `hello@` vs `contact@`, switching Pages to Actions.

## 2026-10-07 (3)

**Prompt:** Comprehensive code review and strategic improvement plan; save as `plan2.md`, no code changes.

**Done:**
- Reviewed all layouts, includes, client JS, service worker, data/locale files, legal pages and scripts; built the site into a scratch dir to verify output (151 JSON-LD blocks valid, 79 sitemap URLs, no missing stubs/locale copy).
- Wrote `plan2.md`. Top findings: contact forms have no action/field names (submissions are lost); `site.url` is apex while `CNAME` is `www`; undisclosed pre-consent `relay.codehospital.com` pixel; Impressum still cites TMG and the discontinued EU ODR platform; `assetlinks.json` trusts the debug-signed Availabell build for `get_login_creds`; `animations.js` blanks pages on bfcache back-nav and hijacks Cmd-click; hreflang lacks self-reference; JobPosting dates reset every build; DE/EN services copy has drifted.
- No site code changed. Logged in `CHANGELOG.md` under `[0.13.2]`.

## 2026-10-07 (2)

**Prompt:** "yes and yes" — feature Albumara on the front page, and update the albumara.aralel.com landing page so it no longer names only the Android app.

**Done:**
- Set `front_page: true` for `albumara` in `_data/products.json` (`_layouts/home.html` filters on it). Logged under `[0.13.1]`.
- Landing page lives in the separate `../albomara` project (Rails backend), not this repo: edited `backend/app/views/dashboard/sessions/new.html.erb` to say "iPhone and Android apps", and logged it in `../albomara/CHANGELOG.md`. Not deployed.
- Flagged, not changed: the Albumara terms and privacy pages (`pages/terms.html.erb`, `pages/privacy.html.erb`) also describe the service as "the Android app and web viewer".

## 2026-10-07

**Prompt:** "we have a new app for sharing collected media during events and travel trips called Albumara — published in both app store and google play (com.albumara.app, id6812853754), https://albumara.aralel.com/"

**Done:**
- Sourced name, category, description and icon from the App Store lookup API, the Play listing and the albumara.aralel.com landing page (which also has `/privacy`).
- Added the `albumara` product to `_data/products.json` (iphone/android/website, both store links, websiteUrl, privacyUrl), EN/DE copy in `_data/locales/`, detail pages `apps/albumara.html` / `apps/albumara_en.html`, cached icon via `refresh-product-icons.mjs`.
- Gotcha: on the Play page, `itemprop="image"` is the ESRB badge; the real icon is `og:image`.
- Verified with `bundle exec jekyll build` and the local dev server: both detail pages, the Apps catalog card with all three store links, and no console errors. Logged in `CHANGELOG.md` under `[0.13.0]`.

## 2026-09-30

**Prompt:** "script.js: Uncaught SyntaxError: Failed to execute 'querySelector' on 'Document': '#' is not a valid selector."

**Done:**
- Guarded the in-page smooth-scroll handler in `script.js` so hrefs of just `#` are ignored instead of passed to `querySelector`. Logged in `CHANGELOG.md` under `[0.12.18]`.

## 2026-09-29

**Prompt:** "buzzbelt was also published on appstore https://apps.apple.com/us/app/buzzbelt-offline-group-chat/id6809560341"

**Done:**
- Added `stores.appStore` and `"iphone"` to Buzzbelt in `_data/products.json`; updated EN/DE `primaryCta` and `availabilityText` (meta descriptions were already platform-neutral).
- Verified with `bundle exec jekyll build`. Logged in `CHANGELOG.md` under `[0.12.17]`.

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
