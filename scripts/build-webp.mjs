// Writes a .webp next to every product icon and cached store screenshot, for
// _includes/picture.html (<picture> with the original as fallback). About 70%
// smaller than the PNG/JPEG originals. Re-run after refresh-product-icons.mjs or
// store-sync.mjs --screenshots; only missing or outdated files are rebuilt.
//
// Usage: node scripts/build-webp.mjs        (needs `cwebp`: brew install webp)

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const imageDirectories = ["images/products", "images/screenshots"];
const WEBP_QUALITY = "80";

function listSourceImages(directory) {
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) return listSourceImages(entryPath);
        return /\.(png|jpe?g)$/i.test(entry.name) ? [entryPath] : [];
    });
}

let builtCount = 0;
let upToDateCount = 0;
for (const sourcePath of imageDirectories.flatMap((directory) => listSourceImages(path.join(rootDir, directory)))) {
    const webpPath = sourcePath.replace(/\.(png|jpe?g)$/i, ".webp");
    if (fs.existsSync(webpPath) && fs.statSync(webpPath).mtimeMs >= fs.statSync(sourcePath).mtimeMs) {
        upToDateCount += 1;
        continue;
    }
    execFileSync("cwebp", ["-quiet", "-q", WEBP_QUALITY, "-m", "6", "-metadata", "none", sourcePath, "-o", webpPath]);
    builtCount += 1;
}
console.log(`WebP: ${builtCount} built, ${upToDateCount} already up to date.`);
