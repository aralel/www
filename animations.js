/**
 * Aralel Animations
 * Scroll-reveal, stagger, header state, ripple, and hero entrance.
 * All motion is gated behind the .motion-ok class on <html>,
 * which is only added when prefers-reduced-motion is not set.
 */

(function () {
    'use strict';

    // ── Motion preference ──────────────────────────────────────
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    function applyMotionClass() {
        if (prefersReduced.matches) {
            document.documentElement.classList.remove('motion-ok');
        } else {
            document.documentElement.classList.add('motion-ok');
        }
    }

    applyMotionClass();

    if (typeof prefersReduced.addEventListener === 'function') {
        prefersReduced.addEventListener('change', applyMotionClass);
    }

    // ── Helpers ────────────────────────────────────────────────
    function motionOk() {
        return document.documentElement.classList.contains('motion-ok');
    }

    // ── Header scroll state ────────────────────────────────────
    const header = document.querySelector('.site-header');

    if (header) {
        const updateHeader = () => {
            header.classList.toggle('is-scrolled', window.scrollY > 12);
        };
        updateHeader();
        window.addEventListener('scroll', updateHeader, { passive: true });
    }

    // ── Hero entrance ──────────────────────────────────────────
    // Add .hero-animate to the hero content block so CSS keyframes fire.
    const heroContent = document.querySelector('.hero-content');
    if (heroContent) {
        heroContent.classList.add('hero-animate');
    }

    // ── Scroll-reveal via IntersectionObserver ─────────────────
    function setupReveal() {
        if (!('IntersectionObserver' in window)) return;

        // Mark elements that should reveal on scroll
        const revealSelectors = [
            '.section-title-container',
            '.title-decoration',
            '.about-text h3',
            '.about-text p',
            '.contact-item',
            '.contact-form',
            '.footer-section',
            // Page heroes (.page-hero-content, .detail-hero) are above the fold and hold
            // the LCP element, so they are deliberately not revealed: hiding them until
            // this script runs delays first paint.
            '.detail-description',
            '.detail-panel',
            '.detail-sidebar',
        ];

        revealSelectors.forEach((sel) => {
            document.querySelectorAll(sel).forEach((el) => {
                if (!el.classList.contains('reveal')) {
                    el.classList.add('reveal');
                }
            });
        });

        // Left/right variants for about section
        const aboutImage = document.querySelector('.about-image');
        if (aboutImage) {
            aboutImage.classList.add('reveal', 'reveal--left');
        }
        const aboutText = document.querySelector('.about-text');
        if (aboutText) {
            aboutText.classList.add('reveal', 'reveal--right');
        }

        // Stagger grids
        const staggerTargets = [
            '.apps-grid',
            '.games-grid',
            '.catalog-grid',
            '.detail-card-grid',
            '.contact-info',
            '.footer-content',
        ];

        staggerTargets.forEach((sel) => {
            const container = document.querySelector(sel);
            if (!container) return;
            container.classList.add('stagger-children');
            Array.from(container.children).forEach((child) => {
                child.classList.add('reveal');
            });
        });

        // Observer for all .reveal elements
        const revealObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        revealObserver.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
        );

        document.querySelectorAll('.reveal').forEach((el) => {
            revealObserver.observe(el);
        });

        // Separate observer for .title-decoration (width animation)
        const decorObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        decorObserver.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.5 }
        );

        document.querySelectorAll('.title-decoration').forEach((el) => {
            decorObserver.observe(el);
        });
    }

    // ── Ripple effect ──────────────────────────────────────────
    function addRipple(event) {
        if (!motionOk()) return;

        const button = event.currentTarget;
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;

        const ripple = document.createElement('span');
        ripple.className = 'ripple-wave';
        ripple.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
        `;

        button.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove());
    }

    function setupRipples() {
        const rippleTargets = [
            '.learn-more',
            '.secondary-link',
            '.back-link',
            '.product-pill--link',
            '.cookie-btn',
        ];

        rippleTargets.forEach((sel) => {
            document.querySelectorAll(sel).forEach((el) => {
                el.classList.add('ripple-host');
                el.addEventListener('click', addRipple);
            });
        });
    }

    // Active nav link: rendered as aria-current="page" in _includes/header.html
    // and styled in styles.css.

    // ── Catalog card accent border on hover ────────────────────
    // The CSS handles the hover, but we also add a subtle top-bar
    // color pulse via a CSS variable update on mouseenter.
    function setupCardAccents() {
        document.querySelectorAll('.catalog-card').forEach((card) => {
            card.addEventListener('mouseenter', () => {
                card.style.setProperty(
                    '--card-glow',
                    `0 0 0 2px color-mix(in srgb, var(--product-accent) 30%, transparent)`
                );
            });
            card.addEventListener('mouseleave', () => {
                card.style.removeProperty('--card-glow');
            });
        });
    }

    // Page transitions are handled in CSS with cross-document View Transitions
    // (@view-transition in animations.css). The old JS fade intercepted every link
    // click, which broke Cmd/Ctrl-click and left pages blank after a bfcache restore.

    // ── Init ───────────────────────────────────────────────────
    function init() {
        if (motionOk()) {
            setupReveal();
            setupRipples();
        }
        setupCardAccents();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
