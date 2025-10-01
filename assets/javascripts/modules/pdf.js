import { DOWNLOAD_FALLBACKS } from './constants.js';
import { getFileName } from './utils.js';

export function initPdfDownload(elements, themeController, getDownloadConfig) {
    const { downloadButton, resumeButton, areaCv } = elements;

    if (downloadButton) {
        downloadButton.addEventListener('click', () => {
            const config = normalizeDownloadConfig(getDownloadConfig());
            const target = themeController.isDarkMode() ? config.dark : config.light;
            downloadButton.href = target || '#';
        });
    }

    if (resumeButton && areaCv) {
        resumeButton.addEventListener('click', () => {
            addScaleCv();
            const config = normalizeDownloadConfig(getDownloadConfig());
            const isDark = themeController.isDarkMode();

            Promise.resolve(generateResume(areaCv, isDark, config))
                .catch((error) => {
                    console.error('PDF export failed:', error);
                })
                .finally(() => {
                    removeScaleCv();
                });
        });
    }
}

function normalizeDownloadConfig(config) {
    return {
        light: config?.light || DOWNLOAD_FALLBACKS.light,
        dark: config?.dark || DOWNLOAD_FALLBACKS.dark
    };
}

function generateResume(area, isDarkMode, config) {
    if (typeof html2pdf === 'undefined') {
        return Promise.reject(new Error('html2pdf is not available.'));
    }

    if (!area) {
        return Promise.reject(new Error('Resume element is not available.'));
    }

    const target = isDarkMode ? config.dark : config.light;
    const filename = getFileName(target) || (isDarkMode ? 'myResumeCV-dark.pdf' : 'myResumeCV-light.pdf');

    const rect = area.getBoundingClientRect();
    const measuredWidth = Math.ceil(Math.max(rect.width, area.scrollWidth, area.offsetWidth, 1));
    const measuredHeight = Math.ceil(Math.max(rect.height, area.scrollHeight, area.offsetHeight, 1));
    const pageWidth = 210;
    const ratio = measuredHeight / measuredWidth;
    const pageHeight = ratio > 0 ? Math.max(pageWidth * ratio, 297) : 297;

    const windowWidth = Math.max(document.documentElement.clientWidth, measuredWidth);
    const windowHeight = Math.max(document.documentElement.clientHeight, measuredHeight);

    const options = {
        margin: 0,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 4,
            useCORS: true,
            width: measuredWidth,
            height: measuredHeight,
            windowWidth,
            windowHeight
        },
        jsPDF: { unit: 'mm', format: [pageWidth, pageHeight], orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
    };

    return waitForInlineImages(area).then(() => html2pdf().set(options).from(area).save());
}

function addScaleCv() {
    document.body.classList.add('scale-cv');
}

function removeScaleCv() {
    document.body.classList.remove('scale-cv');
}


function waitForInlineImages(root) {
    const pending = Array.from(root.querySelectorAll('img[data-inline-pending="true"]'))
        .map((image) => image.__inlinePromise)
        .filter((promise) => promise && typeof promise.then === 'function');

    if (!pending.length) {
        return Promise.resolve();
    }

    return Promise.allSettled(pending).then(() => undefined);
}
