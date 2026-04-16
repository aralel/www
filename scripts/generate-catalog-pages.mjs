import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { siteCatalog, getProductsByType } from "./catalog-data.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const locales = ["de", "en"];

const pageMeta = {
    apps: {
        de: {
            title: "Apps - Aralel GmbH",
            heroTitle: "Veröffentlichte Apps",
            heroText: "Unsere Android-Apps verbinden klare Produktideen mit präziser Umsetzung und direktem Nutzen im Alltag.",
            intro: "Hier finden Sie alle aktuell veröffentlichten Apps von Aralel inklusive Detailseiten und Store-Links.",
            pageLabel: "Apps",
            viewDetails: "Mehr erfahren",
            openStore: "Store öffnen",
            allProductsTitle: "Alle Apps"
        },
        en: {
            title: "Apps - Aralel GmbH",
            heroTitle: "Published Apps",
            heroText: "Our Android apps combine focused product ideas with practical utility and careful execution.",
            intro: "Browse every published Aralel app with a dedicated detail page and direct store links.",
            pageLabel: "Apps",
            viewDetails: "Learn More",
            openStore: "Open Store",
            allProductsTitle: "All Apps"
        }
    },
    games: {
        de: {
            title: "Spiele - Aralel GmbH",
            heroTitle: "Veröffentlichte Spiele",
            heroText: "Unsere Spiele reichen von Lernformaten bis zu schnellen Mehrspieler- und Casual-Erlebnissen auf App Store und Google Play.",
            intro: "Jedes Spiel hat eine eigene Seite mit Kurzprofil und direktem Link zum jeweiligen Store.",
            pageLabel: "Spiele",
            viewDetails: "Mehr erfahren",
            openStore: "Store öffnen",
            allProductsTitle: "Alle Spiele"
        },
        en: {
            title: "Games - Aralel GmbH",
            heroTitle: "Published Games",
            heroText: "Our games span learning, puzzle, and quick multiplayer experiences across the App Store and Google Play.",
            intro: "Every game has its own page with a concise product profile and direct store links.",
            pageLabel: "Games",
            viewDetails: "Learn More",
            openStore: "Open Store",
            allProductsTitle: "All Games"
        }
    }
};

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function storeLabel(locale, storeKey) {
    const labels = {
        googlePlay: locale === "de" ? "Google Play" : "Google Play",
        appStore: locale === "de" ? "App Store" : "App Store",
        amazonAppstore: locale === "de" ? "Amazon Appstore" : "Amazon Appstore",
        website: locale === "de" ? "Web" : "Web"
    };
    return labels[storeKey];
}

function storeEyebrow(locale, storeKey) {
    if (storeKey === "googlePlay") {
        return locale === "de" ? "Jetzt bei" : "Get it on";
    }
    if (storeKey === "amazonAppstore") {
        return locale === "de" ? "Erhältlich im" : "Available at";
    }
    return locale === "de" ? "Im" : "Download on the";
}

function storeIconClass(storeKey) {
    if (storeKey === "googlePlay") {
        return "fab fa-google-play";
    }
    if (storeKey === "amazonAppstore") {
        return "fab fa-amazon";
    }
    return "fab fa-apple";
}

function storeVariantClass(storeKey) {
    if (storeKey === "googlePlay") {
        return "google";
    }
    if (storeKey === "amazonAppstore") {
        return "amazon";
    }
    return "apple";
}

function productPath(product, locale) {
    const folder = product.type === "app" ? "apps" : "games";
    const suffix = locale === "en" ? "_en" : "";
    return `${folder}/${product.slug}${suffix}.html`;
}

function listingPath(type, locale) {
    const suffix = locale === "en" ? "_en" : "";
    return `${type}${suffix}.html`;
}

function homePath(locale) {
    return locale === "de" ? "index.html" : "en.html";
}

function absoluteUrl(urlPath = "") {
    const normalized = urlPath ? urlPath.replace(/^\//, "") : "";
    return normalized ? `https://aralel.com/${normalized}` : "https://aralel.com/";
}

function localeMeta(locale) {
    return locale === "de"
        ? { ogLocale: "de_DE", alternateLocale: "en_US", language: "de-DE" }
        : { ogLocale: "en_US", alternateLocale: "de_DE", language: "en-US" };
}

function structuredDataScript(data) {
    return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

function renderStoreLinks(product, locale, basePrefix = "") {
    const googleBadge = `${basePrefix}images/badge-google-play.svg`;
    const appleBadge = `${basePrefix}images/badge-app-store.svg`;
    const amazonBadge = `${basePrefix}images/badge-amazon-appstore-${locale}.png`;

    return Object.entries(product.stores)
        .map(([storeKey, url]) => {
            const badgeSrc = storeKey === "googlePlay"
                ? googleBadge
                : storeKey === "amazonAppstore"
                    ? amazonBadge
                    : appleBadge;
            return `
                <a class="store-link store-link--${storeVariantClass(storeKey)}" href="${url}" target="_blank" rel="noopener noreferrer" aria-label="${locale === "de" ? `${copyStoreName(storeKey)} öffnen` : `Open ${copyStoreName(storeKey)}`}">
                    <img src="${badgeSrc}" alt="" class="store-badge-image${storeKey === "appStore" ? " store-badge-image--apple" : ""}${storeKey === "amazonAppstore" ? " store-badge-image--amazon" : ""}">
                </a>
            `;
        })
        .join("");
}

function renderStorePills(product, locale) {
    const availability = [...Object.keys(product.stores)];
    if (product.websiteUrl) {
        availability.push("website");
    }

    return availability
        .map((storeKey) => `<span class="product-pill">${storeLabel(locale, storeKey)}</span>`)
        .join("");
}

function copyStoreName(storeKey) {
    if (storeKey === "googlePlay") {
        return "Google Play";
    }
    if (storeKey === "amazonAppstore") {
        return "Amazon Appstore";
    }
    return "App Store";
}

function renderHeader({ locale, basePrefix, langSwitchHref }) {
    const nav = {
        home: locale === "de" ? "Start" : "Home",
        apps: locale === "de" ? "Apps" : "Apps",
        games: locale === "de" ? "Spiele" : "Games",
        about: locale === "de" ? "Über uns" : "About",
        contact: locale === "de" ? "Kontakt" : "Contact"
    };

    return `
        <header>
            <nav>
                <a class="logo logo-link" href="${basePrefix}${homePath(locale)}">
                    <img src="${basePrefix}images/aralel-logo.png" alt="Aralel GmbH Logo" class="logo-img">
                    <span class="logo-text">Aralel GmbH</span>
                </a>
                <button class="mobile-menu-toggle" aria-label="Toggle menu">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
                <ul>
                    <li><a href="${basePrefix}${homePath(locale)}">${nav.home}</a></li>
                    <li><a href="${basePrefix}${listingPath("games", locale)}">${nav.games}</a></li>
                    <li><a href="${basePrefix}${listingPath("apps", locale)}">${nav.apps}</a></li>
                    <li><a href="${basePrefix}${homePath(locale)}#about">${nav.about}</a></li>
                    <li><a href="${basePrefix}${homePath(locale)}#contact">${nav.contact}</a></li>
                    <li class="lang-switch"><a href="${langSwitchHref}" title="${locale === "de" ? "English" : "Deutsch"}">${locale === "de" ? "🇬🇧" : "🇩🇪"}</a></li>
                </ul>
            </nav>
        </header>
    `;
}

function renderFooter({ locale, basePrefix }) {
    return `
        <footer>
            <div class="footer-content">
                <div class="footer-section">
                    <h3>Aralel GmbH</h3>
                    <p class="footer-copy">${locale === "de" ? "Veröffentlichte Spiele, Apps und Web-Produkte, verlinkt direkt zu den jeweiligen Plattformen." : "Published games, apps, and web products linked directly to their platforms."}</p>
                </div>
                <div class="footer-section">
                    <h3>${locale === "de" ? "Produkte" : "Products"}</h3>
                    <ul>
                        <li><a href="${basePrefix}${listingPath("games", locale)}">${locale === "de" ? "Spiele" : "Games"}</a></li>
                        <li><a href="${basePrefix}${listingPath("apps", locale)}">${locale === "de" ? "Apps" : "Apps"}</a></li>
                    </ul>
                </div>
                <div class="footer-section">
                    <h3>${locale === "de" ? "Unternehmen" : "Company"}</h3>
                    <ul>
                        <li><a href="${basePrefix}${homePath(locale)}#about">${locale === "de" ? "Über uns" : "About"}</a></li>
                        <li><a href="${basePrefix}${homePath(locale)}#contact">${locale === "de" ? "Kontakt" : "Contact"}</a></li>
                        <li><a href="${basePrefix}privacy-policy.html">${locale === "de" ? "Datenschutz" : "Privacy"}</a></li>
                    </ul>
                </div>
                <div class="footer-section">
                    <h3>${locale === "de" ? "Sprache" : "Language"}</h3>
                    <ul>
                        <li><a href="${basePrefix}index.html">🇩🇪 Deutsch</a></li>
                        <li><a href="${basePrefix}en.html">🇬🇧 English</a></li>
                    </ul>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2026 Aralel GmbH. ${locale === "de" ? "Alle Rechte vorbehalten." : "All rights reserved."} | <a href="#" id="invalidate-cache">${locale === "de" ? "Cache ungültig machen" : "Invalidate cache"}</a></p>
            </div>
        </footer>
    `;
}

function htmlDocument({
    locale,
    title,
    description,
    image,
    urlPath,
    basePrefix,
    bodyClass,
    langSwitchHref,
    alternatePaths,
    structuredData = [],
    mainContent
}) {
    const localeInfo = localeMeta(locale);
    const structuredDataMarkup = structuredData.map((item) => structuredDataScript(item)).join("\n    ");

    return `<!DOCTYPE html>
<html lang="${locale}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="robots" content="index, follow">
    <meta name="theme-color" content="#ffffff">
    <link rel="canonical" href="${absoluteUrl(urlPath)}">
    <link rel="alternate" hreflang="de" href="${absoluteUrl(alternatePaths.de)}">
    <link rel="alternate" hreflang="en" href="${absoluteUrl(alternatePaths.en)}">
    <link rel="alternate" hreflang="x-default" href="${absoluteUrl(alternatePaths.en)}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${absoluteUrl(urlPath)}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${image}">
    <meta property="og:locale" content="${localeInfo.ogLocale}">
    <meta property="og:locale:alternate" content="${localeInfo.alternateLocale}">
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="${absoluteUrl(urlPath)}">
    <meta property="twitter:title" content="${escapeHtml(title)}">
    <meta property="twitter:description" content="${escapeHtml(description)}">
    <meta property="twitter:image" content="${image}">
    <meta property="twitter:site" content="@aralel">
    <link rel="stylesheet" href="${basePrefix}styles.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link rel="icon" href="${basePrefix}favicon.ico" type="image/x-icon">
    ${structuredDataMarkup}
</head>
<body class="${bodyClass}">
    ${renderHeader({ locale, basePrefix, langSwitchHref })}
    ${mainContent}
    ${renderFooter({ locale, basePrefix })}
    <script src="${basePrefix}cookie-consent.js"></script>
    <script src="${basePrefix}script.js"></script>
</body>
</html>`;
}

function renderListingPage(type, locale) {
    const meta = pageMeta[type][locale];
    const products = getProductsByType(type === "apps" ? "app" : "game");
    const basePrefix = "";
    const cards = products
        .map((product) => {
            const copy = product.locales[locale];
            return `
                <article class="catalog-card" style="--product-accent:${product.accent};--product-accent-strong:${product.accentStrong};">
                    <div class="catalog-card-top">
                        <img src="${product.iconUrl}" alt="${escapeHtml(copy.name)} icon" class="catalog-icon">
                        <div class="catalog-heading">
                            <span class="catalog-type">${escapeHtml(copy.category)}</span>
                            <h2>${escapeHtml(copy.name)}</h2>
                        </div>
                    </div>
                    <p class="catalog-summary">${escapeHtml(copy.shortSummary)}</p>
                    <div class="product-pill-row">
                        ${renderStorePills(product, locale)}
                    </div>
                    <div class="catalog-actions">
                        <a class="learn-more" href="${productPath(product, locale)}">${escapeHtml(meta.viewDetails)}</a>
                        ${renderStoreLinks(product, locale, basePrefix)}
                    </div>
                </article>
            `;
        })
        .join("");

    const langSwitchHref = listingPath(type, locale === "de" ? "en" : "de");
    const title = meta.title;
    const description = meta.intro;
    const image = products[0]?.iconUrl ?? "https://aralel.com/images/aralel-logo.png";
    const urlPath = listingPath(type, locale);
    const alternatePaths = {
        de: listingPath(type, "de"),
        en: listingPath(type, "en")
    };
    const structuredData = [
        {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: title,
            description,
            url: absoluteUrl(urlPath),
            inLanguage: localeMeta(locale).language,
            isPartOf: {
                "@type": "WebSite",
                name: "Aralel GmbH",
                url: absoluteUrl()
            },
            mainEntity: {
                "@type": "ItemList",
                itemListElement: products.map((product, index) => {
                    const copy = product.locales[locale];
                    const schemaType = product.type === "game" ? "VideoGame" : "MobileApplication";
                    return {
                        "@type": "ListItem",
                        position: index + 1,
                        url: absoluteUrl(productPath(product, locale)),
                        item: {
                            "@type": schemaType,
                            name: copy.name,
                            url: absoluteUrl(productPath(product, locale)),
                            image: product.iconUrl,
                            applicationCategory: copy.category,
                            sameAs: [...Object.values(product.stores), ...(product.websiteUrl ? [product.websiteUrl] : [])]
                        }
                    };
                })
            }
        }
    ];

    const mainContent = `
        <main class="catalog-page">
            <section class="page-hero page-hero--listing">
                <div class="page-hero-content">
                    <span class="page-kicker">${escapeHtml(meta.pageLabel)}</span>
                    <h1>${escapeHtml(meta.heroTitle)}</h1>
                    <p>${escapeHtml(meta.heroText)}</p>
                </div>
            </section>
            <section class="catalog-section-page">
                <div class="section-title-container">
                    <h2 class="section-title">${escapeHtml(meta.allProductsTitle)}</h2>
                    <div class="title-decoration"></div>
                    <p class="section-subtitle">${escapeHtml(meta.intro)}</p>
                </div>
                <div class="catalog-grid">
                    ${cards}
                </div>
            </section>
        </main>
    `;

    return {
        outPath: path.join(rootDir, listingPath(type, locale)),
        html: htmlDocument({
            locale,
            title,
            description,
            image,
            urlPath,
            basePrefix,
            bodyClass: "subpage",
            langSwitchHref,
            alternatePaths,
            structuredData,
            mainContent
        })
    };
}

function renderProductPage(product, locale) {
    const copy = product.locales[locale];
    const isApp = product.type === "app";
    const basePrefix = "../";
    const urlPath = productPath(product, locale);
    const oppositeLocale = locale === "de" ? "en" : "de";
    const listingHref = `${basePrefix}${listingPath(product.type === "app" ? "apps" : "games", locale)}`;
    const alternatePaths = {
        de: productPath(product, "de"),
        en: productPath(product, "en")
    };

    const highlightCards = copy.highlights
        .map((highlight) => {
            return `
                <article class="detail-card">
                    <h2>${escapeHtml(highlight.title)}</h2>
                    <p>${escapeHtml(highlight.text)}</p>
                </article>
            `;
        })
        .join("");

    const metaList = `
        <div class="detail-meta-item">
            <span class="detail-meta-label">${locale === "de" ? "Kategorie" : "Category"}</span>
            <strong>${escapeHtml(copy.category)}</strong>
        </div>
        <div class="detail-meta-item">
            <span class="detail-meta-label">${locale === "de" ? "Typ" : "Type"}</span>
            <strong>${isApp ? (locale === "de" ? "App" : "App") : (locale === "de" ? "Spiel" : "Game")}</strong>
        </div>
        <div class="detail-meta-item">
            <span class="detail-meta-label">${escapeHtml(copy.availabilityTitle)}</span>
            <strong>${escapeHtml(copy.availabilityText)}</strong>
        </div>
    `;

    const secondaryLinks = [];
    if (product.websiteUrl) {
        secondaryLinks.push(`<a class="secondary-link" href="${product.websiteUrl}" target="_blank" rel="noopener noreferrer">${locale === "de" ? "Website öffnen" : "Open Website"}</a>`);
    }
    if (product.privacyUrl?.[locale]) {
        secondaryLinks.push(`<a class="secondary-link" href="${product.privacyUrl[locale]}" target="_blank" rel="noopener noreferrer">${escapeHtml(copy.privacyLabel)}</a>`);
    }

    const operatingSystems = [];
    if (product.stores.googlePlay) {
        operatingSystems.push("Android");
    }
    if (product.stores.appStore) {
        operatingSystems.push("iOS");
    }
    if (product.websiteUrl) {
        operatingSystems.push("Web");
    }

    const structuredData = [
        {
            "@context": "https://schema.org",
            "@type": isApp ? "MobileApplication" : "VideoGame",
            name: copy.name,
            description: copy.metaDescription,
            url: absoluteUrl(urlPath),
            image: product.iconUrl,
            applicationCategory: copy.category,
            operatingSystem: operatingSystems.join(", "),
            publisher: {
                "@type": "Organization",
                name: "Aralel GmbH",
                url: absoluteUrl()
            },
            offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
                availability: "https://schema.org/InStock"
            },
            sameAs: [...Object.values(product.stores), ...(product.websiteUrl ? [product.websiteUrl] : [])]
        },
        {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
                {
                    "@type": "ListItem",
                    position: 1,
                    name: locale === "de" ? "Start" : "Home",
                    item: absoluteUrl(homePath(locale))
                },
                {
                    "@type": "ListItem",
                    position: 2,
                    name: isApp ? (locale === "de" ? "Apps" : "Apps") : (locale === "de" ? "Spiele" : "Games"),
                    item: absoluteUrl(listingPath(product.type === "app" ? "apps" : "games", locale))
                },
                {
                    "@type": "ListItem",
                    position: 3,
                    name: copy.name,
                    item: absoluteUrl(urlPath)
                }
            ]
        }
    ];

    const mainContent = `
        <main class="catalog-page">
            <section class="detail-hero" style="--product-accent:${product.accent};--product-accent-strong:${product.accentStrong};">
                <div class="detail-hero-content">
                    <div class="detail-breadcrumbs">
                        <a href="${listingHref}">${isApp ? (locale === "de" ? "Apps" : "Apps") : (locale === "de" ? "Spiele" : "Games")}</a>
                        <span>/</span>
                        <span>${escapeHtml(copy.name)}</span>
                    </div>
                    <div class="detail-hero-grid">
                        <div class="detail-copy">
                            <span class="page-kicker">${escapeHtml(copy.category)}</span>
                            <h1>${escapeHtml(copy.name)}</h1>
                            <p class="detail-lead">${escapeHtml(copy.heroTitle)}</p>
                            <p>${escapeHtml(copy.heroText)}</p>
                            <div class="store-links">
                                ${renderStoreLinks(product, locale, basePrefix)}
                            </div>
                            ${secondaryLinks.length ? `<div class="secondary-link-row">${secondaryLinks.join("")}</div>` : ""}
                        </div>
                        <div class="detail-visual">
                            <img src="${product.iconUrl}" alt="${escapeHtml(copy.name)} icon" class="detail-icon">
                        </div>
                    </div>
                </div>
            </section>
            <section class="detail-content">
                <div class="detail-main-column">
                    <div class="section-title-container">
                        <h2 class="section-title">${escapeHtml(copy.detailLabel)}</h2>
                        <div class="title-decoration"></div>
                        <p class="section-subtitle">${escapeHtml(copy.shortSummary)}</p>
                    </div>
                    <div class="detail-description">
                        <p>${escapeHtml(copy.description)}</p>
                    </div>
                    <div class="detail-card-grid">
                        ${highlightCards}
                    </div>
                </div>
                <aside class="detail-sidebar">
                    <div class="detail-panel">
                        ${metaList}
                    </div>
                    <div class="detail-panel">
                        <a class="back-link" href="${listingHref}">${escapeHtml(copy.backLabel)}</a>
                    </div>
                </aside>
            </section>
        </main>
    `;

    return {
        outPath: path.join(rootDir, productPath(product, locale)),
        html: htmlDocument({
            locale,
            title: `${copy.name} - Aralel GmbH`,
            description: copy.metaDescription,
            image: product.iconUrl,
            urlPath,
            basePrefix,
            bodyClass: "subpage",
            langSwitchHref: `${basePrefix}${productPath(product, oppositeLocale)}`,
            alternatePaths,
            structuredData,
            mainContent
        })
    };
}

function writePage({ outPath, html }) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, html, "utf8");
}

for (const locale of locales) {
    writePage(renderListingPage("games", locale));
    writePage(renderListingPage("apps", locale));

    for (const product of siteCatalog.products.filter((product) => product.hidden !== true)) {
        writePage(renderProductPage(product, locale));
    }
}
