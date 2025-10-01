// Dedicated module for converting external images to data URIs for PDF export

export async function convertAllTechnologyIcons() {
    const icons = document.querySelectorAll('.technologies_icon');
    console.log(`Found ${icons.length} technology icons to convert`);
    
    const conversions = Array.from(icons).map((img, index) => {
        return convertImageElement(img, index + 1, icons.length);
    });
    
    const results = await Promise.allSettled(conversions);
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`✅ Converted ${successful}/${icons.length} icons successfully`);
    if (failed > 0) {
        console.warn(`⚠️ Failed to convert ${failed} icons`);
    }
    
    return { successful, failed, total: icons.length };
}

async function convertImageElement(img, index, total) {
    // Skip if already a data URI
    if (img.src.startsWith('data:')) {
        console.log(`[${index}/${total}] Already converted: ${img.alt}`);
        return Promise.resolve();
    }
    
    const originalSrc = img.src;
    console.log(`[${index}/${total}] Converting: ${img.alt} from ${originalSrc.substring(0, 60)}...`);
    
    try {
        // Method 1: Try fetching and converting via blob
        const dataUri = await fetchAndConvertToDataUri(originalSrc);
        img.src = dataUri;
        img.removeAttribute('crossorigin');
        console.log(`[${index}/${total}] ✅ Success via fetch: ${img.alt}`);
        return Promise.resolve();
    } catch (fetchError) {
        console.warn(`[${index}/${total}] Fetch failed, trying canvas method...`, fetchError.message);
        
        try {
            // Method 2: Try canvas-based conversion
            const dataUri = await canvasConvertToDataUri(originalSrc);
            img.src = dataUri;
            img.removeAttribute('crossorigin');
            console.log(`[${index}/${total}] ✅ Success via canvas: ${img.alt}`);
            return Promise.resolve();
        } catch (canvasError) {
            console.error(`[${index}/${total}] ❌ All methods failed for: ${img.alt}`, canvasError.message);
            throw new Error(`Failed to convert ${img.alt}: ${canvasError.message}`);
        }
    }
}

function fetchAndConvertToDataUri(url) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Fetch timeout')), 10000);
        
        fetch(url, { 
            mode: 'cors',
            cache: 'force-cache'
        })
        .then(response => {
            clearTimeout(timeout);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response.blob();
        })
        .then(blob => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('FileReader failed'));
                reader.readAsDataURL(blob);
            });
        })
        .then(dataUri => {
            clearTimeout(timeout);
            resolve(dataUri);
        })
        .catch(error => {
            clearTimeout(timeout);
            reject(error);
        });
    });
}

function canvasConvertToDataUri(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const timeout = setTimeout(() => {
            reject(new Error('Canvas conversion timeout'));
        }, 10000);
        
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
            clearTimeout(timeout);
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                canvas.width = img.naturalWidth || img.width || 100;
                canvas.height = img.naturalHeight || img.height || 100;
                
                // Fill with white background (in case of transparency)
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                ctx.drawImage(img, 0, 0);
                
                const dataUri = canvas.toDataURL('image/png');
                resolve(dataUri);
            } catch (error) {
                reject(error);
            }
        };
        
        img.onerror = (error) => {
            clearTimeout(timeout);
            reject(new Error('Image load failed: ' + error));
        };
        
        // Add cache busting to force fresh load
        const cacheBustedUrl = url.includes('?') 
            ? `${url}&_cb=${Date.now()}` 
            : `${url}?_cb=${Date.now()}`;
        
        img.src = cacheBustedUrl;
    });
}

// Test function to verify conversion works
export async function testIconConversion() {
    console.log('🧪 Testing icon conversion...');
    const result = await convertAllTechnologyIcons();
    
    // Log the current state of all icons
    const icons = document.querySelectorAll('.technologies_icon');
    console.log('\n📊 Final Icon Status:');
    icons.forEach((img, i) => {
        console.log(`  ${i + 1}. ${img.alt}: ${img.src.startsWith('data:') ? '✅ Data URI' : '❌ Still URL'}`);
    });
    
    return result;
}
