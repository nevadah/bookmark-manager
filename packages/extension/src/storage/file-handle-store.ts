function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('BookmarkManagerDB', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('handles');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function saveFileHandle(handle: FileSystemFileHandle): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('handles', 'readwrite');
        const store = transaction.objectStore('handles');
        const request = store.put(handle, 'fileHandle');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}
    
export async function getFileHandle(): Promise<FileSystemFileHandle | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('handles', 'readonly');
        const store = transaction.objectStore('handles');
        const request = store.get('fileHandle');
        request.onsuccess = () => {
            resolve(request.result || null);
        };
        request.onerror = () => reject(request.error);
    });
}
