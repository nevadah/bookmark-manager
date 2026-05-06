import { useState, useEffect } from "react";
import { RootData, Settings, Bookmark } from '../shared/types';
import { BrowserStorageProvider } from "../shared/storage/browser";
import { createStorageProvider } from "../shared/storage";
import { createProvider } from "../shared/providers";
import { SettingsView } from "./SettingsView";
import { BookmarksView } from "./BookmarksView";
import { SearchView } from "./SearchView";
import { EditPanel } from "./EditPanel";

type View = 'bookmarks' | 'search' | 'settings';

const bootstrapProvider = new BrowserStorageProvider();

export function App() {
    const [view, setView] = useState<View>('bookmarks');
    const [rootData, setRootData] = useState<RootData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);

    useEffect(() => {
        bootstrapProvider.readData().then(setRootData).catch((err) => {
            setError('Failed to load data: ' + err.message);
        });
    }, []);

    async function handleSaveSettings(settings: Settings) {
        const base = rootData ?? { version: '1.0' as const, settings, bookmarks: [] };
        const updated: RootData = { ...base, settings };
        try {
            await createStorageProvider(settings).writeData(updated);
            setRootData(updated);
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

        // AI tagging in the background. Don't await, don't block
        if (rootData!.settings.aiApiKey) {
            try {
                const provider = createProvider(rootData!.settings);
                const suggestedTags = await provider.suggestTags(bookmark.url, bookmark.title, bookmark.description, bookmark.tags);
                if (suggestedTags.length > 0) {
                    const withTags: Bookmark = {
                        ...bookmark,
                        aiSuggestedTags: suggestedTags,
                        tags: bookmark.userModifiedTags ? bookmark.tags : suggestedTags
                    };
                    const withAiTags: RootData = {
                        ...updated,
                        bookmarks: updated.bookmarks.map((b) => b.id === withTags.id ? withTags : b)
                    };
                    await createStorageProvider(updated.settings).writeData(withAiTags);
                    setRootData(withAiTags);
                }
            } catch {
                // Silently fail on AI errors. Bookmark is already saved, just without AI tags
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

    if (error) {
        return <div>Error: {error}</div>;
    }

    if (!rootData) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <nav>
                <button className={view === 'bookmarks' ? 'active' : ''} onClick={() => setView('bookmarks')}>Bookmarks</button>
                <button className={view === 'search' ? 'active' : ''} onClick={() => setView('search')}>Search</button>
                <button className={view === 'settings' ? 'active' : ''} onClick={() => setView('settings')}>Settings</button>
            </nav>
            <main>
                {view === 'bookmarks' && <BookmarksView bookmarks={rootData.bookmarks} onAdd={handleAddBookmark} onUpdate={handleUpdateBookmark} onDelete={handleDeleteBookmark} onEdit={setEditingBookmark} />}
                {view === 'search' && <SearchView bookmarks={rootData.bookmarks} onUpdate={handleUpdateBookmark} />}
                {view === 'settings' && <SettingsView settings={rootData.settings} onSave={handleSaveSettings} />}
            </main>
            {editingBookmark && (
                <EditPanel
                    bookmark={editingBookmark}
                    onUpdate={(updated) => {
                        handleUpdateBookmark(updated);
                        setEditingBookmark(updated);
                    }}
                    onClose={() => setEditingBookmark(null)}
                />
            )}
        </div>
    );
}
