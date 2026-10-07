// Audits the App Store and Google Play against _data/products.json and records
// store data the site renders. Replaces the manual store audits in PLAN.md.
//
// Usage:
//   node scripts/store-sync.mjs                 audit + write _data/store_listings.json
//   node scripts/store-sync.mjs --screenshots   also cache up to 4 screenshots per product
//                                               in images/screenshots/<slug>/ (needs `sips`, macOS)
//   node scripts/store-sync.mjs --check         audit only, no writes; exit 1 when the catalog
//                                               is missing a published app (for CI)
//
// Report:
//   - published apps that have no catalog entry
//   - catalog store links that no longer resolve
//   - store names that differ from the English catalog name (renamed listings)
//   - paid apps (structured data assumes price 0 unless products.json sets `price`)
//   - privacy-policy links found on Play listings, for products without `privacyUrl`
//
// _data/store_listings.json (per slug): rating summary across stores, store names,
// and screenshot paths once cached. Templates use it for aggregateRating and the
// product-page screenshot gallery.
//
// Sources: Apple's public iTunes Lookup API, and the public Google Play listing pages
// (no API exists; parsing is best-effort and reported, never trusted blindly).

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const commandFlags = new Set(process.argv.slice(2));
const checkOnly = commandFlags.has("--check");
const cacheScreenshots = commandFlags.has("--screenshots") && !checkOnly;

const APP_STORE_DEVELOPER_ID = "1876153136";
const GOOGLE_PLAY_DEVELOPER_ID = "5186409271854647347";
const MAX_SCREENSHOTS = 4;
const SCREENSHOT_WIDTH = 460;           // portrait phone shots render ~230px wide: 2x for sharp screens
const LANDSCAPE_SCREENSHOT_WIDTH = 920; // Mac/landscape shots render ~460px wide
const BROWSER_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const listingsPath = path.join(rootDir, "_data", "store_listings.json");

const { products } = JSON.parse(fs.readFileSync(path.join(rootDir, "_data", "products.json"), "utf8"));
const englishCopy = JSON.parse(fs.readFileSync(path.join(rootDir, "_data", "locales", "en.json"), "utf8")).products;
const previousListings = fs.existsSync(listingsPath) ? JSON.parse(fs.readFileSync(listingsPath, "utf8")) : {};

const report = { missingFromCatalog: [], deadLinks: [], renamed: [], paid: [], privacyCandidates: [], warnings: [] };
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function fetchText(url) {
    const response = await fetch(url, { headers: { "User-Agent": BROWSER_USER_AGENT, "Accept-Language": "en-US,en;q=0.9" } });
    return { status: response.status, body: response.ok ? await response.text() : "" };
}

const appStoreIdOf = (storeUrl) => storeUrl?.match(/\/id(\d+)/)?.[1] ?? null;
const playPackageOf = (storeUrl) => storeUrl ? new URL(storeUrl).searchParams.get("id") : null;
const normalizeName = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// ── App Store ─────────────────────────────────────────────────

async function readAppStore() {
    const { body } = await fetchText(`https://itunes.apple.com/lookup?id=${APP_STORE_DEVELOPER_ID}&entity=software&country=us&limit=200`);
    const developerApps = JSON.parse(body).results.filter((result) => result.wrapperType === "software");
    const appsById = new Map(developerApps.map((app) => [String(app.trackId), app]));

    // Catalog apps published under another developer account are looked up one by one.
    for (const product of products) {
        const appStoreId = appStoreIdOf(product.stores?.appStore);
        if (!appStoreId || appsById.has(appStoreId)) continue;
        const lookup = JSON.parse((await fetchText(`https://itunes.apple.com/lookup?id=${appStoreId}&country=us`)).body);
        if (lookup.resultCount) appsById.set(appStoreId, lookup.results[0]);
        else report.deadLinks.push(`${product.slug}: App Store id ${appStoreId} not found`);
    }

    const catalogIds = new Set(products.map((product) => appStoreIdOf(product.stores?.appStore)).filter(Boolean));
    for (const app of developerApps) {
        if (!catalogIds.has(String(app.trackId))) {
            report.missingFromCatalog.push(`App Store: "${app.trackName}" (${app.kind === "mac-software" ? "Mac" : "iOS"}) ${app.trackViewUrl.split("?")[0]}`);
        }
    }
    return appsById;
}

// ── Google Play ───────────────────────────────────────────────

function parsePlayListing(html) {
    const title = html.match(/<meta property="og:title" content="([^"]+?) - Apps on Google Play"/)?.[1] ?? null;
    const rating = Number(html.match(/aria-label="Rated ([\d.]+) stars out of five stars"/)?.[1] ?? 0);
    const reviewCountText = html.match(/>([\d.,]+[KM]?) reviews</)?.[1] ?? "0";
    const reviewMultiplier = reviewCountText.endsWith("M") ? 1e6 : reviewCountText.endsWith("K") ? 1e3 : 1;
    const ratingCount = Math.round(parseFloat(reviewCountText.replace(/,/g, "")) * reviewMultiplier) || 0;
    const screenshotUrls = [...html.matchAll(/<img src="(https:\/\/play-lh\.googleusercontent\.com\/[^"=]+)=[^"]*"[^>]*alt="Screenshot image"/g)]
        .map(([, baseUrl]) => baseUrl);
    const privacyCandidates = [...new Set([...html.matchAll(/href="(https?:\/\/[^"]+)"/g)]
        .map(([, href]) => href.replace(/&amp;/g, "&"))
        .filter((href) => /privacy|datenschutz/i.test(href) && !/(^https?:\/\/([a-z]+\.)*google\.com|youtube\.com)/.test(href)))];
    return { title, rating, ratingCount, screenshotUrls: [...new Set(screenshotUrls)], privacyCandidates };
}

async function readGooglePlay() {
    const { body: developerPage } = await fetchText(`https://play.google.com/store/apps/dev?id=${GOOGLE_PLAY_DEVELOPER_ID}&hl=en&gl=us`);
    const developerPackages = [...new Set([...developerPage.matchAll(/details\?id=([a-zA-Z0-9._]+)/g)].map(([, packageName]) => packageName))];
    const catalogPackages = new Set(products.map((product) => playPackageOf(product.stores?.googlePlay)).filter(Boolean));
    for (const packageName of developerPackages) {
        if (!catalogPackages.has(packageName)) {
            report.missingFromCatalog.push(`Google Play: ${packageName} https://play.google.com/store/apps/details?id=${packageName}`);
        }
    }

    const listingsByPackage = new Map();
    for (const packageName of catalogPackages) {
        await sleep(400); // be polite to play.google.com
        const { status, body } = await fetchText(`https://play.google.com/store/apps/details?id=${packageName}&hl=en&gl=us`);
        if (status !== 200) {
            report.deadLinks.push(`Google Play ${packageName}: HTTP ${status}`);
            continue;
        }
        listingsByPackage.set(packageName, parsePlayListing(body));
    }
    return listingsByPackage;
}

// ── Screenshots ───────────────────────────────────────────────

async function cacheProductScreenshots(slug, sourceUrls) {
    const screenshotDir = path.join(rootDir, "images", "screenshots", slug);
    fs.rmSync(screenshotDir, { recursive: true, force: true });
    fs.mkdirSync(screenshotDir, { recursive: true });
    const cachedScreenshots = [];

    for (const [index, sourceUrl] of sourceUrls.slice(0, MAX_SCREENSHOTS).entries()) {
        const response = await fetch(sourceUrl, { headers: { "User-Agent": BROWSER_USER_AGENT } });
        if (!response.ok) {
            report.warnings.push(`${slug}: screenshot ${index + 1} HTTP ${response.status}`);
            continue;
        }
        const targetPath = path.join(screenshotDir, `${index + 1}.jpg`);
        fs.writeFileSync(targetPath, Buffer.from(await response.arrayBuffer()));
        // Normalise to JPEG at the target width; store CDNs sometimes send PNG.
        const sourceDimensions = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", targetPath]).toString();
        const isLandscape = Number(sourceDimensions.match(/pixelWidth: (\d+)/)[1]) > Number(sourceDimensions.match(/pixelHeight: (\d+)/)[1]);
        const targetWidth = isLandscape ? LANDSCAPE_SCREENSHOT_WIDTH : SCREENSHOT_WIDTH;
        execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "78", "--resampleWidth", String(targetWidth), targetPath, "--out", targetPath], { stdio: "ignore" });
        const dimensions = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", targetPath]).toString();
        cachedScreenshots.push({
            src: `/images/screenshots/${slug}/${index + 1}.jpg`,
            width: Number(dimensions.match(/pixelWidth: (\d+)/)[1]),
            height: Number(dimensions.match(/pixelHeight: (\d+)/)[1]),
        });
    }
    return cachedScreenshots;
}

// ── Run ───────────────────────────────────────────────────────

const appStoreApps = await readAppStore();
const playListings = await readGooglePlay();
const storeListings = {};

for (const product of products) {
    const catalogName = englishCopy[product.slug]?.name ?? product.slug;
    const appStoreApp = appStoreApps.get(appStoreIdOf(product.stores?.appStore) ?? "");
    const playListing = playListings.get(playPackageOf(product.stores?.googlePlay) ?? "");

    const ratingSources = [];
    const storeNames = {};
    if (appStoreApp) {
        storeNames.appStore = appStoreApp.trackName;
        if (appStoreApp.userRatingCount) ratingSources.push({ rating: appStoreApp.averageUserRating, count: appStoreApp.userRatingCount });
        if (appStoreApp.price > 0 && !product.price) report.paid.push(`${product.slug}: App Store price ${appStoreApp.formattedPrice}`);
    }
    if (playListing) {
        if (playListing.title) storeNames.googlePlay = playListing.title;
        if (playListing.ratingCount) ratingSources.push({ rating: playListing.rating, count: playListing.ratingCount });
        if (!product.privacyUrl && playListing.privacyCandidates.length) {
            report.privacyCandidates.push(`${product.slug}: ${playListing.privacyCandidates.join(", ")}`);
        }
    }
    for (const [storeKey, storeName] of Object.entries(storeNames)) {
        const comparableStoreName = normalizeName(storeName.split(/[:–—-]/)[0]);
        if (!normalizeName(catalogName).startsWith(comparableStoreName) && !comparableStoreName.startsWith(normalizeName(catalogName))) {
            report.renamed.push(`${product.slug}: catalog "${catalogName}", ${storeKey} "${storeName}"`);
        }
    }

    const totalRatingCount = ratingSources.reduce((sum, source) => sum + source.count, 0);
    const listing = { storeNames };
    if (totalRatingCount) {
        const weightedRating = ratingSources.reduce((sum, source) => sum + source.rating * source.count, 0) / totalRatingCount;
        listing.rating = { value: Math.round(weightedRating * 10) / 10, count: totalRatingCount };
    }

    // Screenshots: prefer the App Store (iPhone, else Mac), fall back to Google Play.
    const screenshotSources = appStoreApp?.screenshotUrls?.length
        ? appStoreApp.screenshotUrls.map((url) => url.replace(/\/[^/]+\.(jpg|png)$/, `/${LANDSCAPE_SCREENSHOT_WIDTH}x0w.jpg`))
        : (playListing?.screenshotUrls ?? []).map((url) => `${url}=w${LANDSCAPE_SCREENSHOT_WIDTH}`);
    if (cacheScreenshots && !product.hidden && screenshotSources.length) {
        listing.screenshots = await cacheProductScreenshots(product.slug, screenshotSources);
    } else if (previousListings[product.slug]?.screenshots) {
        listing.screenshots = previousListings[product.slug].screenshots; // keep what is already cached
    }
    storeListings[product.slug] = listing;
}

const printSection = (title, lines) => {
    console.log(`\n${title} (${lines.length})`);
    for (const line of lines) console.log(`  - ${line}`);
};
printSection("Published but missing from the catalog", report.missingFromCatalog);
printSection("Dead store links", report.deadLinks);
printSection("Store name differs from catalog name", report.renamed);
printSection("Paid apps without a price in products.json", report.paid);
printSection("Privacy-policy links found on Play (products without privacyUrl)", report.privacyCandidates);
if (report.warnings.length) printSection("Warnings", report.warnings);

if (!checkOnly) {
    fs.writeFileSync(listingsPath, `${JSON.stringify(storeListings, null, 2)}\n`);
    console.log(`\nWrote _data/store_listings.json (${Object.keys(storeListings).length} products).`);
}
if (checkOnly && (report.missingFromCatalog.length || report.deadLinks.length)) process.exit(1);
