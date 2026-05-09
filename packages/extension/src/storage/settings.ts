import { Settings } from '@bookmark-manager/shared';

const SETTINGS_KEY = 'settings';

const DEFAULT_SETTINGS: Settings = {
    aiProvider: 'anthropic',
    storageBackend: 'browser',
    openInNewTab: true,
};

export async function getSettings(): Promise<Settings> {
    const result = await chrome.storage.local.get([SETTINGS_KEY]);
    if (result[SETTINGS_KEY]) {
        return { ...DEFAULT_SETTINGS, ...result[SETTINGS_KEY] };
    }

    return { ...DEFAULT_SETTINGS };
}

export async function saveSettings(settings: Settings): Promise<void> {
    await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}
