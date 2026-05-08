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
                {bookmark.faviconUrl && (
                    <img
                        src={bookmark.faviconUrl}
                        className="favicon"
                        alt=""
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                )}
                <a href={bookmark.url} target="_blank" rel="noopener noreferrer">
                    {bookmark.title}
                </a>
                <button type="button" className="delete" onClick={() => onDelete(bookmark.id)}>
                    ✕
                </button>
                <button type="button" className="edit" onClick={() => onEdit(bookmark)}>
                    ✎
                </button>
            </div>
        </li>
    );
}
