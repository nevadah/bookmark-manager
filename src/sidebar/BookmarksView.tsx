import { Bookmark } from "../shared/types";

interface BookmarksViewProps {
    bookmarks: Bookmark[];
    onAdd: (bookmark: Bookmark) => void;
}

export function BookmarksView({ bookmarks, onAdd }: BookmarksViewProps) {
    async function handleSaveCurrentPage() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.url) return;

        const bookmark: Bookmark = {
            id: crypto.randomUUID(),
            url: tab.url,
            title: tab.title ?? tab.url,
            description: '',
            tags: [],
            aiSuggestedTags: [],
            faviconUrl: tab.favIconUrl,
            faviconCache: null,
            userModifiedTags: false,
            createdAt: new Date().toISOString()
        };
        onAdd(bookmark);
    }

    return (
        <div>
            <button onClick={handleSaveCurrentPage}>Save Current Page</button>
            <ul>
                {bookmarks.map((bookmark) => (
                    <li key={bookmark.id}>
                        <a href={bookmark.url} target="_blank" rel="noopener noreferrer">
                            {bookmark.title}
                        </a>
                        {bookmark.tags.length > 0 && <span> - {bookmark.tags.join(', ')}</span>}
                    </li>
                ))}
            </ul>
        </div>
    );
}
