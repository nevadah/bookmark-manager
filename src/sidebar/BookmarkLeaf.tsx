import { Bookmark } from "../shared/types";

interface BookmarkLeafProps {
    bookmark: Bookmark;
    onUpdate: (bookmark: Bookmark) => void;
    onDelete: (id: string) => void;
    onEdit: (bookmark: Bookmark) => void;
}

export function BookmarkLeaf({ bookmark, onUpdate: _onUpdate, onDelete, onEdit }: BookmarkLeafProps) {
    return (
        <li className="bookmark-leaf">
            <div className="bookmark-header">
                <a href={bookmark.url} target="_blank" rel="noopener noreferrer">{bookmark.title}</a>
                <button type="button" className="delete" onClick={() => onDelete(bookmark.id)}>✕</button>
                <button type="button" className="edit" onClick={() => onEdit(bookmark)}>✎</button>
            </div>
            {bookmark.tags.length > 0 && (
                <div className="tags">
                    {bookmark.tags.map((tag) => (
                        <span key={tag} className="tag">
                            {tag}
                        </span>
                    ))}
                </div>
            )}
        </li>
    );
}
