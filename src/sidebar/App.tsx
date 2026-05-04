import { useState, useEffect } from "react";
import { RootData, Settings, Bookmark } from '../shared/types';
import { BrowserStorageProvider } from "../shared/storage/browser";
import { createStorageProvider } from "../shared/storage";
import { SettingsView } from "./SettingsView";
import { BookmarksView } from "./BookmarksView";

type View = 'bookmarks' | 'tags' | 'search' | 'settings';

const bootstrapProvider = new BrowserStorageProvider();

export function App() {
    const [view, setView] = useState<View>('bookmarks');
    const [rootData, setRootData] = useState<RootData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      bootstrapProvider.readData().then(setRootData).catch((err) => {
        setError('Failed to load data: ' + err.message);
      });
    }, []);

    async function handleSaveSettings(settings: Settings) {
      const base = rootData ?? { version: '1.0' as const, settings, bookmarks: []};
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
                <button onClick={() => setView('bookmarks')}>Bookmarks</button>
                <button onClick={() => setView('tags')}>Tags</button>
                <button onClick={() => setView('search')}>Search</button>
                <button onClick={() => setView('settings')}>Settings</button>
            </nav>
            <main>
                {view === 'bookmarks' && <BookmarksView bookmarks={rootData.bookmarks} onAdd={handleAddBookmark} />}
                {view === 'tags' && <TagsView />}
                {view === 'search' && <SearchView />}
                {view === 'settings' && <SettingsView settings={rootData.settings} onSave={handleSaveSettings} />}
            </main>
        </div>
    );
}

function TagsView() {
    return <div>Tags</div>;
}

function SearchView() {
    return <div>Search</div>;
}
