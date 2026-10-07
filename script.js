// Detect language
const isGerman = document.documentElement.lang === 'de';
const releaseVersionMeta = document.querySelector('meta[name="release-version"]');
const releaseVersion = releaseVersionMeta ? releaseVersionMeta.content : 'dev';

// Mobile Menu Toggle
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const navMenu = document.querySelector('nav ul');

if (mobileMenuToggle && navMenu) {
    const closeNavMenu = () => {
        mobileMenuToggle.classList.remove('active');
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
        navMenu.classList.remove('active');
    };

    mobileMenuToggle.setAttribute('aria-expanded', 'false');

    mobileMenuToggle.addEventListener('click', () => {
        const isOpen = mobileMenuToggle.classList.toggle('active');
        mobileMenuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        navMenu.classList.toggle('active', isOpen);
    });

    document.querySelectorAll('nav ul li a').forEach((link) => {
        link.addEventListener('click', () => {
            closeNavMenu();
        });
    });

    document.addEventListener('click', (event) => {
        if (!event.target.closest('nav') && navMenu.classList.contains('active')) {
            closeNavMenu();
        }
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 820 && navMenu.classList.contains('active')) {
            closeNavMenu();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && navMenu.classList.contains('active')) {
            closeNavMenu();
            mobileMenuToggle.focus();
        }
    });
}

// Smooth scrolling for in-page navigation links only
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (event) {
        const targetSelector = this.getAttribute('href');
        if (targetSelector.length < 2) {
            return;
        }

        const target = document.querySelector(targetSelector);
        if (!target) {
            return;
        }

        event.preventDefault();
        target.scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Put the visitor's own store first: App Store on iPhone/iPad, Google Play on Android.
// (iPadOS reports itself as a Mac; touch support tells them apart.)
const userAgent = navigator.userAgent;
const isAppleMobileDevice = /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && navigator.maxTouchPoints > 1);
const isAndroidDevice = /Android/.test(userAgent);
const preferredStoreSelector = isAppleMobileDevice ? '.store-link--apple' : (isAndroidDevice ? '.store-link--google' : null);
if (preferredStoreSelector) {
    document.querySelectorAll('.store-links').forEach((storeLinks) => {
        const preferredStoreLink = storeLinks.querySelector(preferredStoreSelector);
        if (preferredStoreLink && storeLinks.firstElementChild !== preferredStoreLink) {
            storeLinks.prepend(preferredStoreLink);
        }
    });
}

// Catalog platform filter (_layouts/catalog_list.html). ?platform=<key> preselects a filter,
// so filtered views can be linked.
const catalogFilter = document.querySelector('[data-catalog-filter]');
if (catalogFilter) {
    const filterChips = catalogFilter.querySelectorAll('[data-platform]');
    const catalogCards = document.querySelectorAll('.catalog-section-page .catalog-card');

    const applyPlatformFilter = (selectedPlatform) => {
        filterChips.forEach((chip) => chip.setAttribute('aria-pressed', String(chip.dataset.platform === selectedPlatform)));
        catalogCards.forEach((card) => {
            const cardPlatforms = card.dataset.platforms.split(' ');
            card.hidden = Boolean(selectedPlatform) && !cardPlatforms.includes(selectedPlatform);
        });
        const pageUrl = new URL(window.location.href);
        if (selectedPlatform) {
            pageUrl.searchParams.set('platform', selectedPlatform);
        } else {
            pageUrl.searchParams.delete('platform');
        }
        history.replaceState(null, '', pageUrl);
    };

    filterChips.forEach((chip) => chip.addEventListener('click', () => applyPlatformFilter(chip.dataset.platform)));
    catalogFilter.hidden = false;

    const requestedPlatform = new URL(window.location.href).searchParams.get('platform');
    if (requestedPlatform && [...filterChips].some((chip) => chip.dataset.platform === requestedPlatform)) {
        applyPlatformFilter(requestedPlatform);
    }
}

// Store-badge clicks as analytics events. window.plausible only exists after analytics
// consent with analytics_script_src configured (cookie-consent.js), so this is a no-op otherwise.
document.addEventListener('click', (event) => {
    const storeLink = event.target.closest('.store-link');
    if (!storeLink || typeof window.plausible !== 'function') {
        return;
    }
    const storeName = [...storeLink.classList].find((className) => className.startsWith('store-link--'))?.replace('store-link--', '') || 'store';
    const productName = storeLink.closest('.catalog-card')?.querySelector('.catalog-name-link')?.textContent.trim()
        || document.querySelector('.detail-copy h1')?.textContent.trim() || '';
    const placement = storeLink.closest('.catalog-card') ? 'catalog-card' : 'product-page';
    window.plausible('Store click', { props: { store: storeName, product: productName, placement } });
});

// Contact forms (_includes/contact_form.html)
// With an endpoint configured the form is POSTed via fetch; otherwise the visitor's
// mail app opens with a pre-filled message to the company address.
const MINIMUM_FILL_MILLISECONDS = 2500; // faster than this is almost certainly a bot

function setFormStatus(statusElement, state, message) {
    if (!statusElement) {
        return;
    }
    statusElement.dataset.state = state;
    statusElement.textContent = message;
}

function setupContactForm(contactForm) {
    const statusElement = contactForm.querySelector('[data-form-status]');
    const submitButton = contactForm.querySelector('[type="submit"]');
    const formRenderedAt = Date.now();

    contactForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!contactForm.reportValidity()) {
            return;
        }

        const formData = new FormData(contactForm);
        const looksLikeBot = formData.get('_gotcha') || Date.now() - formRenderedAt < MINIMUM_FILL_MILLISECONDS;
        const endpoint = contactForm.dataset.endpoint;

        if (!endpoint) {
            const baseSubject = formData.get('subject') || contactForm.dataset.defaultSubject;
            const topic = formData.get('topic');
            const subject = topic ? `${baseSubject} – ${topic}` : baseSubject;
            const body = `${formData.get('message')}\n\n— ${formData.get('name')} <${formData.get('email')}>`;
            window.location.href = `mailto:${contactForm.dataset.mailto}`
                + `?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            setFormStatus(statusElement, 'info', contactForm.dataset.statusMailto);
            return;
        }

        if (looksLikeBot) {
            // Pretend it worked so bots get no signal to adapt.
            setFormStatus(statusElement, 'success', contactForm.dataset.statusSuccess);
            contactForm.reset();
            return;
        }

        formData.delete('_gotcha');
        if (submitButton) {
            submitButton.disabled = true;
        }
        setFormStatus(statusElement, 'info', contactForm.dataset.statusSending);

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData,
                headers: { Accept: 'application/json' }
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            setFormStatus(statusElement, 'success', contactForm.dataset.statusSuccess);
            contactForm.reset();
        } catch (error) {
            setFormStatus(statusElement, 'error', contactForm.dataset.statusError);
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
            }
        }
    });
}

document.querySelectorAll('form[data-contact-form]').forEach(setupContactForm);

// Add to Home Screen functionality
let deferredPrompt;
let installButton;
let installBanner;

function createInstallBanner() {
    const installTitle = isGerman ? 'Aralel App installieren' : 'Install Aralel App';
    const installDescription = isGerman
        ? 'Fügen Sie unsere App für schnellen Zugriff zu Ihrem Startbildschirm hinzu.'
        : 'Add our app to your home screen for quick access';
    const installAction = isGerman ? 'Installieren' : 'Install';

    installBanner = document.createElement('div');
    installBanner.className = 'install-banner';
    installBanner.innerHTML = `
        <div class="install-content">
            <img src="/icon-192.png" alt="Aralel App Icon" class="install-icon">
            <div class="install-text">
                <h3>${installTitle}</h3>
                <p>${installDescription}</p>
            </div>
        </div>
        <div class="install-actions">
            <button id="install-button">${installAction}</button>
            <button id="close-install-banner">✕</button>
        </div>
    `;

    document.body.appendChild(installBanner);

    installButton = document.getElementById('install-button');
    const closeButton = document.getElementById('close-install-banner');

    installButton.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
            deferredPrompt = null;
            installBanner.classList.remove('show-banner');
        }
    });

    closeButton.addEventListener('click', () => {
        installBanner.classList.remove('show-banner');
        localStorage.setItem('installBannerDismissed', 'true');
    });
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Offline support is an enhancement: a failed registration just means no offline cache.
        navigator.serviceWorker.register(`/service-worker.js?v=${encodeURIComponent(releaseVersion)}`)
            .catch(() => {});
    });
}

window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;

    if (!installBanner) {
        createInstallBanner();
    }

    const bannerDismissed = localStorage.getItem('installBannerDismissed');
    if (bannerDismissed !== 'true') {
        setTimeout(() => {
            installBanner.classList.add('show-banner');
        }, 2000);
    }
});

window.addEventListener('appinstalled', () => {
    localStorage.removeItem('installBannerDismissed');
    if (installBanner) {
        installBanner.classList.remove('show-banner');
    }
});


// Add parallax effect for the homepage hero only
const hero = document.querySelector('#hero');
const heroContent = hero ? hero.querySelector('.hero-content') : null;

if (hero && heroContent) {
    const parallaxMedia = window.matchMedia('(min-width: 821px) and (prefers-reduced-motion: no-preference)');

    let parallaxFrameRequested = false;

    const updateHeroParallax = () => {
        parallaxFrameRequested = false;
        if (!parallaxMedia.matches) {
            heroContent.style.transform = '';
            return;
        }

        heroContent.style.transform = `translateY(${window.scrollY * 0.18}px)`;
    };

    // At most one transform write per frame, however many scroll events arrive.
    const requestHeroParallaxUpdate = () => {
        if (!parallaxFrameRequested) {
            parallaxFrameRequested = true;
            requestAnimationFrame(updateHeroParallax);
        }
    };

    updateHeroParallax();
    window.addEventListener('scroll', requestHeroParallaxUpdate, { passive: true });
    if (typeof parallaxMedia.addEventListener === 'function') {
        parallaxMedia.addEventListener('change', updateHeroParallax);
    }
}

// Card reveal is now handled by animations.js via CSS classes.
// This block is intentionally left empty to avoid conflicts.

// Invalidate PWA cache link
const invalidateLink = document.getElementById('invalidate-cache');
if (invalidateLink) {
    invalidateLink.addEventListener('click', async (event) => {
        event.preventDefault();
        try {
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map((registration) => registration.unregister()));
            }
            if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map((key) => caches.delete(key)));
            }
        } finally {
            location.reload();
        }
    });
}

