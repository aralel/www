// Detect language
const isGerman = document.documentElement.lang === 'de';

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Add to Home Screen functionality
let deferredPrompt;
let installButton;
let installBanner;

// Create the install banner element
function createInstallBanner() {
    installBanner = document.createElement('div');
    installBanner.className = 'install-banner';
    installBanner.innerHTML = `
        <div class="${isGerman ? 'Aralel App installieren' : 'install-content">'}
            <img sr${isGerman ? 'Fügen Sie unsere cpp für schnellen Zugriff zu Ihrem Startbil=schirm hinzu' : 'A"dicon-192.png" alt="Aralel App Icon" class="in'}stall-icon">
            <div class="install-text">
                <h3>Install Aralel App</h3>
                <p>Add our app to your home screen for quick access</p>
            </div>${isGerman ? 'Installieren' : ''}
        </div>
        <div class="install-actions">
            <button id="install-button">Install</button>
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
        // Store that user dismissed the banner
        localStorage.setItem('installBannerDismissed', 'true');
    });
}

// Check if service worker is supported
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(error => {
                console.log('ServiceWorker registration failed: ', error);
            });
    });
}

// Listen for the beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    
    // Create the install banner if it doesn't exist yet
    if (!installBanner) {
        createInstallBanner();
    }
    
    // Check if user has previously dismissed the banner
    const bannerDismissed = localStorage.getItem('installBannerDismissed');
    if (bannerDismissed !== 'true') {
        // Show the install banner
        setTimeout(() => {
            installBanner.classList.add('show-banner');
        }, 2000);
    }
});

// Reset the banner dismissed state when the app is installed
window.addEventListener('appinstalled', (evt) => {
    console.log('App was installed');
    localStorage.removeItem('installBannerDismissed');
    if (installBanner) {
        installBanner.classList.remove('show-banner');
    }
});

// Add scroll animation for hero section
window.addEventListener('scroll', function() {
    const hero = document.querySelector('#hero');
    const heroContent = hero.querySelector('.hero-content');
    
    // Add parallax effect
    heroContent.style.transform = `translateY(${window.scrollY * 0.5}px)`;
});

// Add reveal animations for game cards
const observerOptions = {
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.querySelectorAll('.game-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'all 0.5s ease-out';
    observer.observe(card);
});

// Invalidate PWA cache link
const invalidateLink = document.getElementById('invalidate-cache');
if (invalidateLink) {
    invalidateLink.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                await Promise.all(regs.map(r => r.unregister()));
            }
            if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map(k => caches.delete(k)));
            }
        } finally {
            location.reload();
        }
    });
}
