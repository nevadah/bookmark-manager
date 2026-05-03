import { RootData } from '../types';
import { StorageProvider } from './types';

const STORAGE_KEY = 'bookmarkManagerData';

export class BrowserStorageProvider implements StorageProvider {

    async readData(): Promise<RootData> {
        const result = await chrome.storage.local.get(STORAGE_KEY);
        if (result[STORAGE_KEY]) {
            return result[STORAGE_KEY] as RootData;
        }
        return {
            version: '1.0',
            settings: {
                aiProvider: 'anthropic',
                aiApiKey: '',
                storageBackend: 'browser',
            },
            bookmarks: [],
        };
    }

    async writeData(data: RootData): Promise<void> {
        await chrome.storage.local.set({ [STORAGE_KEY]: data });
    }
}
