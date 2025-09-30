(() => {
    'use strict';

    const OPENAI_ENDPOINT = 'https://api.openai.com/v1/responses';
    const OPENAI_MODEL = 'gpt-5';
    const DEFAULT_IMAGE = 'assets/pictures/profile.png';
    const DARK_THEME_CLASS = 'dark-theme';

    const storageKeys = {
        apiKey: 'resumeforge-ai:openai-api-key',
        jobNotes: 'resumeforge-ai:job-details',
        darkMode: 'resumeforge-ai:dark-mode'
    };

    const state = {
        base: null,
        current: null,
        customizing: false,
        customizeLabel: 'Generate Tailored Resume'
    };

    let selectors = {};
    let collections = {};
    let sectionsWithId = [];

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        cacheDom();
        sectionsWithId = [...document.querySelectorAll('section[id]')];
        initNavigation();
        initScrollHandlers();
        initTheme();
        initPdfDownload();
        initCustomizer();
        loadResumeData();
    }

    function cacheDom() {
        selectors = {
            navLogo: document.getElementById('nav-logo'),
            homeImage: document.getElementById('home-img'),
            homeName: document.getElementById('home-name'),
            homeHeadline: document.getElementById('home-headline'),
            profileSummary: document.getElementById('profile-summary'),
            downloadButton: document.getElementById('download-button'),
            resumeButton: document.getElementById('resume-button'),
            areaCv: document.getElementById('area-cv'),
            themeButton: document.getElementById('theme-button'),
            scrollTop: document.getElementById('scroll-top'),
            apiKeyInput: document.getElementById('api-key-input'),
            jobInput: document.getElementById('job-details-input'),
            customizeButton: document.getElementById('customize-button'),
            resetButton: document.getElementById('reset-button'),
            status: document.getElementById('customizer-status')
        };

        collections = {
            contacts: document.querySelector('[data-collection="contacts"]'),
            social: document.querySelector('[data-collection="social"]'),
            skills: document.querySelector('[data-collection="skills"]'),
            languages: document.querySelector('[data-collection="languages"]'),
            experience: document.querySelector('[data-collection="experience"]'),
            certificates: document.querySelector('[data-collection="certificates"]'),
            education: document.querySelector('[data-collection="education"]'),
            interests: document.querySelector('[data-collection="interests"]')
        };

        if (selectors.customizeButton) {
            state.customizeLabel = selectors.customizeButton.textContent.trim() || state.customizeLabel;
        }
    }

    function initNavigation() {
        const navToggle = document.getElementById('nav-toggle');
        const navMenu = document.getElementById('nav-menu');

        if (navToggle && navMenu) {
            navToggle.addEventListener('click', () => navMenu.classList.toggle('show-menu'));
        }

        document.querySelectorAll('.nav_link').forEach((link) => {
            link.addEventListener('click', () => {
                navMenu?.classList.remove('show-menu');
            });
        });
    }

    function initScrollHandlers() {
        const handleScroll = () => {
            const scrollY = window.pageYOffset;

            sectionsWithId.forEach((section) => {
                const sectionHeight = section.offsetHeight;
                const sectionTop = section.offsetTop - 50;
                const sectionId = section.getAttribute('id');
                const navLink = document.querySelector(`.nav_menu a[href*="${sectionId}"]`);

                if (!navLink) return;

                if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                    navLink.classList.add('active-link');
                } else {
                    navLink.classList.remove('active-link');
                }
            });

            if (selectors.scrollTop) {
                if (scrollY >= 200) {
                    selectors.scrollTop.classList.add('show-scroll');
                } else {
                    selectors.scrollTop.classList.remove('show-scroll');
                }
            }
        };

        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
    }

    function initTheme() {
        const button = selectors.themeButton;
        if (!button) return;

        if (localStorage.getItem(storageKeys.darkMode) === 'enabled') {
            enableDarkMode(button);
        }

        button.addEventListener('click', () => {
            if (document.body.classList.contains(DARK_THEME_CLASS)) {
                disableDarkMode(button);
            } else {
                enableDarkMode(button);
            }
        });
    }

    function enableDarkMode(button) {
        document.body.classList.add(DARK_THEME_CLASS);
        button.classList.add('fa-sun');
        button.classList.remove('fa-moon');
        localStorage.setItem(storageKeys.darkMode, 'enabled');
    }

    function disableDarkMode(button) {
        document.body.classList.remove(DARK_THEME_CLASS);
        button.classList.add('fa-moon');
        button.classList.remove('fa-sun');
        localStorage.setItem(storageKeys.darkMode, 'disabled');
    }

    function isDarkMode() {
        return document.body.classList.contains(DARK_THEME_CLASS);
    }

    function initPdfDownload() {
        if (selectors.downloadButton) {
            selectors.downloadButton.addEventListener('click', () => {
                const targetPath = isDarkMode()
                    ? selectors.downloadButton.dataset.dark
                    : selectors.downloadButton.dataset.light;
                selectors.downloadButton.href = targetPath || '#';
            });
        }

        if (selectors.resumeButton && selectors.areaCv) {
            selectors.resumeButton.addEventListener('click', () => {
                addScaleCv();
                generateResume();
                setTimeout(removeScaleCv, 1000);
            });
        }
    }

    function loadResumeData() {
        fetch('assets/data/candidate.json', { cache: 'no-store' })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Failed to load resume data (${response.status})`);
                }
                return response.json();
            })
            .then((data) => {
                state.base = deepClone(data);
                renderResume(data);
            })
            .catch((error) => {
                console.error('Resume data load failed:', error);
                updateStatus('Unable to load base resume. Check the console for details.', true);
            });
    }

    function renderResume(data) {
        if (!data || typeof data !== 'object') return;
        state.current = deepClone(data);

        const profile = data.profile || {};

        if (selectors.navLogo) {
            selectors.navLogo.textContent = profile.shortName || profile.fullName || 'Resume';
        }

        if (selectors.homeImage) {
            selectors.homeImage.src = profile.image || DEFAULT_IMAGE;
            selectors.homeImage.alt = `${profile.fullName || 'Candidate'} profile picture`;
        }

        if (selectors.homeName) {
            selectors.homeName.textContent = profile.formattedName || profile.fullName || '';
        }

        if (selectors.homeHeadline) {
            selectors.homeHeadline.textContent = profile.headline || '';
        }

        if (selectors.profileSummary) {
            selectors.profileSummary.textContent = profile.summary || '';
        }

        updateDownloadLinks(profile.download);

        renderCollection(collections.contacts, data.contact, renderContactItem);
        renderCollection(collections.social, data.social, renderSocialItem);
        renderCollection(collections.skills, data.skills, renderSkillItem);
        renderCollection(collections.languages, data.languages, renderLanguageItem);
        renderCollection(collections.experience, data.experience, renderExperienceItem);
        renderCollection(collections.certificates, data.certificates, renderCertificateItem);
        renderCollection(collections.education, data.education, renderEducationItem);
        renderCollection(collections.interests, data.interests, renderInterestItem);
    }

    function updateDownloadLinks(downloadConfig = {}) {
        if (!selectors.downloadButton) return;
        selectors.downloadButton.dataset.light = downloadConfig.light || 'assets/pdf/myResumeCV-light.pdf';
        selectors.downloadButton.dataset.dark = downloadConfig.dark || 'assets/pdf/myResumeCV-dark.pdf';
    }

    function renderCollection(container, items, renderer) {
        if (!container) return;
        container.innerHTML = '';

        if (!Array.isArray(items) || !items.length) {
            return;
        }

        items.forEach((item, index) => {
            const node = renderer(item, index, items.length);
            if (node) {
                container.appendChild(node);
            }
        });
    }

    function renderContactItem(item) {
        const span = document.createElement('span');
        span.className = 'home_information';

        const icon = document.createElement('i');
        icon.className = `${item?.icon || 'fa-solid fa-circle-dot'} home_icon`;
        span.appendChild(icon);

        if (item?.href) {
            const link = document.createElement('a');
            link.className = 'home_link';
            link.href = item.href;
            link.textContent = item.label || '';
            span.appendChild(link);
        } else {
            span.appendChild(document.createTextNode(` ${item?.label || ''}`));
        }

        return span;
    }

    function renderSocialItem(item) {
        if (!item) return null;
        const link = document.createElement('a');
        link.className = 'social_link';
        link.href = item.href || '#';
        link.target = '_blank';
        link.rel = 'noopener';

        const icon = document.createElement('i');
        icon.className = `${item.icon || 'fa-solid fa-globe'} social_icon`;
        link.appendChild(icon);

        link.appendChild(document.createTextNode(` ${item.label || ''}`));
        return link;
    }

    function renderSkillItem(item) {
        if (!item) return null;
        const wrapper = document.createElement('div');
        wrapper.className = 'skills_name';

        const title = document.createElement('span');
        title.className = 'skills_text';
        title.textContent = item.name || '';
        if (Array.isArray(item.keywords) && item.keywords.length) {
            title.title = item.keywords.join(', ');
        }

        const box = document.createElement('div');
        box.className = 'skills_box';
        const progress = document.createElement('span');
        progress.className = 'skills_progress';
        const level = Math.max(0, Math.min(100, Number(item.level) || 0));
        progress.style.width = `${level}%`;
        box.appendChild(progress);

        wrapper.appendChild(title);
        wrapper.appendChild(box);
        return wrapper;
    }

    function renderLanguageItem(item) {
        if (!item) return null;
        const wrapper = document.createElement('div');
        wrapper.className = 'languages_content';

        const label = document.createElement('span');
        label.className = 'languages_text';
        label.textContent = item.name || '';
        if (item.level) {
            label.title = item.level;
        }

        const stars = document.createElement('div');
        stars.className = 'languages_stars';
        const rating = Math.max(0, Math.min(5, Number(item.rating) || 0));
        for (let i = 1; i <= 5; i += 1) {
            const star = document.createElement('i');
            if (i <= rating) {
                star.className = 'fa-solid fa-star';
            } else {
                star.className = 'fa-regular fa-star languages_stars_checked';
            }
            stars.appendChild(star);
        }

        wrapper.appendChild(label);
        wrapper.appendChild(stars);
        return wrapper;
    }

    function renderExperienceItem(item, index, total) {
        if (!item) return null;
        const wrapper = document.createElement('div');
        wrapper.className = 'experience_content';

        const time = document.createElement('div');
        time.className = 'experience_time';

        const rounder = document.createElement('span');
        rounder.className = 'experience_rounder';
        time.appendChild(rounder);

        if (index < total - 1) {
            const line = document.createElement('span');
            line.className = 'experience_line';
            time.appendChild(line);
        }

        const data = document.createElement('div');
        data.className = 'experience_data bd-grid';

        const title = document.createElement('h3');
        title.className = 'experience_title';
        title.textContent = item.title || '';
        data.appendChild(title);

        const company = document.createElement('span');
        company.className = 'experience_company';
        const companyParts = [item.employmentType, item.company, item.location].filter(Boolean);
        company.textContent = companyParts.join(' | ');
        data.appendChild(company);

        const year = document.createElement('span');
        year.className = 'experience_year';
        year.textContent = formatDateRange(item.start, item.end);
        data.appendChild(year);

        if (item.summary) {
            const summary = document.createElement('p');
            summary.className = 'experience_description';
            summary.textContent = item.summary;
            data.appendChild(summary);
        }

        if (Array.isArray(item.highlights) && item.highlights.length) {
            const list = document.createElement('ul');
            list.className = 'experience_highlights';
            item.highlights.forEach((highlight) => {
                const li = document.createElement('li');
                li.textContent = highlight;
                list.appendChild(li);
            });
            data.appendChild(list);
        }

        wrapper.appendChild(time);
        wrapper.appendChild(data);
        return wrapper;
    }

    function renderCertificateItem(item) {
        if (!item) return null;
        const wrapper = document.createElement('div');
        wrapper.className = 'certificate_content';

        const itemWrapper = document.createElement('div');
        itemWrapper.className = 'certificate_item';
        const rounder = document.createElement('span');
        rounder.className = 'certificate_rounder';
        itemWrapper.appendChild(rounder);

        const data = document.createElement('div');
        data.className = 'certificate_data bd-grid';

        const year = document.createElement('h3');
        year.className = 'certificate_year';
        year.textContent = item.year || '';
        data.appendChild(year);

        const title = document.createElement('span');
        title.className = 'certificate_title';
        title.appendChild(document.createTextNode(item.title || ''));
        if (item.honours) {
            title.appendChild(document.createTextNode(' '));
            const honours = document.createElement('span');
            honours.className = 'certificate_honours';
            honours.textContent = item.honours;
            title.appendChild(honours);
        }
        data.appendChild(title);

        wrapper.appendChild(itemWrapper);
        wrapper.appendChild(data);
        return wrapper;
    }

    function renderEducationItem(item, index, total) {
        if (!item) return null;
        const wrapper = document.createElement('div');
        wrapper.className = 'education_content';

        const time = document.createElement('div');
        time.className = 'education_time';
        const rounder = document.createElement('span');
        rounder.className = 'education_rounder';
        time.appendChild(rounder);
        if (index < total - 1) {
            const line = document.createElement('span');
            line.className = 'education_line';
            time.appendChild(line);
        }

        const data = document.createElement('div');
        data.className = 'education_data bd-grid';

        const title = document.createElement('h3');
        title.className = 'education_title';
        title.textContent = item.title || '';
        data.appendChild(title);

        const studies = document.createElement('span');
        studies.className = 'education_studies';
        studies.textContent = item.institution || '';
        data.appendChild(studies);

        const year = document.createElement('span');
        year.className = 'education_year';
        year.textContent = item.years || '';
        data.appendChild(year);

        wrapper.appendChild(time);
        wrapper.appendChild(data);
        return wrapper;
    }

    function renderInterestItem(item) {
        if (!item) return null;
        const wrapper = document.createElement('div');
        wrapper.className = 'interests_content';

        const icon = document.createElement('i');
        icon.className = `${item.icon || 'fa-solid fa-star'} interests_icon`;
        wrapper.appendChild(icon);

        const label = document.createElement('span');
        label.className = 'interests_name';
        label.textContent = item.label || '';
        wrapper.appendChild(label);

        return wrapper;
    }

    function initCustomizer() {
        if (!selectors.customizeButton || !selectors.jobInput) return;

        const storedKey = localStorage.getItem(storageKeys.apiKey);
        if (storedKey && selectors.apiKeyInput) {
            selectors.apiKeyInput.value = storedKey;
        }

        const storedJob = localStorage.getItem(storageKeys.jobNotes);
        if (storedJob) {
            selectors.jobInput.value = storedJob;
        }

        if (selectors.apiKeyInput) {
            selectors.apiKeyInput.addEventListener('change', (event) => {
                const value = event.target.value.trim();
                if (value) {
                    localStorage.setItem(storageKeys.apiKey, value);
                } else {
                    localStorage.removeItem(storageKeys.apiKey);
                }
            });
        }

        selectors.jobInput.addEventListener('input', (event) => {
            localStorage.setItem(storageKeys.jobNotes, event.target.value);
        });

        selectors.customizeButton.addEventListener('click', handleCustomizeClick);
        selectors.resetButton?.addEventListener('click', handleResetClick);
    }

    function handleResetClick() {
        if (!state.base) {
            updateStatus('Base resume not loaded yet.', true);
            return;
        }
        renderResume(deepClone(state.base));
        updateStatus('Resume reset to the base profile.');
    }

    async function handleCustomizeClick() {
        if (state.customizing) return;
        if (!state.current) {
            updateStatus('Load the base resume before tailoring.', true);
            return;
        }

        const apiKey = getApiKey();
        if (!apiKey) {
            updateStatus('Enter your OpenAI API key to continue.', true);
            selectors.apiKeyInput?.focus();
            return;
        }

        const jobDetails = selectors.jobInput.value.trim();
        if (jobDetails.length < 40) {
            updateStatus('Add more job details (at least 40 characters).', true);
            selectors.jobInput.focus();
            return;
        }

        setCustomizeLoading(true);
        updateStatus('Generating tailored resume with GPT-5...');

        try {
            const tailored = await fetchTailoredResume(apiKey, jobDetails);
            const normalized = normalizeResume(tailored);
            renderResume(normalized);
            updateStatus('Tailored resume ready. Review and adjust before exporting.');
        } catch (error) {
            console.error('Tailoring failed:', error);
            updateStatus(error.message || 'Tailoring failed. Check the console for details.', true);
        } finally {
            setCustomizeLoading(false);
        }
    }

    function getApiKey() {
        const direct = selectors.apiKeyInput?.value.trim();
        if (direct) {
            localStorage.setItem(storageKeys.apiKey, direct);
            return direct;
        }
        const stored = localStorage.getItem(storageKeys.apiKey);
        return stored ? stored.trim() : '';
    }

    function setCustomizeLoading(isLoading) {
        state.customizing = isLoading;
        if (!selectors.customizeButton) return;
        selectors.customizeButton.disabled = isLoading;
        selectors.customizeButton.textContent = isLoading ? 'Generating...' : state.customizeLabel;
        selectors.resetButton && (selectors.resetButton.disabled = isLoading);
    }

    async function fetchTailoredResume(apiKey, jobDetails) {
        const payload = {
            model: OPENAI_MODEL,
            input: buildTailorPrompt(jobDetails),
            reasoning: { effort: 'high' },
            text: { verbosity: 'medium' },
            max_output_tokens: 8000
        };

        const response = await fetch(OPENAI_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            let message = `OpenAI request failed (${response.status})`;
            try {
                const errorPayload = await response.json();
                message = errorPayload?.error?.message || message;
            } catch (error) {
                // Ignore JSON parse errors for the error payload.
            }
            throw new Error(message);
        }

        const data = await response.json();
        const content = extractResponseText(data);
        if (!content) {
            throw new Error('Empty response from GPT-5.');
        }
        return extractJson(content);
    }

    function buildTailorPrompt(jobDetails) {
        const baseResume = JSON.stringify(state.current || state.base || {}, null, 2);
        return [
            'Job description:',
            jobDetails,
            '',
            'Base resume JSON:',
            baseResume,
            '',
            'Instructions:',
            '- Respond with JSON following the same keys (profile, contact, social, skills, languages, experience, certificates, education, interests).',
            '- Update achievements, skills, and summaries to align with the job while staying truthful to the base profile.',
            '- Keep wording concise, ATS-friendly, and metric-driven where possible.',
            '- Preserve download paths if you do not supply replacements.',
            '- Do not add explanations or markdown around the JSON output.'
        ].join('\n');
    }

    function extractResponseText(payload) {
        if (!payload || typeof payload !== 'object') return '';

        if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
            return payload.output_text.trim();
        }

        const output = payload.output;
        if (Array.isArray(output)) {
            for (const item of output) {
                const chunks = Array.isArray(item?.content) ? item.content : [];
                for (const chunk of chunks) {
                    if (!chunk || typeof chunk !== 'object') continue;
                    if (chunk.type === 'output_text') {
                        const nested = chunk.text;
                        const value = nested && typeof nested.value === 'string' ? nested.value : '';
                        if (value.trim()) {
                            return value.trim();
                        }
                    }
                    if (typeof chunk.text === 'string' && chunk.text.trim()) {
                        return chunk.text.trim();
                    }
                }
            }
        }

        if (typeof payload.result === 'string' && payload.result.trim()) {
            return payload.result.trim();
        }

        return '';
    }

    function extractJson(content) {
        const trimmed = content.trim();
        const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]+?)\s*```/i);
        const jsonSource = codeBlockMatch ? codeBlockMatch[1] : trimmed;
        const start = jsonSource.indexOf('{');
        const end = jsonSource.lastIndexOf('}');
        if (start === -1 || end === -1 || end <= start) {
            throw new Error('Model response did not include a JSON object.');
        }
        const jsonString = jsonSource.slice(start, end + 1);
        return JSON.parse(jsonString);
    }

    function normalizeResume(tailored) {
        const base = deepClone(state.current || state.base || {});
        if (!tailored || typeof tailored !== 'object') {
            return base;
        }

        const clone = deepClone(tailored);
        const sections = ['profile', 'contact', 'social', 'skills', 'languages', 'experience', 'certificates', 'education', 'interests'];

        sections.forEach((key) => {
            const incoming = clone[key];
            if (Array.isArray(incoming)) {
                base[key] = incoming;
            } else if (isPlainObject(incoming)) {
                base[key] = { ...(base[key] || {}), ...incoming };
            } else if (incoming !== undefined) {
                base[key] = incoming;
            }
        });

        return base;
    }

    function updateStatus(message, isError = false) {
        if (!selectors.status) return;
        selectors.status.textContent = message;
        selectors.status.classList.toggle('customizer_status--error', Boolean(isError));
    }

    function addScaleCv() {
        document.body.classList.add('scale-cv');
    }

    function removeScaleCv() {
        document.body.classList.remove('scale-cv');
    }

    function generateResume() {
        if (typeof html2pdf === 'undefined' || !selectors.areaCv) return;
        const downloadConfig = state.current?.profile?.download || state.base?.profile?.download || {};
        const path = isDarkMode() ? downloadConfig.dark : downloadConfig.light;
        const filename = getFileName(path) || (isDarkMode() ? 'myResumeCV-dark.pdf' : 'myResumeCV-light.pdf');

        // Get the actual height of the content
        const element = selectors.areaCv;
        const elementHeight = element.scrollHeight;
        const elementWidth = element.scrollWidth;
        
        // Calculate dimensions in mm (A4 width is 210mm)
        const pageWidth = 210;
        const pageHeight = (elementHeight * pageWidth) / elementWidth;

        const options = {
            margin: 0,
            filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 4, useCORS: true },
            jsPDF: { unit: 'mm', format: [pageWidth, pageHeight], orientation: 'portrait' }
        };

        html2pdf(selectors.areaCv, options);
    }

    function getFileName(path) {
        if (!path || typeof path !== 'string') return '';
        return path.split('/').pop();
    }

    function formatDateRange(start, end) {
        if (!start && !end) return '';
        if (!start) return end || '';
        if (!end) return start;
        return `${start} - ${end}`;
    }

    function deepClone(value) {
        if (typeof structuredClone === 'function') {
            return structuredClone(value);
        }
        return JSON.parse(JSON.stringify(value));
    }

    function isPlainObject(value) {
        return Object.prototype.toString.call(value) === '[object Object]';
    }
})();



