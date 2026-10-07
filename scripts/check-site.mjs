// Consistency checks for the Aralel site. No dependencies, Node 18+.
//
// Usage:
//   node scripts/check-site.mjs            source checks only (data, locales, stubs)
//   node scripts/check-site.mjs _site      source checks + checks on the built site
//
// Source checks
//   - _data/products.json: required fields, allowed values, unique slugs, local icon
//     exists, platforms agree with stores / websiteUrl
//   - _data/locales/de.json and en.json have the same key structure
//   - every product has copy in both locales and both page stubs
//   - every product collection (products[].collections) has copy in both locales
//   - every career role has posting metadata in _data/jobs.yml
//   - every icon named in the locales exists in _data/icons.json (scripts/build-icons.mjs)
//   - every screenshot in _data/store_listings.json exists (scripts/store-sync.mjs --screenshots)
// Built-site checks
//   - every JSON-LD block parses
//   - hreflang: self-reference present, alternates reciprocal and equal to the target's canonical
//   - internal links and assets resolve to a built file
//   - every sitemap URL exists and is not noindex
//
// Exits 1 when any check fails, so CI can block a deploy.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const builtSiteArgument = process.argv[2];

const failures = [];
const fail = (checkName, message) => failures.push(`[${checkName}] ${message}`);
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), "utf8"));
const fileExists = (relativePath) => fs.existsSync(path.join(rootDir, relativePath));

const PRODUCT_TYPES = ["app", "game"];
const PLATFORM_KEYS = ["iphone", "android", "amazon", "samsung", "desktop", "website", "shopify"];
// Which platform each store implies. The App Store can mean iPhone or Mac.
const STORE_PLATFORMS = {
    appStore: ["iphone", "desktop"],
    googlePlay: ["android"],
    amazonAppstore: ["amazon"],
    samsungGalaxyStore: ["samsung"],
    shopifyAppStore: ["shopify"],
};
const REQUIRED_PRODUCT_FIELDS = ["slug", "type", "platforms", "stores", "iconUrl", "accent", "accentStrong"];
const REQUIRED_PRODUCT_COPY = ["name", "category", "shortSummary", "heroTitle", "heroText", "description", "metaDescription", "detailLabel", "availabilityTitle"];
// availabilityText is optional: without it _includes/availability_text.html derives the sentence from the store links.
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

// ── Source checks ─────────────────────────────────────────────

function checkProducts(products, locales) {
    const seenSlugs = new Set();

    for (const product of products) {
        const label = product.slug ?? "(missing slug)";

        for (const field of REQUIRED_PRODUCT_FIELDS) {
            if (product[field] === undefined) fail("products", `${label}: missing "${field}"`);
        }
        if (seenSlugs.has(product.slug)) fail("products", `${label}: duplicate slug`);
        seenSlugs.add(product.slug);

        if (!PRODUCT_TYPES.includes(product.type)) fail("products", `${label}: unknown type "${product.type}"`);
        for (const colorField of ["accent", "accentStrong"]) {
            if (product[colorField] && !HEX_COLOR.test(product[colorField])) fail("products", `${label}: ${colorField} is not a #rrggbb color`);
        }

        const platforms = product.platforms ?? [];
        for (const platform of platforms) {
            if (!PLATFORM_KEYS.includes(platform)) fail("products", `${label}: unknown platform "${platform}"`);
        }
        for (const [storeKey, storeUrl] of Object.entries(product.stores ?? {})) {
            const impliedPlatforms = STORE_PLATFORMS[storeKey];
            if (!impliedPlatforms) {
                fail("products", `${label}: unknown store "${storeKey}"`);
                continue;
            }
            if (!/^https:\/\//.test(storeUrl)) fail("products", `${label}: ${storeKey} URL is not https`);
            if (!impliedPlatforms.some((platform) => platforms.includes(platform))) {
                fail("products", `${label}: has a ${storeKey} link but none of [${impliedPlatforms}] in platforms`);
            }
        }
        for (const collectionKey of product.collections ?? []) {
            for (const [localeCode, localeData] of Object.entries(locales)) {
                if (!localeData.collections?.[collectionKey]) fail("products", `${label}: collection "${collectionKey}" has no collections.${collectionKey} copy in ${localeCode}.json`);
            }
        }
        if (product.websiteUrl && !platforms.includes("website")) fail("products", `${label}: websiteUrl set but "website" not in platforms`);
        if (platforms.includes("website") && !product.websiteUrl) fail("products", `${label}: "website" platform without websiteUrl`);

        if (product.iconUrl && !product.iconUrl.includes("://") && !fileExists(product.iconUrl.replace(/^\//, ""))) {
            fail("products", `${label}: icon file ${product.iconUrl} does not exist`);
        }
        if (product.iconUrl && !product.iconUrl.includes("://") && !fileExists(product.iconUrl.replace(/^\//, "").replace(/\.(png|jpe?g)$/i, ".webp"))) {
            fail("webp", `${label}: no WebP for ${product.iconUrl}; run scripts/build-webp.mjs`);
        }

        if (product.privacyUrl) {
            for (const localeCode of Object.keys(locales)) {
                if (!product.privacyUrl[localeCode]) fail("products", `${label}: privacyUrl has no "${localeCode}" entry`);
            }
        }

        // Copy and page stubs
        const folder = product.type === "app" ? "apps" : "games";
        for (const [localeCode, localeData] of Object.entries(locales)) {
            const productCopy = localeData.products?.[product.slug];
            if (!productCopy) {
                fail("locales", `${label}: no copy in ${localeCode}.json`);
            } else {
                for (const copyField of REQUIRED_PRODUCT_COPY) {
                    if (!productCopy[copyField]) fail("locales", `${label}: ${localeCode}.json is missing products.${product.slug}.${copyField}`);
                }
            }

            const stubPath = `${folder}/${product.slug}${localeCode === "en" ? "_en" : ""}.html`;
            if (!fileExists(stubPath)) {
                fail("stubs", `${label}: missing page ${stubPath} (run scripts/new-product.mjs or copy a sibling)`);
                continue;
            }
            const stubSource = fs.readFileSync(path.join(rootDir, stubPath), "utf8");
            if (!stubSource.includes(`product_slug: ${product.slug}`)) fail("stubs", `${stubPath}: product_slug does not match`);
            if (!stubSource.includes(`locale: ${localeCode}`)) fail("stubs", `${stubPath}: locale is not ${localeCode}`);
        }
    }
}

// Lists are compared by length and per-item structure, objects by key set.
function compareStructure(germanValue, englishValue, keyPath) {
    const typeOf = (value) => (Array.isArray(value) ? "array" : value === null ? "null" : typeof value);
    if (typeOf(germanValue) !== typeOf(englishValue)) {
        fail("locale-parity", `${keyPath}: de is ${typeOf(germanValue)}, en is ${typeOf(englishValue)}`);
        return;
    }
    if (Array.isArray(germanValue)) {
        if (germanValue.length !== englishValue.length) {
            fail("locale-parity", `${keyPath}: de has ${germanValue.length} items, en has ${englishValue.length}`);
        }
        const sharedLength = Math.min(germanValue.length, englishValue.length);
        for (let index = 0; index < sharedLength; index += 1) {
            compareStructure(germanValue[index], englishValue[index], `${keyPath}[${index}]`);
        }
    } else if (typeOf(germanValue) === "object") {
        const allKeys = new Set([...Object.keys(germanValue), ...Object.keys(englishValue)]);
        for (const key of allKeys) {
            if (!(key in germanValue)) fail("locale-parity", `${keyPath}.${key}: only in en.json`);
            else if (!(key in englishValue)) fail("locale-parity", `${keyPath}.${key}: only in de.json`);
            else compareStructure(germanValue[key], englishValue[key], `${keyPath}.${key}`);
        }
    }
}

function checkJobs(locales) {
    const jobsSource = fs.readFileSync(path.join(rootDir, "_data", "jobs.yml"), "utf8");
    const jobEntries = new Map();
    let currentSlug = null;
    for (const line of jobsSource.split("\n")) {
        const slugMatch = line.match(/^([a-z0-9-]+):\s*$/);
        if (slugMatch) {
            currentSlug = slugMatch[1];
            jobEntries.set(currentSlug, {});
            continue;
        }
        const fieldMatch = line.match(/^\s+(date_posted|valid_through):\s*"?([^"#\s]+)"?/);
        if (fieldMatch && currentSlug) jobEntries.get(currentSlug)[fieldMatch[1]] = fieldMatch[2];
    }

    for (const [localeCode, localeData] of Object.entries(locales)) {
        for (const role of localeData.careers?.roles ?? []) {
            const jobMeta = jobEntries.get(role.slug);
            if (!jobMeta) fail("jobs", `${role.slug} (${localeCode}): no entry in _data/jobs.yml`);
            else if (!/^\d{4}-\d{2}-\d{2}$/.test(jobMeta.date_posted ?? "")) fail("jobs", `${role.slug}: date_posted must be YYYY-MM-DD`);
        }
    }
}

function checkIcons(locales) {
    const icons = readJson("_data/icons.json");
    const visit = (value, keyPath) => {
        if (Array.isArray(value)) return value.forEach((item, index) => visit(item, `${keyPath}[${index}]`));
        if (!value || typeof value !== "object") return;
        if (typeof value.icon === "string") {
            const iconStyle = value.iconStyle || "fas";
            const iconName = value.icon.replace(/^fa-/, "");
            if (!icons[iconStyle]?.[iconName]) fail("icons", `${keyPath}: icon "${iconStyle} ${iconName}" missing from _data/icons.json; run scripts/build-icons.mjs`);
        }
        for (const [key, child] of Object.entries(value)) visit(child, `${keyPath}.${key}`);
    };
    for (const [localeCode, localeData] of Object.entries(locales)) visit(localeData, localeCode);
}

function checkStoreListings(products) {
    if (!fileExists("_data/store_listings.json")) return;
    const storeListings = readJson("_data/store_listings.json");
    const productSlugs = new Set(products.map((product) => product.slug));
    for (const [slug, listing] of Object.entries(storeListings)) {
        if (!productSlugs.has(slug)) fail("store-listings", `${slug}: not in products.json`);
        for (const screenshot of listing.screenshots ?? []) {
            if (!fileExists(screenshot.src.replace(/^\//, ""))) fail("store-listings", `${slug}: missing ${screenshot.src}`);
            if (!fileExists(screenshot.src.replace(/^\//, "").replace(/\.(png|jpe?g)$/i, ".webp"))) fail("webp", `${slug}: no WebP for ${screenshot.src}; run scripts/build-webp.mjs`);
            if (!(screenshot.width > 0 && screenshot.height > 0)) fail("store-listings", `${slug}: ${screenshot.src} has no dimensions`);
        }
    }
}

// ── Built-site checks ─────────────────────────────────────────

function listHtmlFiles(directory) {
    const htmlFiles = [];
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) htmlFiles.push(...listHtmlFiles(entryPath));
        else if (entry.name.endsWith(".html")) htmlFiles.push(entryPath);
    }
    return htmlFiles;
}

function checkBuiltSite(builtSiteDir, siteUrl) {
    // Map a site-root path (/apps/x.html, /, /dir/) to a built file, if any.
    const resolveBuiltFile = (sitePath) => {
        const decodedPath = decodeURIComponent(sitePath.split(/[?#]/)[0]);
        const candidates = decodedPath.endsWith("/")
            ? [path.join(builtSiteDir, decodedPath, "index.html")]
            : [path.join(builtSiteDir, decodedPath), path.join(builtSiteDir, `${decodedPath}.html`), path.join(builtSiteDir, decodedPath, "index.html")];
        return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) ?? null;
    };
    const urlToSitePath = (absoluteUrl) => (absoluteUrl.startsWith(siteUrl) ? absoluteUrl.slice(siteUrl.length) || "/" : null);

    const pageInfoByFile = new Map();
    const htmlFiles = listHtmlFiles(builtSiteDir);

    for (const htmlFile of htmlFiles) {
        const relativeFile = path.relative(builtSiteDir, htmlFile);
        const html = fs.readFileSync(htmlFile, "utf8");

        // JSON-LD
        for (const [, jsonLdSource] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
            try {
                JSON.parse(jsonLdSource);
            } catch (error) {
                fail("json-ld", `${relativeFile}: ${error.message}`);
            }
        }

        const canonicalUrl = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? null;
        const hreflangLinks = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)]
            .map(([, languageCode, href]) => ({ languageCode, href }));
        const isNoindex = /<meta name="robots" content="noindex/.test(html);
        pageInfoByFile.set(htmlFile, { relativeFile, canonicalUrl, hreflangLinks, isNoindex });

        // Internal links and assets
        for (const [, attributeValue] of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
            let linkPath = attributeValue;
            if (linkPath.startsWith(siteUrl)) linkPath = urlToSitePath(linkPath);
            if (!linkPath.startsWith("/") || linkPath.startsWith("//")) continue; // external, mailto:, #anchor, data:
            if (linkPath.includes("{{")) continue;
            if (!resolveBuiltFile(linkPath)) fail("links", `${relativeFile}: broken internal link ${attributeValue}`);
        }
    }

    // hreflang
    for (const pageInfo of pageInfoByFile.values()) {
        const languageLinks = pageInfo.hreflangLinks.filter((link) => link.languageCode !== "x-default");
        if (languageLinks.length === 0 || pageInfo.isNoindex) continue;

        if (!languageLinks.some((link) => link.href === pageInfo.canonicalUrl)) {
            fail("hreflang", `${pageInfo.relativeFile}: no hreflang entry pointing at its own canonical ${pageInfo.canonicalUrl}`);
        }
        for (const link of languageLinks) {
            if (link.href === pageInfo.canonicalUrl) continue;
            const targetPath = urlToSitePath(link.href);
            const targetFile = targetPath && resolveBuiltFile(targetPath);
            if (!targetFile) {
                fail("hreflang", `${pageInfo.relativeFile}: hreflang="${link.languageCode}" target ${link.href} does not exist`);
                continue;
            }
            const targetInfo = pageInfoByFile.get(targetFile);
            if (targetInfo.canonicalUrl !== link.href) {
                fail("hreflang", `${pageInfo.relativeFile}: hreflang="${link.languageCode}" points at ${link.href}, but that page's canonical is ${targetInfo.canonicalUrl}`);
            }
            if (!targetInfo.hreflangLinks.some((backLink) => backLink.href === pageInfo.canonicalUrl)) {
                fail("hreflang", `${targetInfo.relativeFile}: does not link back to ${pageInfo.canonicalUrl}`);
            }
        }
    }

    // Sitemap
    const sitemapPath = path.join(builtSiteDir, "sitemap.xml");
    if (!fs.existsSync(sitemapPath)) {
        fail("sitemap", "sitemap.xml was not built");
        return htmlFiles.length;
    }
    for (const [, locUrl] of fs.readFileSync(sitemapPath, "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)) {
        const sitePath = urlToSitePath(locUrl);
        const builtFile = sitePath && resolveBuiltFile(sitePath);
        if (!builtFile) fail("sitemap", `${locUrl} does not exist (or is not on ${siteUrl})`);
        else if (pageInfoByFile.get(builtFile)?.isNoindex) fail("sitemap", `${locUrl} is noindex but listed`);
    }
    return htmlFiles.length;
}

// ── Run ───────────────────────────────────────────────────────

const { products } = readJson("_data/products.json");
const locales = { de: readJson("_data/locales/de.json"), en: readJson("_data/locales/en.json") };

checkProducts(products, locales);
compareStructure(locales.de, locales.en, "locales");
checkJobs(locales);
checkIcons(locales);
checkStoreListings(products);

let builtPageCount = 0;
if (builtSiteArgument) {
    const builtSiteDir = path.resolve(builtSiteArgument);
    const siteUrl = fs.readFileSync(path.join(rootDir, "_config.yml"), "utf8").match(/^url:\s*"([^"]+)"/m)?.[1];
    if (!fs.existsSync(builtSiteDir)) fail("build", `${builtSiteDir} does not exist; run bundle exec jekyll build first`);
    else if (!siteUrl) fail("build", "could not read url from _config.yml");
    else builtPageCount = checkBuiltSite(builtSiteDir, siteUrl.replace(/\/$/, ""));
}

const scopeSummary = `${products.length} products, 2 locales${builtSiteArgument ? `, ${builtPageCount} built pages` : ""}`;
if (failures.length) {
    console.error(failures.join("\n"));
    console.error(`\n✗ ${failures.length} problem(s) found (${scopeSummary}).`);
    process.exit(1);
}
console.log(`✓ All checks passed (${scopeSummary}).`);
