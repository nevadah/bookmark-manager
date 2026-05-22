import { useState, useEffect, useRef } from "react";
import { useTranslation } from 'react-i18next';
import { RootData, Settings, Bookmark } from '@bookmark-manager/shared';
import { createStorageProvider } from "../storage";
import { StorageProvider } from "../storage/types";
import { STORAGE_KEY } from "../storage/browser";
import { SyncService, clearSyncState, SYNC_ERROR_KEY } from "../storage/sync";
import { getApiKey, saveApiKey, getServerToken, saveServerToken, clearServerToken } from "../storage/credentials";
import { createProvider } from "../providers";
import { SettingsView } from "./SettingsView";
import { BookmarksView } from "./BookmarksView";
import { EditPanel } from "./EditPanel";
import { importBrowserBookmarks } from "../import";
import { getSettings, saveSettings } from "../storage/settings";

type View = 'bookmarks' | 'settings';

export function App() {
    const { t } = useTranslation();
    const [view, setView] = useState<View>('bookmarks');
    const [rootData, setRootData] = useState<RootData | null>(null);
    const [apiKey, setApiKey] = useState<string>('');
    const [serverToken, setServerToken] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [syncError, setSyncError] = useState<string | null>(null);
    const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
    const [settings, setSettings] = useState<Settings | null>(null);
    const rootDataRef = useRef<RootData | null>(null);
    const settingsRef = useRef<Settings | null>(null);
    const storageProviderRef = useRef<StorageProvider | null>(null);
    const syncServiceRef = useRef<SyncService | null>(null);

    useEffect(() => {
        async function bootstrap() {
            try {
                const [loadedSettings, key, token] = await Promise.all([getSettings(), getApiKey(), getServerToken()]);
                const provider = createStorageProvider(loadedSettings);
                storageProviderRef.current = provider;
                const data = await provider.readData();
                setSettings(loadedSettings);
                setApiKey(key);
                setServerToken(token);

                if (loadedSettings.storageBackend === 'server' && loadedSettings.serverUrl && token) {
                    const svc = new SyncService(loadedSettings.serverUrl);
                    syncServiceRef.current = svc;
                    try {
                        await svc.sync();
                        const synced = await provider.readData();
                        setRootData(synced);
                    } catch {
                        // Initial sync failed — show local data, badge already reflects error
                        setRootData(data);
                    }
                } else {
                    setRootData(data);
                }
            } catch (err) {
                setError('Failed to load data: ' + (err instanceof Error ? err.message : String(err)));
            }
        }
        bootstrap();
    }, []);

    useEffect(() => {
        rootDataRef.current = rootData;
    }, [rootData]);

    useEffect(() => {
        settingsRef.current = settings;
    }, [settings]);

    // Reflect background syncs (periodic alarm) into sidebar state
    useEffect(() => {
        if (settings?.storageBackend !== 'server') return;

        function handleStorageChange(
            changes: { [key: string]: chrome.storage.StorageChange },
            areaName: string
        ) {
            if (areaName !== 'local') return;
            if (STORAGE_KEY in changes && changes[STORAGE_KEY].newValue) {
                setRootData(changes[STORAGE_KEY].newValue as RootData);
            }
            if (SYNC_ERROR_KEY in changes) {
                const newError = changes[SYNC_ERROR_KEY].newValue ?? null;
                setSyncError(newError as string | null);
            }
        }

        chrome.storage.onChanged.addListener(handleStorageChange);
        return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    }, [settings?.storageBackend]);

    useEffect(() => {
        async function handleTabUpdate(_tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) {
            if (!changeInfo.favIconUrl || !tab.url) return;
            const current = rootDataRef.current;
            if (!current) return;
            const bookmark = current.bookmarks.find((b) => b.url === tab.url && !b.faviconUrl);
            if (!bookmark) return;
            const updated = { ...bookmark, faviconUrl: changeInfo.favIconUrl };
            const bookmarks = current.bookmarks.map((b) => b.id === updated.id ? updated : b);
            const updatedData = { ...current, bookmarks };
            try {
                await storageProviderRef.current!.writeData(updatedData);
                setRootData(updatedData);
            } catch {
                // silently fail — favicon is non-critical
            }
        }
        chrome.tabs.onUpdated.addListener(handleTabUpdate);
        return () => chrome.tabs.onUpdated.removeListener(handleTabUpdate);
    }, []);

    async function handleSaveSettings(newSettings: Settings, newApiKey: string) {
        const base = rootData ?? { version: '1.0' as const, bookmarks: [] };
        let mergedBookmarks = base.bookmarks;

        // Cancel any pending sync before switching providers
        syncServiceRef.current?.cancelPending();
        syncServiceRef.current = null;

        const provider = createStorageProvider(newSettings);
        storageProviderRef.current = provider;

        if (newSettings.storageBackend === 'file') {
            try {
                const existing = await provider.readData();
                if (existing.bookmarks.length > 0) {
                    const fileUrls = new Set(existing.bookmarks.map((b) => b.url));
                    const fromBrowser = base.bookmarks.filter((b) => !fileUrls.has(b.url));
                    mergedBookmarks = [...existing.bookmarks, ...fromBrowser];
                }
            } catch {
                // file is new or empty
            }
        }

        if (newSettings.storageBackend !== 'server') {
            await clearSyncState();
        }

        const dataToWrite: RootData = {
            version: base.version,
            bookmarks: mergedBookmarks,
        };

        try {
            await provider.writeData(dataToWrite);
            await saveSettings(newSettings);
            await saveApiKey(newApiKey);
            setRootData(dataToWrite);
            setSettings(newSettings);
            setApiKey(newApiKey);
            setSyncError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save settings');
        }
    }

    async function handleLogin(token: string) {
        try {
            await saveServerToken(token);
            setServerToken(token);
            const newSettings: Settings = { ...settingsRef.current!, storageBackend: 'server' };
            const provider = createStorageProvider(newSettings);
            storageProviderRef.current = provider;

            const svc = new SyncService(newSettings.serverUrl!);
            syncServiceRef.current = svc;

            await svc.sync();
            const synced = await provider.readData();
            await saveSettings(newSettings);
            setSettings(newSettings);
            setRootData(synced);
            setSyncError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to connect to server');
        }
    }

    async function handleLogout() {
        try {
            syncServiceRef.current?.cancelPending();
            syncServiceRef.current = null;
            await clearSyncState();
            await clearServerToken();
            setServerToken('');
            setSyncError(null);
            handleSaveSettings({ ...settings!, storageBackend: 'browser' }, apiKey);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to logout');
        }
    }

    async function handleAddBookmark(bookmark: Bookmark) {
        if (rootData!.bookmarks.some(b => b.url === bookmark.url && !b.deletedAt)) return;

        const updated: RootData = {
            ...rootData!,
            bookmarks: [...rootData!.bookmarks, bookmark]
        };
        try {
            await storageProviderRef.current!.writeData(updated);
            setRootData(updated);
            syncServiceRef.current?.scheduleSync();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save bookmark');
        }

        if (apiKey || settingsRef.current?.storageBackend === 'server') {
            try {
                const suggestedTags = await fetchSuggestedTags(bookmark.url, bookmark.title, bookmark.description, bookmark.tags);
                if (suggestedTags.length > 0) {
                    const now = new Date().toISOString();
                    const withTags: Bookmark = {
                        ...bookmark,
                        aiSuggestedTags: suggestedTags,
                        tags: bookmark.userModifiedTags ? bookmark.tags : suggestedTags,
                        updatedAt: now,
                    };
                    const current = rootDataRef.current!;
                    const withAiTags: RootData = {
                        ...current,
                        bookmarks: current.bookmarks.map((b) => b.id === withTags.id ? withTags : b)
                    };
                    await storageProviderRef.current!.writeData(withAiTags);
                    setRootData(withAiTags);
                    syncServiceRef.current?.scheduleSync();
                }
            } catch {
                // Silently fail on AI errors
            }
        }
    }

    async function handleUpdateBookmark(updated: Bookmark) {
        const withTimestamp = { ...updated, updatedAt: new Date().toISOString() };
        const bookmarks = rootData!.bookmarks.map((b) => b.id === withTimestamp.id ? withTimestamp : b);
        const updatedData = { ...rootData!, bookmarks };
        try {
            await storageProviderRef.current!.writeData(updatedData);
            setRootData(updatedData);
            syncServiceRef.current?.scheduleSync();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update bookmark');
        }
    }

    async function handleDeleteBookmark(id: string) {
        let updatedData: RootData;
        if (settingsRef.current?.storageBackend === 'server') {
            const now = new Date().toISOString();
            const bookmarks = rootData!.bookmarks.map((b) =>
                b.id === id ? { ...b, deletedAt: now, updatedAt: now } : b
            );
            updatedData = { ...rootData!, bookmarks };
        } else {
            const bookmarks = rootData!.bookmarks.filter((b) => b.id !== id);
            updatedData = { ...rootData!, bookmarks };
        }
        try {
            await storageProviderRef.current!.writeData(updatedData);
            setRootData(updatedData);
            syncServiceRef.current?.scheduleSync();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete bookmark');
        }
    }

    async function fetchSuggestedTags(url: string, title: string, description: string, tags: string[]): Promise<string[]> {
        try {
            if (settingsRef.current?.storageBackend === 'server') {
                const serverUrl = settingsRef.current.serverUrl!.replace(/\/+$/, '');
                const token = await getServerToken();
                const response = await fetch(`${serverUrl}/ai/suggest-tags`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ url, title, description, existingTags: tags }),
                });
                if (!response.ok) return [];
                const data = await response.json() as { tags: string[] };
                return data.tags;
            }
            const provider = createProvider(settingsRef.current!, apiKey);
            return await provider.suggestTags(url, title, description, tags);
        } catch {
            return [];
        }
    }

    async function handleImport(): Promise<{ imported: number; skipped: number }> {
        const tree = await chrome.bookmarks.getTree();
        const candidates = importBrowserBookmarks(tree);
        const existingUrls = new Set(rootData!.bookmarks.map((b) => b.url));
        const newBookmarks = candidates.filter((c) => !existingUrls.has(c.url));
        const skipped = candidates.length - newBookmarks.length;
        if (newBookmarks.length > 0) {
            const updatedData: RootData = {
                ...rootData!,
                bookmarks: [...rootData!.bookmarks, ...newBookmarks]
            };
            await storageProviderRef.current!.writeData(updatedData);
            setRootData(updatedData);
            syncServiceRef.current?.scheduleSync();
        }
        return { imported: newBookmarks.length, skipped };
    }

    if (error) {
        return <div>{t('app.error', { message: error })}</div>;
    }

    if (!rootData || !settings) {
        return <div>{t('app.loading')}</div>;
    }

    const visibleBookmarks = rootData.bookmarks.filter(b => !b.deletedAt);

    return (
        <div className="app">
            <nav>
                <button className={view === 'bookmarks' ? 'active' : ''} onClick={() => setView('bookmarks')}>{t('nav.bookmarks')}</button>
                <button className={view === 'settings' ? 'active' : ''} onClick={() => setView('settings')}>{t('nav.settings')}</button>
            </nav>
            {syncError && (
                <div className="sync-error-bar">{t('sync.error')}</div>
            )}
            <main>
                {view === 'bookmarks' && <BookmarksView bookmarks={visibleBookmarks} onAdd={handleAddBookmark} onUpdate={handleUpdateBookmark} onDelete={handleDeleteBookmark} onEdit={setEditingBookmark} openInNewTab={settings!.openInNewTab ?? true} />}
                {view === 'settings' && <SettingsView settings={settings!} apiKey={apiKey} onSave={handleSaveSettings} onImport={handleImport} serverToken={serverToken} onLogin={handleLogin} onLogout={handleLogout} />}
            </main>
            {editingBookmark && (
                <EditPanel
                    bookmark={editingBookmark}
                    onUpdate={(updated) => {
                        handleUpdateBookmark(updated);
                        setEditingBookmark(updated);
                    }}
                    onClose={() => setEditingBookmark(null)}
                    onSuggestTags={apiKey || settings?.storageBackend === 'server' ? fetchSuggestedTags : undefined}
                />
            )}
        </div>
    );
}
