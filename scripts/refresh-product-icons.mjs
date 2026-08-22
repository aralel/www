// Re-downloads every product icon from its `iconSourceUrl` into images/products/.
//
// The site serves product icons from the repo instead of hotlinking store CDNs,
// so this script is how the cache gets refreshed when a store listing ships a new
// icon. It rewrites the files in place; `iconUrl` in _data/products.json already
// points at them and does not need to change.
//
// Usage: node scripts/refresh-product-icons.mjs [slug ...]
//   With no arguments every product is refreshed.
//
// Requires `sips` and `pngquant` (macOS + `brew install pngquant`).

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const iconDir = path.join(rootDir, "images", "products");
const tmpDir = fs.mkdtempSync(path.join(process.env.TMPDIR ?? "/tmp", "icons-"));

const MAX_EDGE = 512;          // icons never render larger than this
const PNG_QUALITY = "80-97";   // pngquant floor-ceiling; below the floor we keep it lossless

const { products } = JSON.parse(
    fs.readFileSync(path.join(rootDir, "_data", "products.json"), "utf8")
);

const requested = process.argv.slice(2);
const targets = requested.length
    ? products.filter((product) => requested.includes(product.slug))
    : products;

if (requested.length && targets.length !== requested.length) {
    const known = new Set(products.map((product) => product.slug));
    const unknown = requested.filter((slug) => !known.has(slug));
    console.error(`Unknown slug(s): ${unknown.join(", ")}`);
    process.exit(1);
}

const run = (cmd, args) => execFileSync(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });

let failures = 0;

for (const product of targets) {
    const { slug, iconSourceUrl } = product;

    if (!iconSourceUrl) {
        console.warn(`${slug.padEnd(32)} skipped — no iconSourceUrl recorded`);
        continue;
    }

    const download = path.join(tmpDir, slug);

    try {
        const status = run("curl", [
            "-sSL", "--retry", "3", "--retry-delay", "1",
            "-o", download, "-w", "%{http_code}", iconSourceUrl
        ]).toString().trim();

        if (status !== "200") throw new Error(`HTTP ${status}`);

        // Apple/Amazon serve JPEG, the Play Store and Shopify serve PNG.
        const format = run("sips", ["-g", "format", download]).toString().trim().split(/\s+/).pop();
        const isJpeg = format === "jpeg";
        const target = path.join(iconDir, `${slug}.${isJpeg ? "jpg" : "png"}`);

        run("sips", ["-Z", String(MAX_EDGE), download]);

        if (isJpeg) {
            // Store JPEGs are already tightly encoded; re-encoding only adds size and artifacts.
            fs.copyFileSync(download, target);
        } else {
            try {
                run("pngquant", [
                    `--quality=${PNG_QUALITY}`, "--speed", "1", "--strip",
                    "--force", "--output", target, download
                ]);
            } catch {
                fs.copyFileSync(download, target); // quality floor not reachable — keep lossless
            }
        }

        const kb = (fs.statSync(target).size / 1024).toFixed(0);
        console.log(`${slug.padEnd(32)} ${path.basename(target).padEnd(36)} ${kb.padStart(5)} KB`);
    } catch (error) {
        failures += 1;
        console.error(`${slug.padEnd(32)} FAILED — ${error.message}`);
    }
}

fs.rmSync(tmpDir, { recursive: true, force: true });

if (failures) {
    console.error(`\n${failures} icon(s) failed to refresh.`);
    process.exit(1);
}
