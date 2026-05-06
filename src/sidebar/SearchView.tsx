import { useState } from "react";
import { Bookmark } from "../shared/types";
import { BookmarkLeaf } from "./BookmarkLeaf";

interface SearchViewProps {
    bookmarks: Bookmark[];
    onUpdate: (bookmark: Bookmark) => void;
    onDelete: (id: string) => void;
    onEdit: (bookmark: Bookmark) => void;
}

export function SearchView({ bookmarks, onUpdate, onDelete, onEdit }: SearchViewProps) {
    const [query, setQuery] = useState('');

    const results = query.trim() 
        ? bookmarks.filter((bookmark) => {
            const q = query.toLowerCase();
            return (
                bookmark.title.toLowerCase().includes(q) ||
                bookmark.url.toLowerCase().includes(q) ||
                bookmark.tags.some((tag) => tag.toLowerCase().includes(q))
            );
        })
        : [];

    return (
        <div>
            <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search bookmarks..."
            />
            <ul>
                {results.map((bookmark) => (
                    <BookmarkLeaf key={bookmark.id} bookmark={bookmark} onUpdate={onUpdate} onDelete={onDelete} onEdit={onEdit} />
                ))}
            </ul>
            {query.trim() && results.length === 0 && <div className="empty-state">No results found.</div>}
        </div>
    );
}
