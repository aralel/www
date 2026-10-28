// Builds a 1200x630 social share image (JPEG) for every visible product and every page
// in the locale files' `pages` section, in both languages, into images/og/. It also writes
// _data/og_images.json, which _includes/head.html uses for og:image / twitter:image.
//
// Usage: node scripts/build-og-images.mjs
//
// Needs `playwright-core` with a Chromium build (npm i playwright-core, then
// npx playwright install chromium) so the cards render with the site's own fonts.
// Files are only rewritten when their bytes change; images of products or pages that no
// longer exist are removed. Re-run after changing a product's name, summary, colors or icon,
// or a page title or description. check-site.mjs fails when an image is missing.

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(rootDir, "images", "og");
const WIDTH = 1200;
const HEIGHT = 630;
const JPEG_QUALITY = 84;

let chromium;
try {
    ({ chromium } = createRequire(import.meta.url)("playwright-core"));
} catch {
    console.error("playwright-core not found. Run `npm i playwright-core && npx playwright install chromium` (outside the repo is fine, Node finds it in a parent folder).");
    process.exit(1);
}

const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), "utf8"));
const { products } = readJson("_data/products.json");
const locales = { de: readJson("_data/locales/de.json"), en: readJson("_data/locales/en.json") };

const escapeHtml = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Keeps white text readable: accents that are too light for a background get darkened.
function darkenForBackground(hexColor, maximumLuminance) {
    const channels = [1, 3, 5].map((index) => parseInt(hexColor.slice(index, index + 2), 16));
    const luminanceOf = (rgb) => rgb.map((value) => { const unit = value / 255; return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4; })
        .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    let rgb = channels;
    while (luminanceOf(rgb) > maximumLuminance) rgb = rgb.map((value) => Math.round(value * 0.9));
    return `rgb(${rgb.join(",")})`;
}

// "Travel apps – Aralel GmbH" -> "Travel apps". Titles that already lead with the brand stay whole.
const stripBrandSuffix = (title) => title.replace(/\s*[–—|-]\s*Aralel GmbH\s*$/, "");

const FONT_FACES = `
@font-face { font-family: "Manrope"; font-weight: 400 800; src: url("/fonts/manrope-latin.woff2") format("woff2"); unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122; }
@font-face { font-family: "Manrope"; font-weight: 400 800; src: url("/fonts/manrope-latin-ext.woff2") format("woff2"); unicode-range: U+0100-02AF, U+1E00-1EFF, U+2C60-2C7F, U+A720-A7FF; }
@font-face { font-family: "Space Grotesk"; font-weight: 500 700; src: url("/fonts/space-grotesk-latin.woff2") format("woff2"); unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122; }
@font-face { font-family: "Space Grotesk"; font-weight: 500 700; src: url("/fonts/space-grotesk-latin-ext.woff2") format("woff2"); unicode-range: U+0100-02AF, U+1E00-1EFF, U+2C60-2C7F, U+A720-A7FF; }`;

function cardHtml({ background, glow, kicker, heading, body, footnote, imageUrl, imageStyle }) {
    return `<!doctype html><html><head><meta charset="utf-8"><style>
${FONT_FACES}
* { box-sizing: border-box; }
body { margin: 0; width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; position: relative; background: ${background}; color: #fff; font-family: "Manrope", sans-serif; }
.glow { position: absolute; inset: 0; background: radial-gradient(circle at 80% 48%, ${glow} 0%, transparent 52%); opacity: 0.6; }
.text { position: absolute; left: 72px; top: 64px; bottom: 60px; width: 660px; display: flex; flex-direction: column; }
.kicker { font-size: 28px; font-weight: 700; color: rgba(255,255,255,0.74); min-height: 34px; }
h1 { margin: 14px 0 0; font-family: "Space Grotesk", sans-serif; font-weight: 700; font-size: 92px; line-height: 1.02; letter-spacing: -0.035em; max-height: 280px; overflow: hidden; }
p { margin: 22px 0 0; font-size: 31px; line-height: 1.38; font-weight: 600; color: rgba(255,255,255,0.88); display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; }
.footer { margin-top: auto; display: flex; align-items: center; gap: 16px; font-size: 26px; font-weight: 700; }
.footer img { width: 46px; height: 46px; border-radius: 12px; background: #fff; }
.footer span { color: rgba(255,255,255,0.74); font-weight: 600; }
.visual { position: absolute; right: 96px; top: 165px; width: 300px; height: 300px; }
.visual img { width: 100%; height: 100%; display: block; ${imageStyle} }
</style></head><body>
<div class="glow"></div>
<div class="text">
  <div class="kicker">${escapeHtml(kicker ?? "")}</div>
  <h1 id="heading">${escapeHtml(heading)}</h1>
  <p>${escapeHtml(body)}</p>
  <div class="footer"><img src="/images/aralel-logo.png" alt=""><strong>Aralel GmbH</strong><span>${escapeHtml(footnote)}</span></div>
</div>
<div class="visual"><img src="${imageUrl}" alt=""></div>
<script>
  document.fonts.ready.then(() => {
    const heading = document.getElementById("heading");
    let size = 92;
    while ((heading.scrollHeight > heading.clientHeight || heading.scrollWidth > heading.clientWidth) && size > 44) { size -= 2; heading.style.fontSize = size + "px"; }
    document.body.dataset.ready = "1";
  });
</script></body></html>`;
}

function productCard(product, localeCode) {
    const localeData = locales[localeCode];
    const copy = localeData.products[product.slug];
    const platformLabels = product.platforms.map((platform) => localeData.platforms.labels[platform]);
    if (product.comingSoon) platformLabels.unshift(localeData.common.comingSoon);
    return cardHtml({
        background: darkenForBackground(product.accentStrong, 0.06),
        glow: product.accent,
        kicker: copy.category,
        heading: copy.name,
        body: copy.shortSummary,
        footnote: platformLabels.join(" · "),
        imageUrl: product.iconUrl,
        imageStyle: "border-radius: 68px; box-shadow: 0 28px 70px rgba(0,0,0,0.45);",
    });
}

function pageCard(pageKey, localeCode) {
    const pageCopy = locales[localeCode].pages[pageKey];
    return cardHtml({
        background: "#2a190b",
        glow: "#c97a2b",
        kicker: "",
        heading: stripBrandSuffix(pageCopy.title),
        body: pageCopy.description,
        footnote: "aralel.com",
        imageUrl: "/images/aralel-logo.png",
        imageStyle: "border-radius: 68px; background: #fff; box-shadow: 0 28px 70px rgba(0,0,0,0.45);",
    });
}

// ── Cards to render ──
const jobs = [];
for (const product of products) {
    if (product.hidden === true) continue;
    for (const localeCode of Object.keys(locales)) {
        jobs.push({ group: "products", key: product.slug, localeCode, file: `${product.slug}_${localeCode}.jpg`, html: productCard(product, localeCode) });
    }
}
for (const pageKey of Object.keys(locales.en.pages)) {
    for (const localeCode of Object.keys(locales)) {
        jobs.push({ group: "pages", key: pageKey, localeCode, file: `page-${pageKey}_${localeCode}.jpg`, html: pageCard(pageKey, localeCode) });
    }
}

// ── Static server for the repo (fonts, icons) plus the card currently being rendered ──
let currentHtml = "";
const server = http.createServer((request, response) => {
    const requestPath = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    if (requestPath === "/__card") {
        response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        response.end(currentHtml);
        return;
    }
    const filePath = path.join(rootDir, requestPath);
    if (!filePath.startsWith(rootDir) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        response.writeHead(404);
        response.end();
        return;
    }
    const contentTypes = { ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".webp": "image/webp" };
    response.writeHead(200, { "Content-Type": contentTypes[path.extname(filePath)] ?? "application/octet-stream" });
    response.end(fs.readFileSync(filePath));
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const cardUrl = `http://127.0.0.1:${server.address().port}/__card`;

fs.mkdirSync(outputDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
const manifest = { products: {}, pages: {} };
const wantedFiles = new Set();
let written = 0;

for (const job of jobs) {
    currentHtml = job.html;
    await page.goto(cardUrl, { waitUntil: "load" });
    await page.waitForSelector("body[data-ready]");
    const imageBytes = await page.screenshot({ type: "jpeg", quality: JPEG_QUALITY });
    const filePath = path.join(outputDir, job.file);
    if (!fs.existsSync(filePath) || !fs.readFileSync(filePath).equals(imageBytes)) {
        fs.writeFileSync(filePath, imageBytes);
        written++;
    }
    wantedFiles.add(job.file);
    manifest[job.group][job.key] ??= {};
    manifest[job.group][job.key][job.localeCode] = `/images/og/${job.file}`;
}
await browser.close();
server.close();

let removed = 0;
for (const existingFile of fs.readdirSync(outputDir)) {
    if (existingFile.endsWith(".jpg") && !wantedFiles.has(existingFile)) {
        fs.unlinkSync(path.join(outputDir, existingFile));
        removed++;
    }
}
fs.writeFileSync(path.join(rootDir, "_data", "og_images.json"), `${JSON.stringify({ width: WIDTH, height: HEIGHT, ...manifest }, null, 2)}\n`);
console.log(`Share images: ${wantedFiles.size} files (${written} written, ${removed} removed) in images/og/, manifest _data/og_images.json`);
