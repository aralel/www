# Aralel Website — Code Review & Improvement Plan (plan2)

**Date:** 2026-10-07
**Scope:** The whole repository (`aralel/www`): Jekyll templates, data files, client JS, service worker, legal pages, utility pages and scripts.
**Method:** I read every layout, include, script and data file, then ran a clean `jekyll build` into a scratch directory and checked the output: all 151 JSON-LD blocks parse, 79 URLs are in the sitemap, and every product has both locale copies and both page stubs. Each finding below comes from the code or the built output. Items marked **(verify)** depend on hosting settings I can't see from the repo.

> Written as analysis only. Phases 1–4 were implemented afterwards on 2026-10-07; see the status below and `CHANGELOG.md` [0.14.0].

## Implementation status (2026-10-07)

**Done, Phases 1–4:** B1, B2, B3, B4, B5, B6, B10 · S1, S2, S3, S6 · L1, L2, L4, L5 · E1, E2, E3, E4, E5, E6, E7, E8 · P1, P2, P3 · A1–A6 · D1, D2, D3 · 4.1, 4.3, 4.4, 4.5, 4.6, 4.7 · 5.1, 5.2.

**Changed from the plan:**
- **E1** verified with curl: `aralel.com` 301-redirects to `www.aralel.com`, so `site.url` is now `www`.
- **E6:** `frontpage*.html` turned out to be the hero button's featured-products page, not a stray duplicate. It got its own title, description and language pair instead of being removed.
- **E7:** `market.html` / `map.html` set to `noindex` rather than removed (open question 3).
- **S1:** the relay pixel is gated behind analytics consent and disclosed, not removed (open question 2).
- **4.2:** a scaffolder (`scripts/new-product.mjs`) plus the CI stub check, instead of a generator plugin. Classic GitHub Pages ignores plugins, so generated pages would vanish there.
- **4.6:** PWA, install banner and "invalidate cache" link kept, with the worker rewritten.
- **5.2:** `scripts/check-site.mjs` replaces html-proofer/ajv, so CI needs no extra gems or npm packages.
- **B7:** footer featured links skip hidden products but are still a fixed list (`arena-sudoku`, `availabell`).

**New finding while implementing:** `PLAN.md` and `README.md` were publicly served on www.aralel.com, and `plan2.md`/`CHANGELOG.md` would have been too. They are now excluded from the build.

**Still open / needs you:**
- **L3:** the managing director's full name in `_data/company.yml` (`managing_director`).
- **L4:** confirm `contact@aralel.com` should replace `hello@aralel.com` in the Impressum.
- **S1:** name the operator of relay.codehospital.com in privacy policy §3.2 (TODO comment), or remove the pixel.
- **5.1:** to deploy via Actions, switch Pages source to "GitHub Actions" and set `PAGES_DEPLOY_VIA_ACTIONS=true`.
- **F1:** optionally set `contact_form_endpoint` (then update privacy §2.2).
- **L6**, Phases 5–6 (F2–F11, 5.3, P4/P5, B8/B9/B11, S4/S5, D4 schema file, D5/D6, E9) not started.

---

## 1. Executive summary

The site is a small, data-driven, bilingual Jekyll portfolio. The basic design is sound: `_data/products.json` plus `_data/locales/*.json` drive every catalog page, the sitemap, `llms.txt` and the structured data. The weak spots are around that core:

1. **Both contact forms do nothing.** The homepage and services forms have no `action`, no field `name`s and no JS handler. A visitor's message is silently thrown away. This is the site's main lead-generation path.
2. **Canonical host mismatch.** `CNAME` is `www.aralel.com`, but `site.url` is `https://aralel.com`. Every canonical URL, hreflang link, `og:url`, sitemap `<loc>` and JSON-LD `@id` points at the apex host, which (on GitHub Pages with a `www` CNAME) redirects to `www`. **(verify)**
3. **Legal and privacy exposure.** A third-party tracking pixel (`relay.codehospital.com`) loads on every page without consent and isn't mentioned in the privacy policy. The Impressum cites the repealed TMG and links to the EU ODR platform, which was shut down in July 2025. `assetlinks.json` trusts a **debug-signed** Android build for login-credential sharing.
4. **Navigation bugs in `animations.js`.** Pages go blank after Back/Forward (bfcache restore), and Cmd/Ctrl-click no longer opens a new tab.
5. **SEO correctness.** hreflang has no self-reference. The German homepage's canonical (`/`) differs from its hreflang target (`/index.html`). Sitemap `lastmod` and `JobPosting.datePosted` reset on every build. `frontpage.html` duplicates the homepage. Unrelated tools (`market.html`, `map.html`) are published on the company domain.
6. **Process debt.** There's no CI, no automated checks and no deploy workflow in the repo. Each new product means hand-creating two stub pages, and catalog completeness is audited by hand against five storefronts (see `PLAN.md` history).

---

## 2. Architecture overview

```
_data/products.json ─┐               ┌─ _layouts/home.html          (front_page products)
_data/locales/de.json├─► Liquid ─────┼─ _layouts/catalog_list.html  (apps / games)
_data/locales/en.json┘   includes    ├─ _layouts/platform_list.html (iphone, android, …)
                        (head, card, ├─ _layouts/product.html       (one stub file per product × 2 locales)
                         store_link) ├─ sitemap.xml, llms.txt       (generated)
                                     └─ careers / services / about  (copy in locales)
Client: script.js (nav, PWA, pixel, parallax, cache reset) · animations.js (reveal, transitions)
        cookie-consent.js (consent + AdSense) · service-worker.js (precache + runtime cache)
Legacy: scripts/catalog-data.mjs + generate-catalog-pages.mjs (stale, unused)
Standalone: market.html, map.html, sample.json, available/join/ (Play internal-test redirect)
```

**Strengths**
- One source of truth for the catalog. Adding a product updates listings, platform pages, sitemap, `llms.txt` and JSON-LD.
- `cookie-consent.js` builds its DOM with safe APIs (no `innerHTML` from data) and loads AdSense only after consent.
- Product icons are cached locally and can be reproduced with `scripts/refresh-product-icons.mjs`.
- Motion respects `prefers-reduced-motion`.
- JSON-LD is linked by `@id` (`#organization`, `#website`) and is valid.

**Structural weaknesses**
- **Locale handling is copy-pasted.** Every layout and include repeats the `if locale == "de"` URL logic (`header.html`, `footer.html`, `home.html`, `about.html`, `product.html`, `catalog_card.html`, `platform_pills.html`). The `_en` suffix convention is rebuilt in at least six places.
- **Page stubs are boilerplate.** 17 products × 2 locales = 34 near-identical files, plus 12 platform stubs. Forgetting one gives a 404 that no tool catches.
- **Copy and data live in different places.** Product `platforms`/`stores` sit in `products.json`, but `availabilityText`/`primaryCta` in the locales say the same thing in prose. Every store addition (Solar Compass, Anava, Buzzbelt) meant editing three files by hand to keep them aligned.
- **Business data is hardcoded in templates.** Address, VAT ID and social links are in `head.html` and `career_detail.html`, separately from the Impressum and the homepage. Contact email differs: `contact@` (head/home), `hello@` (Impressum), `privacy@` (privacy policy).
- **Hosting is unclear.** `Gemfile` pins Jekyll 4.3, but there's no `.github/workflows`. If GitHub Pages runs its classic build, production uses Jekyll 3.10 (the `github-pages` gem) and ignores the `Gemfile`. Behavior noted in CHANGELOG 0.12.12 ("In Jekyll 4 both filters pass absolute URLs through untouched") is then untested in production. **(verify)**

---

## 3. Problems & bugs

Severity: 🔴 Critical · 🟠 High · 🟡 Medium · ⚪ Low

### 3.1 Functional bugs

| # | Sev | Issue | Location | Evidence / impact |
|---|---|---|---|---|
| B1 | 🔴 | **Contact forms are non-functional** | [_layouts/home.html:131](_layouts/home.html#L131), [_layouts/services.html:95](_layouts/services.html#L95) | `<form>` has no `action`/`method`, and inputs have no `name`. Submitting reloads the same page with no data, and the user gets no error. The privacy policy (§2.2) describes processing form data that never arrives. |
| B2 | 🟠 | **Blank page after Back/Forward navigation** | [animations.js:231-268](animations.js#L231-L268) | Clicking an internal link sets `body.style.opacity = '0'`, then navigates. When the browser restores the page from bfcache, the opacity stays 0 because nothing listens for `pageshow` with `event.persisted`. |
| B3 | 🟠 | **Modifier-clicks hijacked** | [animations.js:257](animations.js#L257) | `preventDefault()` runs for every internal link, so Cmd/Ctrl/Shift-click and middle-click open in the same tab after a 280 ms delay. Also adds 280 ms to every internal navigation, which hurts INP. |
| B4 | 🟡 | Tracking pixel fires twice | [_includes/footer.html:67](_includes/footer.html#L67), [script.js:150-158](script.js#L150-L158) | The `<img>` loads once from the HTML, then JS appends `?source=` to `src`, which starts a second request. |
| B5 | 🟡 | Offline fallback is always German | [service-worker.js:77](service-worker.js#L77) | English visitors who are offline get `/index.html` (German). |
| B6 | 🟡 | SW install is fragile | [service-worker.js:33](service-worker.js#L33) | `cache.addAll` fails as a whole if any URL 404s, so one renamed SVG breaks offline support. `animations.css`/`animations.js` aren't precached. Runtime cache grows without limit (every visited HTML page and image). There's no `skipWaiting`/`clients.claim`. |
| B7 | 🟡 | Footer links hardcoded to two products | [_includes/footer.html:6-35](_includes/footer.html#L6-L35) | "Arena Sudoku" and "Availabell" are hardcoded. Availabell isn't `front_page`. If either is hidden, the footer links to a "not listed" redirect page. |
| B8 | ⚪ | Hidden product pages redirect with JS only | [_layouts/product.html:32](_layouts/product.html#L32) | No `<meta http-equiv="refresh">` fallback. This doesn't matter much, since `noindex` is already set. |
| B9 | ⚪ | Parallax handler runs on every scroll event | [script.js:178](script.js#L178) | Not throttled with rAF, and it writes `transform` on every event. |
| B10 | ⚪ | Copyright year hardcoded | [_includes/footer.html:66](_includes/footer.html#L66) | `© 2026`. Should be `{{ site.time \| date: "%Y" }}`. |
| B11 | ⚪ | Production `console.log` noise | [script.js:101,117,120,142](script.js#L101) | SW and install-prompt logs. |

### 3.2 Security & privacy

| # | Sev | Issue | Location | Detail |
|---|---|---|---|---|
| S1 | 🔴 | **Undisclosed, pre-consent tracking pixel** | [_includes/footer.html:67](_includes/footer.html#L67), [script.js:150](script.js#L150) | Each page view sends the visitor's IP, page path and full `document.referrer` to `relay.codehospital.com` before any consent. Neither `datenschutz.html` nor `privacy-policy.html` mentions it. Under GDPR/TTDSG §25 this needs consent or a documented legitimate-interest basis. The `alt="Cache Invalidation"` label hides what it actually does. |
| S2 | 🟠 | **Debug-signed app trusted for credential sharing** | [.well-known/assetlinks.json:5,21](.well-known/assetlinks.json#L5) | `com.codehospital.availabell.debug` has `handle_all_urls` **and** `get_login_creds` for `https://www.aralel.com`. Debug keystores are usually lightly protected and shared. Anyone with that key can ship an app that Android trusts with saved credentials for the domain. Remove the debug entries from production. |
| S3 | 🟠 | **Font Awesome CDN without SRI, loaded on every page** | [_includes/head.html:187](_includes/head.html#L187) | A third-party stylesheet with no `integrity` attribute is a supply-chain risk. It also sends every visitor's IP to Cloudflare US before consent. German courts have ruled this way on Google Fonts (LG München I, 3 O 17493/20). Self-hosting a subset fixes both. |
| S4 | 🟡 | No Content-Security-Policy / security headers | site-wide | GitHub Pages can't set headers, but a `<meta http-equiv="Content-Security-Policy">` is possible. Inline JSON-LD and the inline redirect script would need hashes. |
| S5 | 🟡 | Public internal-test redirect | `available/join/index.html` | It publishes the Play internal-test URL. It's `noindex`, but anyone can reach it. The empty `available/join/79MLSI/` directory is leftover. |
| S6 | ⚪ | `target="_blank"` without `rel` | [_layouts/home.html](_layouts/home.html) social links | Modern browsers imply `noopener`, but it's inconsistent with the rest of the site. |

### 3.3 Legal / compliance (German market)

| # | Sev | Issue | Location |
|---|---|---|---|
| L1 | 🔴 | **The ODR link must be removed.** The EU ODR platform was discontinued on 20 July 2025 (Reg. (EU) 2024/3228), so the "EU-Streitschlichtung" section now gives wrong information. | [impressum.html:46](impressum.html#L46), `impressum_en.html:52` |
| L2 | 🟠 | **TMG → DDG.** The Telemediengesetz was replaced by the Digitale-Dienste-Gesetz on 14 May 2024. "§ 5 TMG" should read "§ 5 DDG", and §§ 7–10 TMG → §§ 7–10 DDG / DSA. | `impressum*.html`, `privacy-policy.html` summary |
| L3 | 🟠 | **"Vertreten durch: Taraghidelgarm"** gives only a surname. An Impressum needs the managing director's full name. | [impressum.html:27](impressum.html#L27) |
| L4 | 🟡 | Contact emails differ across Impressum, homepage, structured data and privacy policy (`hello@` / `contact@` / `privacy@`). Choose one canonical address per purpose and keep it in one place. | multiple |
| L5 | 🟡 | The privacy policy doesn't list the service worker cache, the install-banner `localStorage` key (`installBannerDismissed`), or the relay pixel (S1). | `datenschutz.html`, `privacy-policy.html` |
| L6 | 🟡 | 11 of 17 products have no `privacyUrl`. App Store and Play require public privacy policies, and linking them from the official company site strengthens trust and store review. | `_data/products.json` |

### 3.4 SEO & structured data

| # | Sev | Issue | Location | Detail |
|---|---|---|---|---|
| E1 | 🔴 | **Canonical host ≠ served host** **(verify)** | [_config.yml:3](_config.yml#L3) vs `CNAME` | `url: https://aralel.com`, but the site is served from `www.aralel.com`. Canonicals, hreflang, `og:url`, sitemap `<loc>`, `robots.txt` Sitemap and JSON-LD `@id`s all point at a host that redirects. Google treats canonical-to-redirect as a weak signal. `assetlinks.json` already uses `www`. |
| E2 | 🟠 | **hreflang missing self-reference** | [_includes/head.html:151-158](_includes/head.html#L151-L158) | The built `apps/albumara_en.html` emits only `hreflang="de"` and `x-default`, with no `hreflang="en"` pointing to itself. Google requires each page in a set to list itself. (The sitemap already does this correctly.) |
| E3 | 🟠 | **German home canonical vs hreflang target differ** | `index.html` (permalink `/`), `en.html` `switch_url: /index.html` | DE canonical is `https://aralel.com/`, but EN declares `hreflang="de"` → `/index.html`. They should be the same URL. |
| E4 | 🟠 | **`JobPosting` dates regenerate on every build** | [_layouts/career_detail.html:27-28](_layouts/career_detail.html#L27-L28) | With no `page.date`, `datePosted` = build date and `validThrough` = build + 90 days. Every deploy "re-posts" every job, which breaks Google's job-posting guidelines (risk of a manual action). `directApply: true` is also wrong when applying means a `mailto:`. |
| E5 | 🟡 | Sitemap `lastmod` = build time for every URL | [sitemap.xml:22](sitemap.xml#L22) | Google ignores `lastmod` that's always "now". Use per-page `last_modified_at` or the git commit date. |
| E6 | 🟡 | Duplicate homepages | `frontpage.html`, `frontpage_en.html` | Same `page_key: home` → same title and description, listed in the sitemap, with no `switch_url`. Remove them or set `noindex` + canonical to the home page. |
| E7 | 🟡 | Unrelated tools published on the company domain | `market.html` (a stock "Market Analysis" tool), `map.html` ("Global Route Mapper"). `sample.json` (stock data) is excluded from the build. | Published as static files: not in the sitemap, but reachable and crawlable. They dilute topical focus and look unprofessional. Move them to another repo or subdomain, or `exclude` them. |
| E8 | 🟡 | Product JSON-LD is inaccurate | [_layouts/product.html:54-83](_layouts/product.html#L54-L83) | Every app is `UtilitiesApplication` regardless of category. `price: "0"` is hardcoded (wrong for paid or IAP apps). `samsung`/`shopify` platforms are missing from `operatingSystem`. With no `aggregateRating`/`review`, Google won't show `SoftwareApplication` rich results. |
| E9 | ⚪ | Deprecated meta | [_includes/head.html](_includes/head.html) | `http-equiv="content-language"`, `apple-mobile-web-app-capable` (use `mobile-web-app-capable`). |

### 3.5 Performance

| # | Sev | Issue | Detail |
|---|---|---|---|
| P1 | 🟠 | Render-blocking third-party CSS | The full Font Awesome `all.min.css` (~100 KB CSS + webfonts) blocks render for about 20 icons. Replace with inline SVG sprites or a self-hosted subset. |
| P2 | 🟡 | Above-the-fold content starts at `opacity:0` | `animations.js` adds `.reveal` to hero headings (`.page-hero-content h1`, `.detail-copy h1`, `.detail-visual`), and `body` fades in from 0. Both delay **LCP** until JS runs. Exclude hero/above-fold elements from reveal and drop the body fade. |
| P3 | 🟡 | `loading="lazy"` on the product detail hero icon | [_layouts/product.html](_layouts/product.html) `detail-icon` is the LCP image. It should use `fetchpriority="high"` and eager loading, with `width`/`height` to avoid CLS (card icons lack dimensions too). |
| P4 | 🟡 | Icons are PNG/JPEG only | 48–146 KB each. Serving AVIF/WebP at 2× display size (~180 px → 360 px) would cut the catalog page weight by about 60–70%. |
| P5 | ⚪ | Cache-busting uses build time | `release_version = site.time` changes every build, so even unchanged CSS/JS is re-downloaded and the SW cache is wiped on each deploy. Hashing file contents avoids that. |

### 3.6 Accessibility

| # | Sev | Issue |
|---|---|---|
| A1 | 🟡 | Social icon links have only `title` and no accessible name (`aria-label`). The Bluesky icon is an emoji inside a non-existent `fab fa-bsky` class. Font Awesome 6.5+ ships `fa-bluesky`. |
| A2 | 🟡 | Form fields use `placeholder` with no `<label>`, which fails WCAG 1.3.1/3.3.2. |
| A3 | 🟡 | The mobile menu toggle has `aria-expanded` but no `aria-controls`. There's no Escape-to-close or focus management. |
| A4 | 🟡 | The cookie banner is `role="dialog"` but doesn't trap or move focus, and it has no `aria-modal`. |
| A5 | ⚪ | Nav active state is set with inline styles (`animations.js:setupNavActive`) instead of `aria-current="page"` rendered in Liquid. |
| A6 | ⚪ | Catalog/detail icon `alt="{{name}} icon"` is redundant next to the product name. `alt=""` is better there. |

### 3.7 Data integrity & technical debt

| # | Sev | Issue |
|---|---|---|
| D1 | 🟠 | **Locale drift:** `de.json` and `en.json` aren't structurally equal. DE has `catalog.app/game.sectionTitle/sectionSubtitle` and an extra item in `services.groups[5]`; EN has an extra item in `services.groups[1]`. Services pages therefore show different offerings per language, and nothing detects it. |
| D2 | 🟡 | **Stale legacy generator:** `scripts/catalog-data.mjs` (573 lines) and `generate-catalog-pages.mjs` (610 lines) duplicate product data with hotlinked icons and outdated copy ("Our Android apps…"). `PLAN.md` already flags them as stale. Delete them. |
| D3 | 🟡 | **Repo hygiene:** `.gitignore` ignores `CHANGELOG.md` (so the changelog is never versioned) but not `.jekyll-cache/`. `.kiro/` has empty directories. `.DS_Store` sits in the root. |
| D4 | 🟡 | **No schema for `products.json`:** required keys (`slug`, `type`, `platforms`, `stores`, `iconUrl`, `accent`) and enums (`type`, platform keys, store keys) aren't validated. A typo such as `"iPhone"` silently drops a product from a platform page. |
| D5 | ⚪ | `platforms` and `stores` overlap (an `appStore` key implies `iphone` or `desktop`), so the two have to be kept in sync by hand. |
| D6 | ⚪ | `styles.css` (36 KB) and `animations.css` (14 KB) are monolithic with no tokens file. 7 media queries are spread across the file, and `!important` is used 10 times. |

---

## 4. Code & logic improvements

### 4.1 Centralize locale URL logic (high value, low risk)
Add `_includes/localized_url.html` (or a small `_plugins` filter if the build moves to Actions) that maps `(path, locale)` → URL. Then replace the repeated `if locale == "de"` blocks in header, footer, home, about, product, catalog_card and platform_pills.

```liquid
{% comment %} usage: {% include localized_url.html base="/apps" locale=page.locale %} {% endcomment %}
{%- if include.locale == "en" -%}{{ include.base | append: "_en.html" | relative_url }}
{%- else -%}{{ include.base | append: ".html" | relative_url }}{%- endif -%}
```
*Trade-off:* includes that return strings are a bit awkward in Liquid. A custom filter is cleaner but needs a non-classic Pages build (see 5.1).

### 4.2 Generate product pages instead of stubbing them
Use a tiny generator plugin (`_plugins/product_pages.rb`, a `Jekyll::Generator`) that creates `apps/<slug>.html` and `apps/<slug>_en.html` from `products.json`. Do the same for platform and career pages. That removes 58 stub files and the "forgot a stub" failure mode.
*Trade-off:* it needs the GitHub Actions build (custom plugins don't run on classic Pages). Alternative without plugins: a `scripts/check-stubs.mjs` CI check that fails when a stub is missing.

### 4.3 Single source for company facts
Move address, VAT, register number, managing director, emails and social profiles into `_data/company.yml`. Then render the Impressum, footer, Organization JSON-LD, JobPosting `jobLocation` and the homepage contact block from it. This fixes L3, L4 and A1 drift for good.

### 4.4 Derive availability copy from data
Build `availabilityText`/`primaryCta` in Liquid from `product.stores` plus a localized store-name map, keeping an optional override. Each new store listing then becomes a one-line data change, instead of the three-file edit seen in CHANGELOG 0.12.15–0.12.17.

### 4.5 Fix `animations.js` navigation
- Remove the body fade-out-on-click entirely (it fixes B2 and B3, and helps INP/LCP). If a transition is wanted, use the **cross-document View Transitions API** (`@view-transition { navigation: auto; }`), which is pure CSS, respects bfcache and is ignored by unsupported browsers.
- At minimum: skip when `e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0`, and reset opacity on `pageshow`.

### 4.6 Service worker rewrite (or removal)
Decide first whether the PWA install banner is worth having on a company website. It probably isn't, and dropping it removes B5, B6, L5 and one `localStorage` key. If you keep it:
- Precache with `Promise.allSettled` per URL, or a manifest generated at build time.
- Use network-first for HTML with a locale-aware offline page (`/offline.html`, `/offline_en.html`).
- Use stale-while-revalidate for images, capped with an LRU of about 60 entries.
- Call `self.skipWaiting()` and `clients.claim()`, and drop the user-facing "invalidate cache" link.

### 4.7 Template hygiene
- `aria-current="page"` set in `header.html` from `page.url` (replaces the JS inline styles).
- `product.html`: map `copy.category` → schema `applicationCategory` through a lookup table in the data, and add `price` to `products.json`.
- `career_detail.html`: require a `date_posted` field per role in the locale data, and compute `validThrough` from that field rather than from `site.time`.

---

## 5. Architecture & process

### 5.1 Build and deploy pipeline
Add `.github/workflows/pages.yml`: Ruby setup → `bundle exec jekyll build` → checks → `actions/deploy-pages`. Benefits:
- Production runs the pinned Jekyll 4.3, the same version used locally.
- Custom plugins work (4.2), and checks can block a bad deploy.
- Build output becomes reproducible (Ruby/Bundler versions pinned via `.ruby-version`).

### 5.2 Automated checks (run in CI)

| Check | Tool | Catches |
|---|---|---|
| Data schema | JSON Schema + `ajv` for `products.json` | D4, typos in platform/store keys |
| Locale parity | ~30-line Node script comparing key trees of `de.json`/`en.json` | D1 |
| Stub existence | script: every product → 2 pages | missing-page 404s |
| Links & HTML | `html-proofer` on `_site/` (internal + external, with an external allowlist) | broken store links, renamed listings |
| Structured data | parse every `ld+json` block (as done for this review) + spot-check with Schema.org validator | E4/E8 regressions |
| Lighthouse CI | `@lhci/cli` on home, apps, one product page | LCP/CLS/INP budgets, a11y score |
| a11y | `pa11y-ci` | A1–A4 |

### 5.3 Store-sync script (turns the manual audits in `PLAN.md` into automation)
`scripts/audit-store-listings.mjs`:
- Query the iTunes Lookup API by developer id (`1876153136`) and fetch the Play developer page.
- Diff the results against `products.json`, then report new apps, renamed apps (e.g. the "Hormuz Strait: Escape the Blockade" rename flagged on 2026-09-06), dead links, and icon changes (hash compare).
- Run it weekly in Actions so it opens an issue, or locally on demand.

---

## 6. New features (prioritized)

| # | Feature | Value | Approach | Dependencies | Effort |
|---|---|---|---|---|---|
| F1 | **Working contact & services inquiry form** | Restores the lead-generation path (B1) | POST to a form backend (Formspree/Basin, or a small serverless function you already run). Add field `name`s, a honeypot plus time-trap for spam, success/error states in both locales, and a consent line linking the privacy policy. Progressive enhancement: `mailto:` fallback. | Form endpoint; privacy-policy update | Low |
| F2 | **Smart App Banners & store deep links** | Higher install conversion from product pages | `<meta name="apple-itunes-app" content="app-id=…">` on product pages with an App Store id; an OS-aware primary CTA (detect iOS/Android and put the right badge first). | App Store id field in `products.json` | Low |
| F3 | **Product screenshots / gallery** | Product pages are currently icon + text only, which converts poorly | Add a `screenshots[]` array per product, cache images locally (extend `refresh-product-icons.mjs`), and use a CSS scroll-snap gallery. Also feeds `screenshot` in JSON-LD. | Store asset fetching | Medium |
| F4 | **Ratings & reviews in JSON-LD** | Unlocks `SoftwareApplication` rich results (stars in SERP) | At build time, read iTunes Lookup `averageUserRating`/`userRatingCount` and emit `aggregateRating`. Only include products with ≥ N ratings, and refresh via the store-sync job. | 5.3 store-sync | Medium |
| F5 | **Privacy-friendly analytics** | `loadAnalytics()` is an empty stub, so you have no data on which products get traffic | Plausible/Umami (cookieless, EU-hosted) behind the existing consent category, plus outbound-click events on store badges. | Vendor choice, privacy-policy update | Low |
| F6 | **Catalog filter & search** | 17 products and growing; the platform pages exist but are hard to find | Client-side chips (platform/category) on `apps.html`/`games.html` using data attributes, with no framework. Keep the platform pages for SEO. | — | Low |
| F7 | **"What's new" / news feed** | Freshness signal and something to share socially (new store launches every few weeks) | Jekyll `_posts` collection in both locales + RSS (`jekyll-feed`). Auto-draft a post when the store-sync script finds a new listing. | 5.1 Actions build | Medium |
| F8 | **Press kit page** | Useful for journalists and partners | Logo pack, product icons, boilerplate text and contact, all generated from `company.yml` + `products.json`. | 4.3 | Low |
| F9 | **Per-product privacy pages for the 11 products without one** | Store compliance and trust (L6) | Generate from a template (like `apps/availabell-privacy.html`) with per-product data-collection fields. | Legal input per app | Medium |
| F10 | **Dark mode** | Polish | Already uses CSS custom properties (`--text`, `--surface-soft`), so add a `prefers-color-scheme` token set. | D6 tokens | Medium |
| F11 | **Additional locale** (e.g. Persian or Spanish) | Reach | Only practical after 4.1/4.2 remove the hardcoded de/en branching. | 4.1, 4.2 | High |

---

## 7. Prioritized backlog

### 🔴 Critical (stability / legal / security)
1. **B1** Make the contact forms work (F1).
2. **S1** Remove the relay pixel, or gate it behind consent and disclose it in both privacy policies.
3. **L1/L2** Impressum: remove the ODR link and change TMG → DDG (both locales). **L3**: full name of the managing director.
4. **E1** Align `site.url` with the served host (likely `https://www.aralel.com`), after checking the Pages custom-domain and redirect behavior.
5. **S2** Remove the debug app entries from `assetlinks.json`.

### 🟠 High
6. **B2/B3** Fix the page-transition bugs (4.5).
7. **E2/E3** hreflang self-reference; make the DE home canonical and hreflang target the same URL.
8. **E4** Real, stable `datePosted` per job; `directApply: false`.
9. **S3/P1** Self-host the icon subset (or inline SVG) and remove the Font Awesome CDN.
10. **D1** Reconcile the services copy between DE and EN, then add the locale-parity check.
11. **5.1** GitHub Actions build + deploy with pinned Jekyll 4.3.

### 🟡 Medium
12. **P2/P3** Keep hero and LCP elements out of reveal; eager-load the LCP icon with dimensions.
13. **E5/E6/E7** Meaningful `lastmod`; remove `frontpage*.html`; move `market.html`/`map.html`/`sample.json` out.
14. **B5/B6** Service worker rework, or decide to drop the PWA (4.6).
15. **A1–A4** Accessibility fixes.
16. **4.1/4.3/4.4** Centralize locale URLs, company facts and availability copy.
17. **5.2** Data schema, stub check, html-proofer, Lighthouse CI.
18. **D2/D3** Delete legacy scripts; fix `.gitignore`.
19. **E8** Accurate `applicationCategory`/`price`/`operatingSystem`.
20. **F2, F5, F6** Smart banners, analytics, catalog filters.

### ⚪ Nice-to-have / future
21. **4.2** Generated product, platform and career pages.
22. **5.3** Automated store-sync audit; **F4** ratings; **F3** screenshots.
23. **F7** News feed; **F8** press kit; **F9** per-app privacy pages; **F10** dark mode; **F11** third locale.
24. **P4/P5** AVIF/WebP icons; content-hash cache busting.
25. Small items: B4, B7–B11, S4–S6, A5–A6, E9, D5–D6.

---

## 8. Metrics & validation

| Area | Metric | Baseline (how to measure) | Target |
|---|---|---|---|
| Lead capture | Form submissions per week | Currently **0 by construction** | > 0; failure rate < 1% (backend logs) |
| Core Web Vitals | LCP / CLS / INP (mobile, Lighthouse CI + CrUX once traffic allows) | Measure home, `apps_en.html`, one product page before Phase 2 | LCP < 2.0 s, CLS < 0.05, INP < 200 ms |
| Page weight | Transfer size of `apps_en.html` | DevTools / LHCI | −40% after P1 + P4 |
| SEO | Search Console: "Alternate page with proper canonical", hreflang errors, indexed pages | Export before E1–E3 | 0 hreflang errors; canonical = indexed URL |
| Rich results | Valid `JobPosting` / `SoftwareApplication` items in Search Console Enhancements | Current report | No "invalid" items; ratings shown for eligible apps after F4 |
| Accessibility | Lighthouse a11y score, pa11y errors | Run now | ≥ 95, 0 errors |
| Data integrity | CI checks (schema, parity, stubs, links) | Not present | All green and required for deploy |
| Catalog freshness | Days between store publish and site listing | From the `PLAN.md` history | < 7 days, flagged automatically by store-sync |
| Privacy | Third-party requests before consent (DevTools network, fresh profile) | Currently: relay pixel + Cloudflare CDN | 0 |

**Regression tests for specific fixes**
- B2: Playwright: click an internal link → `page.goBack()` → assert `body` opacity is 1.
- B3: Playwright: Cmd-click a card link → assert a new page/tab opened.
- E2/E3: a script over `_site/` asserts every page with `switch_url` has reciprocal, self-referencing hreflang pairs whose URLs equal the targets' canonicals.
- E4: build twice on different dates → `datePosted` is unchanged.

---

## 9. Roadmap

| Phase | Theme | Items | Rough effort |
|---|---|---|---|
| **Phase 1: Stop the bleeding** (week 1) | Legal, privacy, lost leads | B1/F1, S1, L1–L3, S2, E1 **(after verifying hosting)**, B2/B3 quick guard | 1–2 days |
| **Phase 2: Correctness & safety net** (weeks 2–3) | CI and SEO correctness | 5.1 Actions deploy, 5.2 checks (schema, parity, stubs, html-proofer), E2–E6, D1, D2/D3, E7 | 3–4 days |
| **Phase 3: Performance & accessibility** (weeks 3–4) | CWV and WCAG | S3/P1 icons, P2/P3, A1–A4, 4.6 SW decision, Lighthouse CI budgets | 2–3 days |
| **Phase 4: Maintainability** (month 2) | Fewer files per product change | 4.1, 4.3, 4.4, 4.2 generators, E8, 4.7 | 3–5 days |
| **Phase 5: Growth features** (month 2–3) | Conversion and visibility | F2, F5, F6 → 5.3 store-sync → F4, F3 → F7, F8, F9 | 1–2 weeks total, incremental |
| **Phase 6: Polish** (later) | | F10, F11, P4/P5, remaining ⚪ items | as capacity allows |

**Ordering rationale:** Phase 1 items carry legal or financial risk and are small. CI comes before the refactors, so 4.1–4.4 land behind the parity, stub and link checks. Store-sync (5.3) comes before ratings and screenshots, because both reuse its store-API plumbing.

---

## 10. Open questions for the owner
1. What is the authoritative host, `www.aralel.com` or `aralel.com`, and is GitHub Pages building via Actions or the classic builder?
2. What does `relay.codehospital.com` do? Is it analytics, cache-busting or uptime monitoring? That decides whether it needs consent or should be removed.
3. Should `market.html` and `map.html` stay public on the company domain?
4. Is the PWA install prompt a deliberate product decision?
5. Which services list is correct, the German one or the English one (D1)?
