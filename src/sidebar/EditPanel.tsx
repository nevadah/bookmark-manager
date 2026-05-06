import { useState, useEffect, KeyboardEvent } from "react";
import { Bookmark } from "../shared/types";

interface EditPanelProps {
    bookmark: Bookmark;
    onUpdate: (bookmark: Bookmark) => void;
    onClose: () => void;
}

export function EditPanel({ bookmark, onUpdate, onClose }: EditPanelProps) {
    const [title, setTitle] = useState(bookmark.title);
    const [url, setUrl] = useState(bookmark.url);
    const [tagInput, setTagInput] = useState('');

    useEffect(() => {
        setTitle(bookmark.title);
        setUrl(bookmark.url);
        setTagInput('');
    }, [bookmark.id]);

    function handleTitleBlur() {
        if (title !== bookmark.title) {
            onUpdate({ ...bookmark, title });
        }
    }

    function handleUrlBlur() {
        if (url !== bookmark.url) {
            onUpdate({ ...bookmark, url });
        }
    }

    function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key !== 'Enter' || !tagInput.trim()) return;
        e.preventDefault();
        const newTag = tagInput.trim();
        if (bookmark.tags.includes(newTag)) {
            setTagInput('');
            return;
        }
        onUpdate({ ...bookmark, tags: [...bookmark.tags, newTag], userModifiedTags: true });
        setTagInput('');
    }

    function handleRemoveTag(tag: string) {
        onUpdate({ ...bookmark, tags: bookmark.tags.filter((t) => t !== tag), userModifiedTags: true });
    }

    return (
        <div className="edit-panel">
            <div className="edit-panel-header">
                <span>Edit Bookmark</span>
                <button type="button" className="delete" onClick={onClose}>
                    ✕
                </button>
            </div>
            <div className="edit-panel-body">
                <label>
                    Title
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={handleTitleBlur}
                    />
                </label>
                <label>
                    URL
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onBlur={handleUrlBlur}
                    />
                </label>
                <div className="tags">
                    {bookmark.tags.map((tag) => (
                        <span key={tag} className="tag">
                            {tag}
                            <button
                                type="button"
                                className="remove-tag"
                                onClick={() => handleRemoveTag(tag)}
                            >
                                ✕
                            </button>
                        </span>
                    ))}
                    <input
                        type="text"
                        placeholder="Add tag..."
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleTagKeyDown}
                    />
                </div>
            </div>
        </div>
    );
}
