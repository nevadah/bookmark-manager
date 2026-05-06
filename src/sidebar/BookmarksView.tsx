import { useState } from "react";
import { Bookmark } from "../shared/types";

interface TagNode {
    name: string;
    fullPath: string;
    children: Map<string, TagNode>;
    bookmarks: Bookmark[];
}

interface BookmarksViewProps {
    bookmarks: Bookmark[];
    onAdd: (bookmark: Bookmark) => void;
    onUpdate: (bookmark: Bookmark) => void;
    onDelete: (id: string) => void;
    onEdit: (bookmark: Bookmark) => void;
}

function buildTagTree(bookmarks: Bookmark[]): Map<string, TagNode> {
    const root = new Map<string, TagNode>();

    for (const bookmark of bookmarks) {
        for (const tag of bookmark.tags) {
            const segments = tag.split('/');
            let currentNode = root;
            let path = '';

            for (const segment of segments) {
                path = path ? `${path}/${segment}` : segment;
                if (!currentNode.has(segment)) {
                    currentNode.set(segment, { name: segment, fullPath: path, children: new Map(), bookmarks: [] });
                }
                const node = currentNode.get(segment)!;
                if (path === tag) {
                    node.bookmarks.push(bookmark);
                }
                currentNode = node.children;
            }
        }
    }

    return root;
}

export function BookmarksView({ bookmarks, onAdd, onUpdate, onDelete, onEdit }: BookmarksViewProps) {
    const tree = buildTagTree(bookmarks);
    const untagged = bookmarks.filter((b) => b.tags.length === 0);

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

    if (bookmarks.length === 0) {
        return (
            <div>
                <button onClick={handleSaveCurrentPage}>Save Current Page</button>
                <p className="empty-state">No bookmarks yet. Save a page to get started.</p>
            </div>
        );
    }

    return (
        <div>
            <button onClick={handleSaveCurrentPage}>Save Current Page</button>
            <ul className="tag-tree">
                {Array.from(tree.values()).map((node) => (
                    <TagTreeNode key={node.fullPath} node={node} onUpdate={onUpdate} onDelete={onDelete} onEdit={onEdit} />
                ))}
                {untagged.length > 0 && (
                    <li className="tree-node">
                        <span className="tree-label">Untagged</span>
                        <ul>
                            {untagged.map((bookmark) => (
                                <BookmarkLeaf key={bookmark.id} bookmark={bookmark} onUpdate={onUpdate} onDelete={onDelete} onEdit={onEdit} />
                            ))}
                        </ul>
                    </li>
                )}
            </ul>
        </div>
    );
}

function TagTreeNode({ node, onUpdate, onDelete, onEdit }: {
    node: TagNode;
    onUpdate: (bookmark: Bookmark) => void;
    onDelete: (id: string) => void;
    onEdit: (bookmark: Bookmark) => void;
}) {
    const [expanded, setExpanded] = useState(true);
    const hasBookmarks = node.bookmarks.length > 0;

    return (
        <li className="tree-node">
            <span className="tree-label" onClick={() => setExpanded(!expanded)}>
                {expanded ? '▼' : '▶'} {node.name}
            </span>
            {expanded && (
                <ul>
                    {Array.from(node.children.values()).map((child) => (
                        <TagTreeNode key={child.fullPath} node={child} onUpdate={onUpdate} onDelete={onDelete} onEdit={onEdit} />
                    ))}
                    {hasBookmarks && node.bookmarks.map((bookmark) => (
                        <BookmarkLeaf key={bookmark.id} bookmark={bookmark} onUpdate={onUpdate} onDelete={onDelete} onEdit={onEdit} />
                    ))}
                </ul>
            )}
        </li>
    );
}

function BookmarkLeaf({ bookmark, onUpdate: _onUpdate, onDelete, onEdit }: {
    bookmark: Bookmark;
    onUpdate: (bookmark: Bookmark) => void;
    onDelete: (id: string) => void;
    onEdit: (bookmark: Bookmark) => void;
}) {
    return (
        <li className="bookmark-leaf">
            <div className="bookmark-header">
                <a href={bookmark.url} target="_blank" rel="noopener noreferrer">{bookmark.title}</a>
                <button type="button" className="delete" onClick={() => onDelete(bookmark.id)}>✕</button>
                <button type="button" className="edit" onClick={() => onEdit(bookmark)}>
                    ✎
                </button>
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
