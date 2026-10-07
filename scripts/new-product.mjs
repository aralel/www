// Scaffolds a new catalog product so nothing is forgotten:
//   - apps/<slug>.html + apps/<slug>_en.html (or games/…) page stubs
//   - a skeleton entry at the end of _data/products.json (hidden: true until filled in)
//   - skeleton copy under products.<slug> in _data/locales/de.json and en.json
//
// Usage: node scripts/new-product.mjs <slug> <app|game>
//
// Existing files and entries are never overwritten. Afterwards fill in the TODOs,
// cache the icon with `node scripts/refresh-product-icons.mjs <slug>`, set
// "hidden": false, and run `node scripts/check-site.mjs` until it passes.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [slug, productType] = process.argv.slice(2);

if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug ?? "") || !["app", "game"].includes(productType)) {
    console.error("Usage: node scripts/new-product.mjs <slug> <app|game>   (slug: lowercase-with-dashes)");
    process.exit(1);
}

const folder = productType === "app" ? "apps" : "games";
const created = [];
const skipped = [];

// ── Page stubs ────────────────────────────────────────────────
for (const localeCode of ["de", "en"]) {
    const suffix = localeCode === "en" ? "_en" : "";
    const otherSuffix = localeCode === "en" ? "" : "_en";
    const stubPath = path.join(rootDir, folder, `${slug}${suffix}.html`);
    if (fs.existsSync(stubPath)) {
        skipped.push(path.relative(rootDir, stubPath));
        continue;
    }
    fs.writeFileSync(stubPath, [
        "---",
        "layout: product",
        `locale: ${localeCode}`,
        `switch_url: /${folder}/${slug}${otherSuffix}.html`,
        `product_slug: ${slug}`,
        "---",
        "",
    ].join("\n"));
    created.push(path.relative(rootDir, stubPath));
}

// ── products.json (text insert, keeps the file's hand formatting) ──
const productsPath = path.join(rootDir, "_data", "products.json");
const productsSource = fs.readFileSync(productsPath, "utf8");
if (JSON.parse(productsSource).products.some((product) => product.slug === slug)) {
    skipped.push(`_data/products.json entry "${slug}"`);
} else {
    const productEntry = [
        "    {",
        `      "slug": "${slug}",`,
        `      "type": "${productType}",`,
        "      \"hidden\": true,",
        "      \"platforms\": [],",
        "      \"accent\": \"#4f46e5\",",
        "      \"accentStrong\": \"#312e81\",",
        `      "iconUrl": "/images/products/${slug}.png",`,
        "      \"iconSourceUrl\": \"\",",
        "      \"stores\": {}",
        "    }",
    ].join("\n");
    const arrayEnd = productsSource.lastIndexOf("\n  ]");
    if (arrayEnd === -1) throw new Error("Could not find the end of the products array in _data/products.json");
    const updatedSource = `${productsSource.slice(0, arrayEnd).replace(/\s*$/, "")},\n${productEntry}${productsSource.slice(arrayEnd)}`;
    JSON.parse(updatedSource); // never write a broken file
    fs.writeFileSync(productsPath, updatedSource);
    created.push(`_data/products.json entry "${slug}"`);
}

// ── Locale copy ───────────────────────────────────────────────
const skeletonCopy = {
    de: {
        name: "TODO Name", category: "TODO Kategorie", shortSummary: "TODO", heroTitle: "TODO", heroText: "TODO", description: "TODO",
        highlights: [{ title: "TODO", text: "TODO" }, { title: "TODO", text: "TODO" }, { title: "TODO", text: "TODO" }],
        privacyLabel: "Datenschutz", detailLabel: productType === "app" ? "App-Details" : "Spiel-Details",
        backLabel: productType === "app" ? "Zur Apps-Übersicht" : "Zur Spiele-Übersicht",
        availabilityTitle: "Verfügbar auf", metaDescription: "TODO",
    },
    en: {
        name: "TODO Name", category: "TODO Category", shortSummary: "TODO", heroTitle: "TODO", heroText: "TODO", description: "TODO",
        highlights: [{ title: "TODO", text: "TODO" }, { title: "TODO", text: "TODO" }, { title: "TODO", text: "TODO" }],
        privacyLabel: "Privacy Policy", detailLabel: productType === "app" ? "App Details" : "Game Details",
        backLabel: productType === "app" ? "Back to apps" : "Back to games",
        availabilityTitle: "Available on", metaDescription: "TODO",
    },
};
for (const localeCode of ["de", "en"]) {
    const localePath = path.join(rootDir, "_data", "locales", `${localeCode}.json`);
    const localeSource = fs.readFileSync(localePath, "utf8");
    const localeData = JSON.parse(localeSource);
    if (localeData.products[slug]) {
        skipped.push(`_data/locales/${localeCode}.json products.${slug}`);
        continue;
    }
    // Only rewrite the file if a plain round-trip reproduces it exactly, so no unrelated lines change.
    if (`${JSON.stringify(localeData, null, 2)}\n` !== localeSource) {
        console.error(`_data/locales/${localeCode}.json is not in standard 2-space JSON format; add products.${slug} by hand.`);
        process.exitCode = 1;
        continue;
    }
    localeData.products[slug] = skeletonCopy[localeCode];
    fs.writeFileSync(localePath, `${JSON.stringify(localeData, null, 2)}\n`);
    created.push(`_data/locales/${localeCode}.json products.${slug}`);
}

console.log(created.length ? `Created:\n  ${created.join("\n  ")}` : "Nothing created.");
if (skipped.length) console.log(`Already existed (left unchanged):\n  ${skipped.join("\n  ")}`);
console.log(`
Next steps:
  1. Fill in the TODOs in _data/locales/de.json and en.json (products.${slug}).
     availabilityText is optional: without it the sentence is built from the store links.
  2. In _data/products.json add platforms, stores, websiteUrl/privacyUrl, iconSourceUrl,
     accent colors, and schemaCategory for apps (a schema.org application category).
  3. node scripts/refresh-product-icons.mjs ${slug}
  4. Set "hidden": false, then: node scripts/check-site.mjs`);
