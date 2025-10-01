import { DARK_THEME_CLASS, STORAGE_KEYS } from './constants.js';

export function createThemeController(button, storage) {
    const key = STORAGE_KEYS.darkMode;

    const syncIcon = (isDark) => {
        if (!button) {
            return;
        }
        if (isDark) {
            button.classList.add('fa-sun');
            button.classList.remove('fa-moon');
        } else {
            button.classList.add('fa-moon');
            button.classList.remove('fa-sun');
        }
    };

    const enable = () => {
        document.body.classList.add(DARK_THEME_CLASS);
        syncIcon(true);
        storage.set(key, 'enabled');
    };

    const disable = () => {
        document.body.classList.remove(DARK_THEME_CLASS);
        syncIcon(false);
        storage.set(key, 'disabled');
    };

    const toggle = () => {
        if (isDarkMode()) {
            disable();
        } else {
            enable();
        }
    };

    const applyInitial = () => {
        const stored = storage.get(key);
        if (stored === 'enabled') {
            enable();
        } else {
            syncIcon(isDarkMode());
        }
    };

    const isDarkMode = () => document.body.classList.contains(DARK_THEME_CLASS);

    const init = () => {
        applyInitial();
        if (button) {
            button.addEventListener('click', toggle);
        }
    };

    return {
        init,
        isDarkMode
    };
}
