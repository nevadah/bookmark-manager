import { useState } from 'react';
import { Bookmark } from "@bookmark-manager/shared";
import { BookmarkContextMenu } from './BookmarkContextMenu';

interface BookmarkLeafProps {
    bookmark: Bookmark;
    onUpdate: (bookmark: Bookmark) => void;
    onDelete: (id: string) => void;
    onEdit: (bookmark: Bookmark) => void;
    openInNewTab: boolean;
}

export function BookmarkLeaf({ bookmark, onUpdate: _onUpdate, onDelete, onEdit, openInNewTab }: BookmarkLeafProps) {
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

    function handleContextMenu(e: React.MouseEvent) {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY });
    }

    return (
        <li className="bookmark-leaf" onContextMenu={handleContextMenu}>
            <div className="bookmark-header">
                {bookmark.faviconUrl && (
                    <img
                        src={bookmark.faviconUrl}
                        className="favicon"
                        alt=""
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                )}
                <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                        if (!openInNewTab) {
                            e.preventDefault();
                            chrome.tabs.update({ url: bookmark.url });
                        }
                    }}
                >
                    {bookmark.title}
                </a>
                <button type="button" className="delete" onClick={() => onDelete(bookmark.id)}>
                    ✕
                </button>
                <button type="button" className="edit" onClick={() => onEdit(bookmark)}>
                    ✎
                </button>
            </div>
            {contextMenu && (
                <BookmarkContextMenu
                    bookmark={bookmark}
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onClose={() => setContextMenu(null)}
                    onEdit={onEdit}
                    onDelete={onDelete}
                />
            )}
        </li>
    );
}
