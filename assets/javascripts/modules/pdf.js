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
            generateResume(areaCv, themeController.isDarkMode(), config);
            setTimeout(removeScaleCv, 1000);
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
        return;
    }

    const target = isDarkMode ? config.dark : config.light;
    const filename = getFileName(target) || (isDarkMode ? 'myResumeCV-dark.pdf' : 'myResumeCV-light.pdf');

    const elementHeight = area.scrollHeight;
    const elementWidth = area.scrollWidth;
    const pageWidth = 210;
    const pageHeight = elementWidth === 0 ? 297 : (elementHeight * pageWidth) / elementWidth;

    const options = {
        margin: 0,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 4, useCORS: true },
        jsPDF: { unit: 'mm', format: [pageWidth, pageHeight], orientation: 'portrait' }
    };

    html2pdf(area, options);
}

function addScaleCv() {
    document.body.classList.add('scale-cv');
}

function removeScaleCv() {
    document.body.classList.remove('scale-cv');
}
