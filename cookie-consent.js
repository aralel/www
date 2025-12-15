/**
 * GDPR Cookie Consent Manager
 * Handles cookie consent for EU compliance
 */

(function() {
    'use strict';

    const CONSENT_KEY = 'aralel_cookie_consent';
    const CONSENT_VERSION = '1.0';

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

    // Create the cookie banner HTML
    function createBanner() {
        const banner = document.createElement('div');
        banner.id = 'cookie-consent-banner';
        banner.className = 'cookie-consent-banner';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-labelledby', 'cookie-consent-title');
        banner.setAttribute('aria-describedby', 'cookie-consent-description');

        banner.innerHTML = `
            <div class="cookie-consent-content">
                <div class="cookie-consent-header">
                    <h2 id="cookie-consent-title">🍪 Cookie Settings</h2>
                    <p id="cookie-consent-description">
                        We use cookies to enhance your browsing experience and analyze site traffic.
                        You can choose which cookies you allow. Essential cookies are always active as they are necessary for the website to function.
                        <a href="/privacy-policy.html" target="_blank">Learn more in our Privacy Policy</a>.
                    </p>
                </div>

                <div class="cookie-consent-options">
                    <div class="cookie-option">
                        <div class="cookie-option-header">
                            <label class="cookie-switch">
                                <input type="checkbox" id="cookie-necessary" checked disabled>
                                <span class="cookie-slider"></span>
                            </label>
                            <span class="cookie-option-title">Essential Cookies</span>
                            <span class="cookie-badge required">Required</span>
                        </div>
                        <p class="cookie-option-desc">Required for the website to function. Cannot be disabled.</p>
                    </div>

                    <div class="cookie-option">
                        <div class="cookie-option-header">
                            <label class="cookie-switch">
                                <input type="checkbox" id="cookie-analytics">
                                <span class="cookie-slider"></span>
                            </label>
                            <span class="cookie-option-title">Analytics Cookies</span>
                        </div>
                        <p class="cookie-option-desc">Help us understand how visitors interact with our website.</p>
                    </div>

                    <div class="cookie-option">
                        <div class="cookie-option-header">
                            <label class="cookie-switch">
                                <input type="checkbox" id="cookie-marketing">
                                <span class="cookie-slider"></span>
                            </label>
                            <span class="cookie-option-title">Marketing Cookies</span>
                        </div>
                        <p class="cookie-option-desc">Used to deliver personalized advertisements.</p>
                    </div>

                    <div class="cookie-option">
                        <div class="cookie-option-header">
                            <label class="cookie-switch">
                                <input type="checkbox" id="cookie-preferences">
                                <span class="cookie-slider"></span>
                            </label>
                            <span class="cookie-option-title">Preference Cookies</span>
                        </div>
                        <p class="cookie-option-desc">Remember your settings and preferences.</p>
                    </div>
                </div>

                <div class="cookie-consent-buttons">
                    <button id="cookie-reject-all" class="cookie-btn cookie-btn-secondary">Reject All</button>
                    <button id="cookie-save-preferences" class="cookie-btn cookie-btn-secondary">Save Preferences</button>
                    <button id="cookie-accept-all" class="cookie-btn cookie-btn-primary">Accept All</button>
                </div>
            </div>
        `;

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

    // Placeholder for analytics loading
    function loadAnalytics() {
        // Add your analytics script loading here
        // Example for Google Analytics:
        // if (typeof gtag === 'undefined') {
        //     const script = document.createElement('script');
        //     script.src = 'https://www.googletagmanager.com/gtag/js?id=YOUR-GA-ID';
        //     script.async = true;
        //     document.head.appendChild(script);
        // }
        console.log('Analytics consent granted - ready to load analytics scripts');
    }

    // Placeholder for marketing loading
    function loadMarketing() {
        // Add your marketing script loading here
        console.log('Marketing consent granted - ready to load marketing scripts');
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
