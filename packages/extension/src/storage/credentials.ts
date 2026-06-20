const API_KEY_STORAGE_KEY = 'aiApiKey';
const SERVER_TOKEN_STORAGE_KEY = 'serverToken';

export async function getApiKey(): Promise<string> {
    const result = await chrome.storage.local.get(API_KEY_STORAGE_KEY);
    return (result[API_KEY_STORAGE_KEY] as string | undefined) ?? '';
}

export async function saveApiKey(apiKey: string): Promise<void> {
    await chrome.storage.local.set({ [API_KEY_STORAGE_KEY]: apiKey });
}

export async function getServerToken(): Promise<string> {
    const result = await chrome.storage.local.get(SERVER_TOKEN_STORAGE_KEY);
    return (result[SERVER_TOKEN_STORAGE_KEY] as string | undefined) ?? '';
}

export async function saveServerToken(serverToken: string): Promise<void> {
    await chrome.storage.local.set({ [SERVER_TOKEN_STORAGE_KEY]: serverToken });
}

export async function clearServerToken(): Promise<void> {
    await chrome.storage.local.remove(SERVER_TOKEN_STORAGE_KEY);
}
