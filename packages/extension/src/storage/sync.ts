import { Bookmark, RootData } from '@bookmark-manager/shared';
import { BrowserStorageProvider } from './browser';
import { getServerToken } from './credentials';

const LAST_SYNC_AT_KEY = 'syncLastAt';
export const SYNC_ERROR_KEY = 'syncError';

interface ServerBookmark {
    id: string;
    url: string;
    title: string;
    description: string;
    tags: string[];
    faviconUrl?: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export async function clearSyncState(): Promise<void> {
    await chrome.storage.local.remove([LAST_SYNC_AT_KEY, SYNC_ERROR_KEY]);
}

export async function performSync(serverUrl: string): Promise<void> {
    const localProvider = new BrowserStorageProvider();
    const [localData, token, stored] = await Promise.all([
        localProvider.readData(),
        getServerToken(),
        chrome.storage.local.get(LAST_SYNC_AT_KEY),
    ]);
    const lastSyncAt: string | null = stored[LAST_SYNC_AT_KEY] ?? null;

    const response = await fetch(`${serverUrl.replace(/\/+$/, '')}/sync`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
            bookmarks: localData.bookmarks.map(b => ({
                id: b.id,
                url: b.url,
                title: b.title,
                description: b.description,
                tags: b.tags,
                faviconUrl: b.faviconUrl,
                createdAt: b.createdAt,
                updatedAt: b.updatedAt ?? b.createdAt,
                deletedAt: b.deletedAt ?? null,
            })),
            lastSyncAt,
        }),
    });

    if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
    }

    const { bookmarks: serverBookmarks, syncedAt } = await response.json() as {
        bookmarks: ServerBookmark[];
        syncedAt: string;
    };

    // Preserve extension-only fields (aiSuggestedTags, userModifiedTags) from local copies
    const localMap = new Map(localData.bookmarks.map(b => [b.id, b]));

    const merged: Bookmark[] = serverBookmarks.map(sb => {
        const local = localMap.get(sb.id);
        return {
            id: sb.id,
            url: sb.url,
            title: sb.title,
            description: sb.description,
            tags: sb.tags,
            faviconUrl: sb.faviconUrl,
            faviconCache: null,
            createdAt: sb.createdAt,
            updatedAt: sb.updatedAt,
            deletedAt: sb.deletedAt,
            aiSuggestedTags: local?.aiSuggestedTags ?? [],
            userModifiedTags: local?.userModifiedTags ?? false,
        };
    });

    const mergedData: RootData = { version: '1.0', bookmarks: merged };
    await localProvider.writeData(mergedData);
    await chrome.storage.local.set({ [LAST_SYNC_AT_KEY]: syncedAt });
    await chrome.storage.local.remove(SYNC_ERROR_KEY);
}

export class SyncService {
    private serverUrl: string;
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly DEBOUNCE_MS = 3000;

    constructor(serverUrl: string) {
        this.serverUrl = serverUrl;
    }

    async sync(): Promise<void> {
        try {
            await performSync(this.serverUrl);
            chrome.action.setBadgeText({ text: '' });
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            await chrome.storage.local.set({ [SYNC_ERROR_KEY]: msg });
            chrome.action.setBadgeText({ text: '!' });
            chrome.action.setBadgeBackgroundColor({ color: '#cc0000' });
            throw err;
        }
    }

    scheduleSync(): void {
        if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.debounceTimer = null;
            this.sync().catch(() => {}); // errors reflected via badge
        }, this.DEBOUNCE_MS);
    }

    cancelPending(): void {
        if (this.debounceTimer !== null) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
    }
}
