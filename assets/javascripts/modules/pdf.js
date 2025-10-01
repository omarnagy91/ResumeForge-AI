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
            allowTaint: false,
            width: measuredWidth,
            height: measuredHeight,
            windowWidth,
            windowHeight,
            logging: false
        },
        jsPDF: { unit: 'mm', format: [pageWidth, pageHeight], orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
    };

    // With Font Awesome icons, we don't need any image conversion! Just generate the PDF directly.
    console.log('📄 Generating PDF with Font Awesome icons...');
    return html2pdf().set(options).from(area).save()
        .then(() => {
            console.log('✅ PDF generated successfully!');
        })
        .catch((error) => {
            console.error('❌ PDF generation failed:', error);
            throw error;
        });
}

function addScaleCv() {
    document.body.classList.add('scale-cv');
}

function removeScaleCv() {
    document.body.classList.remove('scale-cv');
}
