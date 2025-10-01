export function deepClone(value) {
    if (value === undefined) {
        return undefined;
    }

    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }

    return JSON.parse(JSON.stringify(value));
}

export function isPlainObject(value) {
    if (value === null || typeof value !== 'object') {
        return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

export function formatDateRange(start, end) {
    if (!start && !end) {
        return '';
    }
    if (!start) {
        return end || '';
    }
    if (!end) {
        return start;
    }
    return `${start} - ${end}`;
}

export function getFileName(path) {
    if (!path || typeof path !== 'string') {
        return '';
    }
    const segments = path.split('/');
    return segments[segments.length - 1] || '';
}

export function clampNumber(value, minimum, maximum) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
        return minimum;
    }
    return Math.min(Math.max(number, minimum), maximum);
}

export function toArray(value) {
    if (Array.isArray(value)) {
        return value;
    }
    if (value === undefined || value === null) {
        return [];
    }
    return [value];
}
