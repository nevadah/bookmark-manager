import { useEffect, useState } from "react";
import { Bookmark } from "../shared/types";
import { BookmarkLeaf } from "./BookmarkLeaf";

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
    const [expandSignal, setExpandSignal] = useState<{ expanded: boolean, version: number } | null>(null);
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
            <div className="bookmarks-toolbar">
                <button onClick={handleSaveCurrentPage}>Save Current Page</button>
                {tree.size > 0 && (
                    <>
                        <button onClick={() => setExpandSignal(s => ({ expanded: true, version: (s?.version ?? 0) + 1 }))}>Expand All</button>
                        <button onClick={() => setExpandSignal(s => ({ expanded: false, version: (s?.version ?? 0) + 1 }))}>Collapse All</button>
                    </>
                )}
            </div>
            <ul className="tag-tree">
                {Array.from(tree.values()).map((node) => (
                    <TagTreeNode key={node.fullPath} node={node} onUpdate={onUpdate} onDelete={onDelete} onEdit={onEdit} expandSignal={expandSignal} />
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

function TagTreeNode({ node, onUpdate, onDelete, onEdit, expandSignal }: {
    node: TagNode;
    onUpdate: (bookmark: Bookmark) => void;
    onDelete: (id: string) => void;
    onEdit: (bookmark: Bookmark) => void;
    expandSignal?: { expanded: boolean; version: number } | null;
}) {
    const [expanded, setExpanded] = useState(true);
    const hasBookmarks = node.bookmarks.length > 0;

    useEffect(() => {
        if (expandSignal != null) {
            setExpanded(expandSignal.expanded);
        }
    }, [expandSignal]);

    return (
        <li className="tree-node">
            <span className="tree-label" onClick={() => setExpanded(!expanded)}>
                {expanded ? '▼' : '▶'} {node.name}
            </span>
            {expanded && (
                <ul>
                    {Array.from(node.children.values()).map((child) => (
                        <TagTreeNode key={child.fullPath} node={child} onUpdate={onUpdate} onDelete={onDelete} onEdit={onEdit} expandSignal={expandSignal} />
                    ))}
                    {hasBookmarks && node.bookmarks.map((bookmark) => (
                        <BookmarkLeaf key={bookmark.id} bookmark={bookmark} onUpdate={onUpdate} onDelete={onDelete} onEdit={onEdit} />
                    ))}
                </ul>
            )}
        </li>
    );
}
