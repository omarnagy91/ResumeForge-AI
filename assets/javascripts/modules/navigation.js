import { NAV_SECTION_OFFSET, SCROLL_TOP_THRESHOLD } from './constants.js';

export function initNavigation({ navToggle, navMenu, navLinks }) {
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('show-menu');
        });
    }

    if (Array.isArray(navLinks) && navMenu) {
        navLinks.forEach((link) => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('show-menu');
            });
        });
    }
}

export function initScrollSpy(sections, { navMenu, scrollTop }) {
    if (!Array.isArray(sections) || sections.length === 0) {
        return;
    }

    const resolveNavLink = (sectionId) => {
        if (!sectionId) {
            return null;
        }
        if (navMenu) {
            return navMenu.querySelector(`a[href*="${sectionId}"]`);
        }
        return document.querySelector(`.nav_menu a[href*="${sectionId}"]`);
    };

    const onScroll = () => {
        const scrollY = window.pageYOffset;

        sections.forEach((section) => {
            const sectionHeight = section.offsetHeight;
            const sectionTop = section.offsetTop - NAV_SECTION_OFFSET;
            const sectionId = section.getAttribute('id');
            const navLink = resolveNavLink(sectionId);

            if (!navLink) {
                return;
            }

            if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                navLink.classList.add('active-link');
            } else {
                navLink.classList.remove('active-link');
            }
        });

        if (scrollTop) {
            if (scrollY >= SCROLL_TOP_THRESHOLD) {
                scrollTop.classList.add('show-scroll');
            } else {
                scrollTop.classList.remove('show-scroll');
            }
        }
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
}
