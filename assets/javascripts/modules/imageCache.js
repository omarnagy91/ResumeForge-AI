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

    // Try multiple strategies to convert the image
    const request = tryFetchImage(absolute)
        .catch((fetchError) => {
            console.warn('Direct fetch failed, trying canvas conversion:', absolute, fetchError);
            return convertImageViaCanvas(absolute);
        })
        .catch((canvasError) => {
            console.warn('Canvas conversion failed, trying CORS proxy:', absolute, canvasError);
            // Try with a CORS proxy as last resort
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(absolute)}`;
            return tryFetchImage(proxyUrl);
        })
        .catch((proxyError) => {
            console.error('All conversion methods failed for:', absolute, proxyError);
            // Return original URL as absolute last resort
            return trimmed;
        });

    inlineCache.set(trimmed, request);
    return request;
}

function tryFetchImage(url) {
    return fetch(url, { mode: 'cors', credentials: 'omit' })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Failed to fetch image (${response.status})`);
            }
            return response.blob();
        })
        .then((blob) => blobToDataUrl(blob));
}

function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to convert blob to data URL'));
        reader.readAsDataURL(blob);
    });
}

function convertImageViaCanvas(imageUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        const timeoutId = setTimeout(() => {
            reject(new Error('Image load timeout'));
        }, 10000);
        
        img.onload = () => {
            clearTimeout(timeoutId);
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || img.width || 100;
                canvas.height = img.naturalHeight || img.height || 100;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                const dataUrl = canvas.toDataURL('image/png');
                resolve(dataUrl);
            } catch (error) {
                reject(error);
            }
        };
        
        img.onerror = (error) => {
            clearTimeout(timeoutId);
            reject(new Error('Failed to load image: ' + error));
        };
        
        img.src = imageUrl;
    });
}
