import { useState } from "react";
import { Bookmark } from "../shared/types";

interface SearchViewProps {
    bookmarks: Bookmark[];
    onUpdate: (bookmark: Bookmark) => void;
}

export function SearchView({ bookmarks, onUpdate: _onUpdate }: SearchViewProps) {
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
                    <li key={bookmark.id}>
                        <a href={bookmark.url} target="_blank" rel="noopener noreferrer">
                            {bookmark.title}
                        </a>
                        {bookmark.tags.length > 0 && <span> - {bookmark.tags.join(', ')}</span>}
                    </li>
                ))}
            </ul>
            {query.trim() && results.length === 0 && <div>No results found.</div>}
        </div>
    );
}
