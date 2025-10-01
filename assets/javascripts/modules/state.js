import { deepClone } from './utils.js';

export function createResumeState(initialLabel = 'Generate Tailored Resume') {
    let base = null;
    let current = null;
    let customizing = false;
    let customizeLabel = initialLabel;

    return {
        setBase(data) {
            base = deepClone(data);
        },
        getBase() {
            return deepClone(base);
        },
        hasBase() {
            return base !== null;
        },
        setCurrent(data) {
            current = deepClone(data);
        },
        getCurrent() {
            return deepClone(current);
        },
        resetToBase() {
            if (base === null) {
                return null;
            }
            current = deepClone(base);
            return deepClone(current);
        },
        isCustomizing() {
            return customizing;
        },
        setCustomizing(value) {
            customizing = Boolean(value);
        },
        getCustomizeLabel() {
            return customizeLabel;
        },
        setCustomizeLabel(label) {
            if (label) {
                customizeLabel = label;
            }
        }
    };
}
