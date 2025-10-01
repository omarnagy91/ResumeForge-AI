export function createStorage() {
    const storage = typeof window !== 'undefined' ? window.localStorage : undefined;

    return {
        get(key, fallback = '') {
            if (!storage) {
                return fallback;
            }
            try {
                const value = storage.getItem(key);
                return value === null ? fallback : value;
            } catch (error) {
                return fallback;
            }
        },
        set(key, value) {
            if (!storage) {
                return;
            }
            try {
                if (value === undefined || value === null || value === '') {
                    storage.removeItem(key);
                } else {
                    storage.setItem(key, value);
                }
            } catch (error) {
                // Ignore storage quota errors.
            }
        },
        remove(key) {
            if (!storage) {
                return;
            }
            try {
                storage.removeItem(key);
            } catch (error) {
                // Ignore storage removal errors.
            }
        }
    };
}
