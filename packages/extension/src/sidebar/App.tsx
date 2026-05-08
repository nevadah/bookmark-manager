import { useState, useEffect, useRef } from "react";
import { useTranslation } from 'react-i18next';
import { RootData, Settings, Bookmark } from '@bookmark-manager/shared';
import { BrowserStorageProvider } from "../storage/browser";
import { createStorageProvider } from "../storage";
import { getApiKey, saveApiKey } from "../storage/credentials";
import { createProvider } from "../providers";
import { SettingsView } from "./SettingsView";
import { BookmarksView } from "./BookmarksView";
import { EditPanel } from "./EditPanel";
import { importBrowserBookmarks } from "../import";

type View = 'bookmarks' | 'settings';

const bootstrapProvider = new BrowserStorageProvider();

export function App() {
    const { t } = useTranslation();
    const [view, setView] = useState<View>('bookmarks');
    const [rootData, setRootData] = useState<RootData | null>(null);
    const [apiKey, setApiKey] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
    const rootDataRef = useRef<RootData | null>(null);

    useEffect(() => {
        rootDataRef.current = rootData;
    }, [rootData]);

    useEffect(() => {
        Promise.all([
            bootstrapProvider.readData(),
            getApiKey(),
        ]).then(([data, key]) => {
            setRootData(data);
            setApiKey(key);
        }).catch((err) => {
            setError('Failed to load data: ' + err.message);
        });
    }, []);

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
                await createStorageProvider(current.settings).writeData(updatedData);
                setRootData(updatedData);
            } catch {
                // silently fail — favicon is non-critical
            }
        }
        chrome.tabs.onUpdated.addListener(handleTabUpdate);
        return () => chrome.tabs.onUpdated.removeListener(handleTabUpdate);
    }, []);

    async function handleSaveSettings(settings: Settings, newApiKey: string) {
        const base = rootData ?? { version: '1.0' as const, settings, bookmarks: [] };
        let updated: RootData = { ...base, settings };

        if (settings.storageBackend === 'file') {
            try {
                const existing = await createStorageProvider(settings).readData();
                if (existing.bookmarks.length > 0) {
                    const fileUrls = new Set(existing.bookmarks.map((b) => b.url));
                    const fromBrowser = updated.bookmarks.filter((b) => !fileUrls.has(b.url));
                    updated = { ...updated, bookmarks: [...existing.bookmarks, ...fromBrowser] };
                }
            } catch {
                // file is new or empty — no merge needed
            }
        }

        try {
            await createStorageProvider(settings).writeData(updated);
            await saveApiKey(newApiKey);
            setRootData(updated);
            setApiKey(newApiKey);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save settings');
        }
    }

    async function handleAddBookmark(bookmark: Bookmark) {
        const updated: RootData = {
            ...rootData!,
            bookmarks: [...rootData!.bookmarks, bookmark]
        };
        try {
            await createStorageProvider(rootData!.settings).writeData(updated);
            setRootData(updated);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save bookmark');
        }

        if (apiKey) {
            try {
                const provider = createProvider(rootData!.settings, apiKey);
                const suggestedTags = await provider.suggestTags(bookmark.url, bookmark.title, bookmark.description, bookmark.tags);
                if (suggestedTags.length > 0) {
                    const withTags: Bookmark = {
                        ...bookmark,
                        aiSuggestedTags: suggestedTags,
                        tags: bookmark.userModifiedTags ? bookmark.tags : suggestedTags
                    };
                    const current = rootDataRef.current!;
                    const withAiTags: RootData = {
                        ...current,
                        bookmarks: current.bookmarks.map((b) => b.id === withTags.id ? withTags : b)
                    };
                    await createStorageProvider(current.settings).writeData(withAiTags);
                    setRootData(withAiTags);
                }
            } catch {
                // Silently fail on AI errors
            }
        }
    }

    async function handleUpdateBookmark(updated: Bookmark) {
        const bookmarks = rootData!.bookmarks.map((b) => b.id === updated.id ? updated : b);
        const updatedData = { ...rootData!, bookmarks };
        try {
            await createStorageProvider(rootData!.settings).writeData(updatedData);
            setRootData(updatedData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update bookmark');
        }
    }

    async function handleDeleteBookmark(id: string) {
        const bookmarks = rootData!.bookmarks.filter((b) => b.id !== id);
        const updatedData = { ...rootData!, bookmarks };
        try {
            await createStorageProvider(rootData!.settings).writeData(updatedData);
            setRootData(updatedData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete bookmark');
        }
    }

    async function fetchSuggestedTags(url: string, title: string, description: string, tags: string[]): Promise<string[]> {
        try {
            const provider = createProvider(rootData!.settings, apiKey);
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
            await createStorageProvider(rootData!.settings).writeData(updatedData);
            setRootData(updatedData);
        }
        return { imported: newBookmarks.length, skipped };
    }

    if (error) {
        return <div>{t('app.error', { message: error })}</div>;
    }

    if (!rootData) {
        return <div>{t('app.loading')}</div>;
    }

    return (
        <div className="app">
            <nav>
                <button className={view === 'bookmarks' ? 'active' : ''} onClick={() => setView('bookmarks')}>{t('nav.bookmarks')}</button>
                <button className={view === 'settings' ? 'active' : ''} onClick={() => setView('settings')}>{t('nav.settings')}</button>
            </nav>
            <main>
                {view === 'bookmarks' && <BookmarksView bookmarks={rootData.bookmarks} onAdd={handleAddBookmark} onUpdate={handleUpdateBookmark} onDelete={handleDeleteBookmark} onEdit={setEditingBookmark} openInNewTab={rootData.settings.openInNewTab ?? true} />}
                {view === 'settings' && <SettingsView settings={rootData.settings} apiKey={apiKey} onSave={handleSaveSettings} onImport={handleImport} />}
            </main>
            {editingBookmark && (
                <EditPanel
                    bookmark={editingBookmark}
                    onUpdate={(updated) => {
                        handleUpdateBookmark(updated);
                        setEditingBookmark(updated);
                    }}
                    onClose={() => setEditingBookmark(null)}
                    onSuggestTags={apiKey ? fetchSuggestedTags : undefined}
                />
            )}
        </div>
    );
}
