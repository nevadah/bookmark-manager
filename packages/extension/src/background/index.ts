import { performSync, SYNC_ERROR_KEY } from '../storage/sync';
import { getSettings } from '../storage/settings';

const SYNC_ALARM = 'bookmark-sync';
const SYNC_PERIOD_MINUTES = 15;

chrome.runtime.onInstalled.addListener(() => {
    if ('sidePanel' in chrome) {
        chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    }
    chrome.alarms.create(SYNC_ALARM, { periodInMinutes: SYNC_PERIOD_MINUTES });
});

chrome.action.onClicked.addListener(() => {
    if (!('sidePanel' in chrome)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).browser?.sidebarAction?.toggle();
    }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== SYNC_ALARM) return;
    try {
        const settings = await getSettings();
        if (settings.storageBackend !== 'server' || !settings.serverUrl) return;
        await performSync(settings.serverUrl);
        chrome.action.setBadgeText({ text: '' });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await chrome.storage.local.set({ [SYNC_ERROR_KEY]: msg });
        chrome.action.setBadgeText({ text: '!' });
        chrome.action.setBadgeBackgroundColor({ color: '#cc0000' });
    }
});

chrome.runtime.onMessage.addListener((_message, _sender, _sendResponse) => {
    // Message handlers will be added here as needed.
});
