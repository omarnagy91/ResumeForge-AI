const inlineCache = new Map();

export function resolveImageSource(source) {
    if (typeof source !== 'string' || !source.trim()) {
        return Promise.resolve(source);
    }

    const trimmed = source.trim();
    if (trimmed.startsWith('data:')) {
        return Promise.resolve(trimmed);
    }

    if (inlineCache.has(trimmed)) {
        return inlineCache.get(trimmed);
    }

    let absolute;
    try {
        absolute = new URL(trimmed, window.location.href).href;
    } catch (error) {
        absolute = trimmed;
    }

    const request = fetch(absolute, { mode: 'cors' })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Failed to fetch image (${response.status})`);
            }
            return response.blob();
        })
        .then((blob) => blobToDataUrl(blob))
        .catch(() => trimmed);

    inlineCache.set(trimmed, request);
    return request;
}

function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to convert blob to data URL'));
        reader.readAsDataURL(blob);
    });
}
