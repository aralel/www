// Detect language
const isGerman = document.documentElement.lang === 'de';

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
}

// Smooth scrolling for in-page navigation links only
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (event) {
        const target = document.querySelector(this.getAttribute('href'));
        if (!target) {
            return;
        }

        event.preventDefault();
        target.scrollIntoView({
            behavior: 'smooth'
        });
    });
});

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
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
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
        navigator.serviceWorker.register('/service-worker.js')
            .then((registration) => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch((error) => {
                console.log('ServiceWorker registration failed: ', error);
            });
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
    console.log('App was installed');
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

    const updateHeroParallax = () => {
        if (!parallaxMedia.matches) {
            heroContent.style.transform = '';
            return;
        }

        heroContent.style.transform = `translateY(${window.scrollY * 0.18}px)`;
    };

    updateHeroParallax();
    window.addEventListener('scroll', updateHeroParallax, { passive: true });
    if (typeof parallaxMedia.addEventListener === 'function') {
        parallaxMedia.addEventListener('change', updateHeroParallax);
    }
}

// Reveal cards as they enter the viewport
if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, {
        threshold: 0.1
    });

    document.querySelectorAll('.game-card, .catalog-card, .detail-card').forEach((card) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'all 0.5s ease-out';
        observer.observe(card);
    });
}

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
