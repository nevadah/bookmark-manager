const maxFaviconSize = 50 * 1024; // 50 KB

function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
}

export async function fetchFavicon(url: string): Promise<string | null> {
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!response.ok) {
            console.warn(`Failed to fetch favicon from ${url}: ${response.status}`);
            return null;
        }
        const blob = await response.blob();
        if (blob.size > maxFaviconSize) return null;

        if (blob.type.startsWith('image/svg+xml')) {
            return await blobToDataUrl(blob);
        }
        const canvas = new OffscreenCanvas(32, 32);
        const context = canvas.getContext('2d');
        if (!context) {
            return null;
        }
        const imageBitmap = await createImageBitmap(blob);
        context.drawImage(imageBitmap, 0, 0, 32, 32);
        imageBitmap.close();
        const resizedBlob = await canvas.convertToBlob({ type: 'image/png' });
        return await blobToDataUrl(resizedBlob);
    } catch (error) {
        console.warn(`Error fetching favicon from ${url}:`, error);
        return null;
    }
}
