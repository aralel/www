// Generates a QR code (SVG) per phone app/game and locale into images/qr/, shown on product
// pages for desktop visitors ("Open it on your phone"). The code opens the product page on
// aralel.com, where script.js puts the visitor's own store first, so one code works for
// iPhone and Android alike.
//
// Usage: node scripts/build-qr.mjs
//
// Eligible: not hidden, not comingSoon, and iphone, ipad or android in platforms (keep in
// sync with the qr_eligible check in _layouts/product.html and check-site.mjs).
// Files are only rewritten when their content changes, so re-running is cheap.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { encodeQr, qrToSvg } from "./lib/qr.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(rootDir, "images", "qr");
const PHONE_PLATFORMS = ["iphone", "ipad", "android"];
const QR_UTM_PARAMETERS = "?utm_source=qr&utm_medium=product-page";

const siteUrl = fs.readFileSync(path.join(rootDir, "_config.yml"), "utf8").match(/^url:\s*"([^"]+)"/m)?.[1]?.replace(/\/$/, "");
if (!siteUrl) throw new Error("Could not read url from _config.yml");
const { products } = JSON.parse(fs.readFileSync(path.join(rootDir, "_data", "products.json"), "utf8"));
const locales = { de: JSON.parse(fs.readFileSync(path.join(rootDir, "_data", "locales", "de.json"), "utf8")), en: JSON.parse(fs.readFileSync(path.join(rootDir, "_data", "locales", "en.json"), "utf8")) };

fs.mkdirSync(outputDir, { recursive: true });
const wantedFiles = new Set();
let written = 0;

for (const product of products) {
    const isEligible = product.hidden !== true && product.comingSoon !== true
        && product.platforms.some((platform) => PHONE_PLATFORMS.includes(platform));
    if (!isEligible) continue;
    const folder = product.type === "app" ? "apps" : "games";
    for (const [localeCode, localeData] of Object.entries(locales)) {
        const pageUrl = `${siteUrl}/${folder}/${product.slug}${localeCode === "en" ? "_en" : ""}.html${QR_UTM_PARAMETERS}`;
        const fileName = `${product.slug}${localeCode === "en" ? "_en" : ""}.svg`;
        const svg = qrToSvg(encodeQr(pageUrl), { title: pageUrl });
        wantedFiles.add(fileName);
        const filePath = path.join(outputDir, fileName);
        if (!fs.existsSync(filePath) || fs.readFileSync(filePath, "utf8") !== svg) {
            fs.writeFileSync(filePath, svg);
            written++;
        }
    }
}

let removed = 0;
for (const existingFile of fs.readdirSync(outputDir)) {
    if (existingFile.endsWith(".svg") && !wantedFiles.has(existingFile)) {
        fs.unlinkSync(path.join(outputDir, existingFile));
        removed++;
    }
}
console.log(`QR codes: ${wantedFiles.size} files (${written} written, ${removed} removed) in images/qr/`);
