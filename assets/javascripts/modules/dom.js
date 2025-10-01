export function createDomHandles() {
    const selectors = {
        navLogo: document.getElementById('nav-logo'),
        navMenu: document.getElementById('nav-menu'),
        navToggle: document.getElementById('nav-toggle'),
        scrollTop: document.getElementById('scroll-top'),
        homeImage: document.getElementById('home-img'),
        homeName: document.getElementById('home-name'),
        homeHeadline: document.getElementById('home-headline'),
        profileSummary: document.getElementById('profile-summary'),
        downloadButton: document.getElementById('download-button'),
        resumeButton: document.getElementById('resume-button'),
        areaCv: document.getElementById('area-cv'),
        themeButton: document.getElementById('theme-button'),
        apiKeyInput: document.getElementById('api-key-input'),
        jobInput: document.getElementById('job-details-input'),
        customizeButton: document.getElementById('customize-button'),
        resetButton: document.getElementById('reset-button'),
        status: document.getElementById('customizer-status')
    };

    const collections = {
        contacts: document.querySelector('[data-collection="contacts"]'),
        social: document.querySelector('[data-collection="social"]'),
        skills: document.querySelector('[data-collection="skills"]'),
        languages: document.querySelector('[data-collection="languages"]'),
        technologies: document.querySelector('[data-collection="technologies"]'),
        experience: document.querySelector('[data-collection="experience"]'),
        certificates: document.querySelector('[data-collection="certificates"]'),
        education: document.querySelector('[data-collection="education"]'),
        interests: document.querySelector('[data-collection="interests"]')
    };

    const sections = Array.from(document.querySelectorAll('section[id]'));
    const navLinks = Array.from(document.querySelectorAll('.nav_link'));
    const customizeLabel = selectors.customizeButton?.textContent.trim() || 'Generate Tailored Resume';

    return {
        selectors,
        collections,
        sections,
        navLinks,
        customizeLabel
    };
}
