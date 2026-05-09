import { useEffect, useRef } from "react";
import { Bookmark } from "@bookmark-manager/shared";
import { useTranslation } from "react-i18next";

interface BookmarkContextMenuProps {
    bookmark: Bookmark;
    x: number;
    y: number;
    onClose: () => void;
    onEdit: (bookmark: Bookmark) => void;
    onDelete: (id: string) => void;
}

export function BookmarkContextMenu({ bookmark, x, y, onClose, onEdit, onDelete }: BookmarkContextMenuProps) {
    const { t } = useTranslation();
    const menuRef= useRef<HTMLUListElement>(null);

    useEffect(() => {
        function handleMouseDown(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        }
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose();
        }
        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    useEffect(() => {
        if (!menuRef.current) return;
        const rect = menuRef.current.getBoundingClientRect();
        if (rect.right > window.innerWidth)
            menuRef.current.style.left = `${x - rect.width}px`;
        if (rect.bottom > window.innerHeight)
            menuRef.current.style.top = `${y - rect.height}px`;
    }, [x, y]);

    function openInCurrentTab() {
        chrome.tabs.update({ url: bookmark.url });
        onClose();
    }
    function openInNewTab() {
        chrome.tabs.create({ url: bookmark.url, active: true });
        onClose();
    }
    function openInBackgroundTab() {
        chrome.tabs.create({ url: bookmark.url, active: false });
        onClose();
    }
    function openInNewWindow() {
        chrome.windows.create({ url: bookmark.url });
        onClose();
    }
    async function openInPrivateWindow() {
        try {
            await chrome.windows.create({ url: bookmark.url, incognito: true });
        } catch {
            // Extension not permitted in private windows
        }
        onClose();
    }


    return (
        <ul ref={menuRef} className="context-menu" style={{ top: y, left: x }}>
            <li onClick={openInCurrentTab}>{t('contextMenu.openInCurrentTab')}</li>
            <li onClick={openInNewTab}>{t('contextMenu.openInNewTab')}</li>
            <li onClick={openInBackgroundTab}>{t('contextMenu.openInBackgroundTab')}</li>
            <li onClick={openInNewWindow}>{t('contextMenu.openInNewWindow')}</li>
            <li onClick={openInPrivateWindow}>{t('contextMenu.openInPrivateWindow')}</li>
            <li role="separator" />
            <li className="danger" onClick={() => { onDelete(bookmark.id); onClose(); }}>{t('contextMenu.delete')}</li>
            <li onClick={() => { onEdit(bookmark); onClose(); }}>{t('contextMenu.edit')}</li>
        </ul>
    );
}
