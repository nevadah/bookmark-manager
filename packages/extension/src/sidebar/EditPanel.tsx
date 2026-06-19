import { useState, useEffect, KeyboardEvent } from "react";
import { useTranslation } from 'react-i18next';
import { Bookmark } from "@bookmark-manager/shared";

interface EditPanelProps {
    bookmark: Bookmark;
    onUpdate: (bookmark: Bookmark) => void;
    onClose: () => void;
    allTags: string[];
    onSuggestTags?: (url:string, title: string, description: string, tags: string[]) => Promise<string[]>;
}

export function EditPanel({ bookmark, onUpdate, onClose, allTags, onSuggestTags }: EditPanelProps) {
    const { t } = useTranslation();
    const [title, setTitle] = useState(bookmark.title);
    const [url, setUrl] = useState(bookmark.url);
    const [tagInput, setTagInput] = useState('');
    const [suggesting, setSuggesting] = useState(false);

    const suggestions = allTags.filter(
        (tag) => !bookmark.tags.includes(tag) && (tagInput === '' || tag.toLowerCase().includes(tagInput.toLowerCase()))
    );

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
        onUpdate({ ...bookmark, tags: bookmark.tags.filter((existingTag) => existingTag !== tag), userModifiedTags: true });
    }

    async function handleSuggestTags() {
        setSuggesting(true);
        try {
            const suggestedTags = await onSuggestTags!(url, title, bookmark.description, bookmark.tags);
            if (suggestedTags.length > 0) {
                const mergedTags = new Set([...bookmark.tags, ...suggestedTags]);
                onUpdate({ ...bookmark, tags: Array.from(mergedTags), aiSuggestedTags: suggestedTags, userModifiedTags: true });
            }
        } finally {
            setSuggesting(false);
        }
    }

    function handleAddSuggestedTag(tag: string) {
        onUpdate({ ...bookmark, tags: [...bookmark.tags, tag], userModifiedTags: true });
    }

    return (
        <div className="edit-panel">
            <div className="edit-panel-header">
                <span>{t('editPanel.heading')}</span>
                <button type="button" className="delete" onClick={onClose}>
                    ✕
                </button>
            </div>
            <div className="edit-panel-body">
                <label>
                    {t('editPanel.titleLabel')}
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={handleTitleBlur}
                    />
                </label>
                <label>
                    {t('editPanel.urlLabel')}
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
                        placeholder={t('editPanel.addTagPlaceholder')}
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleTagKeyDown}
                    />
                </div>
                {suggestions.length > 0 && (
                    <div className="tag-suggestions">
                        {suggestions.map((tag) => (
                            <button
                                key={tag}
                                type="button"
                                className="tag-suggestion"
                                onClick={() => handleAddSuggestedTag(tag)}
                            >
                                + {tag}
                            </button>
                        ))}
                    </div>
                )}
                {onSuggestTags && (
                    <button type="button" onClick={handleSuggestTags} disabled={suggesting}>
                        {suggesting ? t('editPanel.suggesting') : t('editPanel.suggestTags')}
                    </button>
                )}
            </div>
        </div>
    );
}
