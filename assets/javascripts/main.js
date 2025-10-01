import { createDomHandles } from './modules/dom.js';
import { createResumeState } from './modules/state.js';
import { createStorage } from './modules/storage.js';
import { createStatusReporter } from './modules/status.js';
import { createThemeController } from './modules/theme.js';
import { initNavigation, initScrollSpy } from './modules/navigation.js';
import { initPdfDownload } from './modules/pdf.js';
import { loadResumeData } from './modules/resumeData.js';
import { createResumeRenderer } from './modules/resumeRenderer.js';
import { createCustomizer } from './modules/customizer.js';

(() => {
    'use strict';

    document.addEventListener('DOMContentLoaded', bootstrap);

    function bootstrap() {
        const dom = createDomHandles();
        const storage = createStorage();
        const state = createResumeState(dom.customizeLabel);
        const statusReporter = createStatusReporter(dom.selectors.status);
        const themeController = createThemeController(dom.selectors.themeButton, storage);
        const { renderResume, getDownloadConfig } = createResumeRenderer(dom.selectors, dom.collections, state);
        const customizer = createCustomizer({ selectors: dom.selectors, state, storage, renderResume, statusReporter });

        themeController.init();
        initNavigation({
            navToggle: dom.selectors.navToggle,
            navMenu: dom.selectors.navMenu,
            navLinks: dom.navLinks
        });
        initScrollSpy(dom.sections, {
            navMenu: dom.selectors.navMenu,
            scrollTop: dom.selectors.scrollTop
        });
        initPdfDownload(
            {
                downloadButton: dom.selectors.downloadButton,
                resumeButton: dom.selectors.resumeButton,
                areaCv: dom.selectors.areaCv
            },
            themeController,
            () => getDownloadConfig()
        );
        customizer.init();

        loadResumeData()
            .then((data) => {
                state.setBase(data);
                renderResume(data);
            })
            .catch((error) => {
                console.error('Resume data load failed:', error);
                statusReporter.update('Unable to load base resume. Check the console for details.', true);
            });
    }
})();
