const API_KEY_STORAGE_KEY = 'aiApiKey';

export async function getApiKey(): Promise<string> {
    const result = await chrome.storage.local.get(API_KEY_STORAGE_KEY);
    return result[API_KEY_STORAGE_KEY] ?? '';
}

export async function saveApiKey(apiKey: string): Promise<void> {
    await chrome.storage.local.set({ [API_KEY_STORAGE_KEY]: apiKey });
}
