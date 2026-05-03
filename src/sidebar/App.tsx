import { useState } from "react";
import { SettingsView } from "./SettingsView";

type View = 'bookmarks' | 'tags' | 'search' | 'settings';

export function App() {
    const [view, setView] = useState<View>('bookmarks');

    return (
        <div>
            <nav>
                <button onClick={() => setView('bookmarks')}>Bookmarks</button>
                <button onClick={() => setView('tags')}>Tags</button>
                <button onClick={() => setView('search')}>Search</button>
                <button onClick={() => setView('settings')}>Settings</button>
            </nav>
            <main>
                {view === 'bookmarks' && <BookmarksView />}
                {view === 'tags' && <TagsView />}
                {view === 'search' && <SearchView />}
                {view === 'settings' && <SettingsView onSave={() => {}} />}
            </main>
        </div>
    );
}

function BookmarksView() {
    return <div>Bookmarks</div>;
}

function TagsView() {
    return <div>Tags</div>;
}

function SearchView() {
    return <div>Search</div>;
}
