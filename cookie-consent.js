/**
 * GDPR/DSGVO Cookie Consent Manager
 * Handles cookie consent for EU compliance (bilingual: DE/EN)
 */

(function() {
    'use strict';

    const CONSENT_KEY = 'aralel_cookie_consent';
    const CONSENT_VERSION = '1.1';
    const ADSENSE_CLIENT = 'ca-pub-2499635055097290';

    const pageLang = document.documentElement.lang || 'en';
    const isDE = pageLang === 'de';

    const i18n = {
        title:           isDE ? 'Cookie-Einstellungen' : 'Cookie Settings',
        description:     isDE
            ? 'Wir verwenden Cookies, um Ihr Nutzungserlebnis zu verbessern und die Website zu analysieren. Sie können wählen, welche Cookies Sie erlauben. Notwendige Cookies sind immer aktiv. '
            : 'We use cookies to enhance your browsing experience and analyze site traffic. You can choose which cookies you allow. Essential cookies are always active. ',
        policyLink:      isDE ? 'Mehr erfahren in unserer Datenschutzerklärung' : 'Learn more in our Privacy Policy',
        policyHref:      isDE ? '/datenschutz.html' : '/privacy-policy.html',
        necessary:       isDE ? 'Notwendige Cookies' : 'Essential Cookies',
        necessaryDesc:   isDE ? 'Für den Betrieb der Website erforderlich. Können nicht deaktiviert werden.' : 'Required for the website to function. Cannot be disabled.',
        required:        isDE ? 'Erforderlich' : 'Required',
        analytics:       isDE ? 'Analyse-Cookies' : 'Analytics Cookies',
        analyticsDesc:   isDE ? 'Helfen uns zu verstehen, wie Besucher mit der Website interagieren.' : 'Help us understand how visitors interact with our website.',
        marketing:       isDE ? 'Marketing-Cookies' : 'Marketing Cookies',
        marketingDesc:   isDE ? 'Für die Einblendung personalisierter Werbeanzeigen verwendet.' : 'Used to deliver personalized advertisements.',
        preferences:     isDE ? 'Präferenz-Cookies' : 'Preference Cookies',
        preferencesDesc: isDE ? 'Speichern Ihre Einstellungen und Präferenzen.' : 'Remember your settings and preferences.',
        rejectAll:       isDE ? 'Alle ablehnen' : 'Reject All',
        savePrefs:       isDE ? 'Einstellungen speichern' : 'Save Preferences',
        acceptAll:       isDE ? 'Alle akzeptieren' : 'Accept All',
    };

    // Default consent state - all non-essential cookies disabled
    const defaultConsent = {
        version: CONSENT_VERSION,
        necessary: true,      // Always required
        analytics: false,     // Analytics cookies
        marketing: false,     // Marketing/advertising cookies
        preferences: false,   // Preference cookies
        timestamp: null
    };

    // Get stored consent
    function getStoredConsent() {
        try {
            const stored = localStorage.getItem(CONSENT_KEY);
            if (stored) {
                const consent = JSON.parse(stored);
                // Check if consent version matches
                if (consent.version === CONSENT_VERSION) {
                    return consent;
                }
            }
        } catch (e) {
            console.error('Error reading cookie consent:', e);
        }
        return null;
    }

    // Save consent
    function saveConsent(consent) {
        consent.timestamp = new Date().toISOString();
        consent.version = CONSENT_VERSION;
        try {
            localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
        } catch (e) {
            console.error('Error saving cookie consent:', e);
        }
    }

    // Check if consent has been given
    function hasConsent() {
        return getStoredConsent() !== null;
    }

    // Get specific consent type
    function getConsent(type) {
        const consent = getStoredConsent();
        if (consent && consent[type] !== undefined) {
            return consent[type];
        }
        return defaultConsent[type];
    }

    function makeEl(tag, cls, textVal) {
        const el = document.createElement(tag);
        if (cls) { el.className = cls; }
        if (textVal !== undefined) { el.textContent = textVal; }
        return el;
    }

    function makeSwitch(switchId, isChecked, isDisabled) {
        const label = makeEl('label', 'cookie-switch');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = switchId;
        if (isChecked) { input.checked = true; }
        if (isDisabled) { input.disabled = true; }
        label.appendChild(input);
        label.appendChild(makeEl('span', 'cookie-slider'));
        return label;
    }

    function makeOption(switchId, isChecked, isDisabled, titleText, badgeText, descText) {
        const header = makeEl('div', 'cookie-option-header');
        header.appendChild(makeSwitch(switchId, isChecked, isDisabled));
        header.appendChild(makeEl('span', 'cookie-option-title', titleText));
        if (badgeText) {
            header.appendChild(makeEl('span', 'cookie-badge required', badgeText));
        }
        const option = makeEl('div', 'cookie-option');
        option.appendChild(header);
        option.appendChild(makeEl('p', 'cookie-option-desc', descText));
        return option;
    }

    // Build the cookie banner using only safe DOM methods
    function createBanner() {
        const policyLink = document.createElement('a');
        policyLink.href = i18n.policyHref;
        policyLink.target = '_blank';
        policyLink.rel = 'noopener noreferrer';
        policyLink.textContent = i18n.policyLink;

        const heading = makeEl('h2', null, '🍪 ' + i18n.title);
        heading.id = 'cookie-consent-title';

        const descPara = makeEl('p');
        descPara.id = 'cookie-consent-description';
        descPara.appendChild(document.createTextNode(i18n.description));
        descPara.appendChild(policyLink);
        descPara.appendChild(document.createTextNode('.'));

        const headerDiv = makeEl('div', 'cookie-consent-header');
        headerDiv.appendChild(heading);
        headerDiv.appendChild(descPara);

        const optionsDiv = makeEl('div', 'cookie-consent-options');
        optionsDiv.appendChild(makeOption('cookie-necessary', true, true, i18n.necessary, i18n.required, i18n.necessaryDesc));
        optionsDiv.appendChild(makeOption('cookie-analytics', false, false, i18n.analytics, null, i18n.analyticsDesc));
        optionsDiv.appendChild(makeOption('cookie-marketing', false, false, i18n.marketing, null, i18n.marketingDesc));
        optionsDiv.appendChild(makeOption('cookie-preferences', false, false, i18n.preferences, null, i18n.preferencesDesc));

        const rejectBtn = makeEl('button', 'cookie-btn cookie-btn-secondary', i18n.rejectAll);
        rejectBtn.id = 'cookie-reject-all';
        const saveBtn = makeEl('button', 'cookie-btn cookie-btn-secondary', i18n.savePrefs);
        saveBtn.id = 'cookie-save-preferences';
        const acceptBtn = makeEl('button', 'cookie-btn cookie-btn-primary', i18n.acceptAll);
        acceptBtn.id = 'cookie-accept-all';

        const buttonsDiv = makeEl('div', 'cookie-consent-buttons');
        buttonsDiv.appendChild(rejectBtn);
        buttonsDiv.appendChild(saveBtn);
        buttonsDiv.appendChild(acceptBtn);

        const content = makeEl('div', 'cookie-consent-content');
        content.appendChild(headerDiv);
        content.appendChild(optionsDiv);
        content.appendChild(buttonsDiv);

        const banner = makeEl('div', 'cookie-consent-banner');
        banner.id = 'cookie-consent-banner';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-labelledby', 'cookie-consent-title');
        banner.setAttribute('aria-describedby', 'cookie-consent-description');
        banner.appendChild(content);

        return banner;
    }

    // Show the banner
    function showBanner() {
        let banner = document.getElementById('cookie-consent-banner');
        if (!banner) {
            banner = createBanner();
            document.body.appendChild(banner);
            setupEventListeners(banner);
        }

        // Restore previous preferences if any
        const storedConsent = getStoredConsent();
        if (storedConsent) {
            document.getElementById('cookie-analytics').checked = storedConsent.analytics;
            document.getElementById('cookie-marketing').checked = storedConsent.marketing;
            document.getElementById('cookie-preferences').checked = storedConsent.preferences;
        }

        // Show with animation
        requestAnimationFrame(() => {
            banner.classList.add('show');
        });
    }

    // Hide the banner
    function hideBanner() {
        const banner = document.getElementById('cookie-consent-banner');
        if (banner) {
            banner.classList.remove('show');
            setTimeout(() => {
                banner.remove();
            }, 300);
        }
    }

    // Setup event listeners
    function setupEventListeners(banner) {
        // Accept all
        banner.querySelector('#cookie-accept-all').addEventListener('click', () => {
            const consent = {
                ...defaultConsent,
                analytics: true,
                marketing: true,
                preferences: true
            };
            saveConsent(consent);
            hideBanner();
            applyConsent(consent);
        });

        // Reject all (except necessary)
        banner.querySelector('#cookie-reject-all').addEventListener('click', () => {
            const consent = { ...defaultConsent };
            saveConsent(consent);
            hideBanner();
            applyConsent(consent);
        });

        // Save preferences
        banner.querySelector('#cookie-save-preferences').addEventListener('click', () => {
            const consent = {
                ...defaultConsent,
                analytics: document.getElementById('cookie-analytics').checked,
                marketing: document.getElementById('cookie-marketing').checked,
                preferences: document.getElementById('cookie-preferences').checked
            };
            saveConsent(consent);
            hideBanner();
            applyConsent(consent);
        });
    }

    // Apply consent settings (load scripts, etc.)
    function applyConsent(consent) {
        // Dispatch event for other scripts to listen to
        window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { detail: consent }));

        // Example: Load analytics if consented
        if (consent.analytics) {
            loadAnalytics();
        }

        // Example: Load marketing scripts if consented
        if (consent.marketing) {
            loadMarketing();
        }
    }

    function loadAnalytics() {
        // No analytics service is currently configured.
    }

    function loadMarketing() {
        if (document.querySelector('script[data-adsense]')) { return; }
        const script = document.createElement('script');
        script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + ADSENSE_CLIENT;
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.setAttribute('data-adsense', '1');
        document.head.appendChild(script);
    }

    // Delete non-essential cookies
    function deleteNonEssentialCookies() {
        // Get all cookies
        const cookies = document.cookie.split(';');

        // List of essential cookie names (add your essential cookies here)
        const essentialCookies = [CONSENT_KEY];

        cookies.forEach(cookie => {
            const cookieName = cookie.split('=')[0].trim();
            if (!essentialCookies.includes(cookieName)) {
                // Delete cookie
                document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
            }
        });
    }

    // Public API
    window.CookieConsent = {
        show: showBanner,
        hide: hideBanner,
        hasConsent: hasConsent,
        getConsent: getConsent,
        getStoredConsent: getStoredConsent,
        reset: function() {
            localStorage.removeItem(CONSENT_KEY);
            deleteNonEssentialCookies();
            showBanner();
        }
    };

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        // Show banner if no consent stored
        if (!hasConsent()) {
            // Small delay to let the page render first
            setTimeout(showBanner, 500);
        } else {
            // Apply stored consent
            const consent = getStoredConsent();
            if (consent) {
                applyConsent(consent);
            }
        }

        // Add click handler for cookie settings links
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-cookie-settings], .cookie-settings-link')) {
                e.preventDefault();
                showBanner();
            }
        });
    }
})();
