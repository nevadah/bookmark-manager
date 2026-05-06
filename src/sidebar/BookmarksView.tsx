import { useState, KeyboardEvent } from "react";
import { Bookmark } from "../shared/types";

interface BookmarksViewProps {
    bookmarks: Bookmark[];
    onAdd: (bookmark: Bookmark) => void;
    onUpdate: (bookmark: Bookmark) => void;
    onDelete: (id: string) => void;
}

export function BookmarksView({ bookmarks, onAdd, onUpdate, onDelete }: BookmarksViewProps) {
    async function handleSaveCurrentPage() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.url) return;

        onAdd({
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
        });
    }

    return (
        <div>
            <button onClick={handleSaveCurrentPage}>Save Current Page</button>
            <ul>
                {bookmarks.map((bookmark) => (
                        <BookmarkItem key={bookmark.id} bookmark={bookmark} onUpdate={onUpdate} onDelete={onDelete} />
                ))}
            </ul>
        </div>
    );
}

function BookmarkItem({ bookmark, onUpdate, onDelete }: { bookmark: Bookmark; onUpdate: (bookmark: Bookmark) => void; onDelete: (id: string) => void }) {
    const [tagInput, setTagInput] = useState('');

    function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key !== 'Enter' || !tagInput.trim()) return;
        e.preventDefault();
        const newTag = tagInput.trim();
        if (bookmark.tags.includes(newTag)) return;
        onUpdate({ ...bookmark, tags: [...bookmark.tags, newTag], userModifiedTags: true });
        setTagInput('');
    }

    function handleRemoveTag(tag: string) {
        onUpdate({ ...bookmark, tags: bookmark.tags.filter((t) => t !== tag), userModifiedTags: true });
    }

    return (
        <li>
            <a href={bookmark.url} target="_blank" rel="noopener noreferrer">{bookmark.title}</a>
            <button type="button" onClick={() => onDelete(bookmark.id)}>Delete</button>
            <div>
                {bookmark.tags.map((tag) => (
                    <span key={tag}>
                        {tag}
                        <button type="button" onClick={() => handleRemoveTag(tag)}>×</button>
                    </span>
                ))}
                <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Add tag..."
                />
            </div>
        </li>
    );
}
