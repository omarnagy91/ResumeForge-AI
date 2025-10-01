import { DEFAULT_IMAGE, DOWNLOAD_FALLBACKS } from './constants.js';
import { resolveImageSource } from './imageCache.js';
import { clampNumber, deepClone, formatDateRange, isPlainObject } from './utils.js';

export function createResumeRenderer(selectors, collections, state) {
    const renderResume = (data) => {
        if (!data || typeof data !== 'object') {
            return;
        }

        state.setCurrent(data);
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
        renderCollection(collections.technologies, data.technologies, renderTechnologyItem);
        renderCollection(collections.experience, data.experience, renderExperienceItem);
        renderCollection(collections.certificates, data.certificates, renderCertificateItem);
        renderCollection(collections.education, data.education, renderEducationItem);
        renderCollection(collections.interests, data.interests, renderInterestItem);
    };

    const updateDownloadLinks = (downloadConfig = {}) => {
        if (!selectors.downloadButton) {
            return;
        }
        selectors.downloadButton.dataset.light = downloadConfig.light || DOWNLOAD_FALLBACKS.light;
        selectors.downloadButton.dataset.dark = downloadConfig.dark || DOWNLOAD_FALLBACKS.dark;
    };

    const getDownloadConfig = () => {
        const current = state.getCurrent() || {};
        const base = state.getBase() || {};
        return current.profile?.download || base.profile?.download || DOWNLOAD_FALLBACKS;
    };

    return {
        renderResume,
        getDownloadConfig
    };
}

export function normalizeResume(stateSnapshot, tailored) {
    const base = deepClone(stateSnapshot.current || stateSnapshot.base || {});
    if (!tailored || typeof tailored !== 'object') {
        return base;
    }

    const clone = deepClone(tailored);
    const sections = [
        'profile',
        'contact',
        'social',
        'skills',
        'languages',
        'technologies',
        'experience',
        'certificates',
        'education',
        'interests'
    ];

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

function renderCollection(container, items, renderer) {
    if (!container) {
        return;
    }

    container.innerHTML = '';

    if (!Array.isArray(items) || items.length === 0) {
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
    if (!item) {
        return null;
    }
    const wrapper = document.createElement('span');
    wrapper.className = 'home_information';

    const icon = document.createElement('i');
    icon.className = `${item.icon || 'fa-solid fa-circle-dot'} home_icon`;
    wrapper.appendChild(icon);

    if (item.href) {
        const link = document.createElement('a');
        link.className = 'home_link';
        link.href = item.href;
        link.textContent = item.label || '';
        wrapper.appendChild(link);
    } else {
        wrapper.appendChild(document.createTextNode(` ${item.label || ''}`));
    }

    return wrapper;
}

function renderSocialItem(item) {
    if (!item) {
        return null;
    }
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
    if (!item) {
        return null;
    }
    const data = typeof item === 'string' ? { name: item } : item;
    if (!data || !data.name) {
        return null;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'skills_name';

    const title = document.createElement('span');
    title.className = 'skills_text';
    title.textContent = data.name || '';
    if (Array.isArray(data.keywords) && data.keywords.length) {
        title.title = data.keywords.join(', ');
    }
    wrapper.appendChild(title);

    const box = document.createElement('div');
    box.className = 'skills_box';
    const progress = document.createElement('span');
    progress.className = 'skills_progress';
    const hasLevel = data.level !== undefined || data.percent !== undefined || data.score !== undefined;
    const level = clampNumber(data.level ?? data.percent ?? data.score ?? 100, 0, 100);
    progress.style.width = `${level}%`;
    if (!hasLevel) {
        progress.style.opacity = '0.35';
    }
    box.appendChild(progress);
    wrapper.appendChild(box);

    return wrapper;
}

function renderLanguageItem(item) {
    if (!item) {
        return null;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'languages_content';

    const label = document.createElement('span');
    label.className = 'languages_text';
    label.textContent = item.name || '';
    if (item.level) {
        label.title = item.level;
    }
    wrapper.appendChild(label);

    const stars = document.createElement('div');
    stars.className = 'languages_stars';
    const rating = clampNumber(item.rating ?? 0, 0, 5);
    for (let index = 1; index <= 5; index += 1) {
        const star = document.createElement('i');
        star.className = index <= rating ? 'fa-solid fa-star' : 'fa-regular fa-star languages_stars_checked';
        stars.appendChild(star);
    }
    wrapper.appendChild(stars);

    return wrapper;
}

function renderExperienceItem(item, index, total) {
    if (!item) {
        return null;
    }

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
            const listItem = document.createElement('li');
            listItem.textContent = highlight;
            list.appendChild(listItem);
        });
        data.appendChild(list);
    }

    wrapper.appendChild(time);
    wrapper.appendChild(data);
    return wrapper;
}

function renderCertificateItem(item) {
    if (!item) {
        return null;
    }

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
    if (!item) {
        return null;
    }

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

function renderTechnologyItem(item) {
    if (!item) {
        return null;
    }

    const data = typeof item === 'string' ? { name: item } : item;
    if (!data || (!data.name && !data.icon)) {
        return null;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'technologies_item';

    if (data.icon) {
        const iconUrl = data.icon;
        const icon = document.createElement('img');
        icon.className = 'technologies_icon';
        icon.alt = `${data.name || 'Technology'} logo`;
        icon.loading = 'lazy';
        icon.dataset.originalSrc = iconUrl;

        if (typeof iconUrl === 'string' && !iconUrl.startsWith('data:')) {
            icon.crossOrigin = 'anonymous';
        }

        icon.dataset.inlinePending = 'true';
        icon.src = iconUrl;
        wrapper.appendChild(icon);

        const inlinePromise = resolveImageSource(iconUrl)
            .then((inlineSrc) => {
                if (!inlineSrc) {
                    return;
                }
                if (icon.dataset.originalSrc !== iconUrl) {
                    return;
                }
                if (inlineSrc !== iconUrl) {
                    icon.src = inlineSrc;
                    icon.removeAttribute('crossorigin');
                }
            })
            .catch(() => {})
            .finally(() => {
                icon.dataset.inlinePending = 'false';
                delete icon.__inlinePromise;
            });

        icon.__inlinePromise = inlinePromise;

        icon.__inlinePromise = inlinePromise;
    }

    const label = document.createElement('span');
    label.className = 'technologies_name';
    label.textContent = data.name || '';
    wrapper.appendChild(label);

    return wrapper;
}

function renderInterestItem(item) {
    if (!item) {
        return null;
    }

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
