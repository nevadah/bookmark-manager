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
    openInNewTab: boolean;
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

export function BookmarksView({ bookmarks, onAdd, onUpdate, onDelete, onEdit, openInNewTab }: BookmarksViewProps) {
    const [expandSignal, setExpandSignal] = useState<{ expanded: boolean, version: number } | null>(null);
    const [filterQuery, setFilterQuery] = useState('');

    const filtered = filterQuery.trim().toLowerCase()
        ? bookmarks.filter((b) => {
            const q = filterQuery.toLowerCase();
            return (
                b.title.toLowerCase().includes(q) ||
                b.url.toLowerCase().includes(q) ||
                b.tags.some(tag => tag.toLowerCase().includes(q)) ||
                b.description.toLowerCase().includes(q)
            );
        })
        : bookmarks;

    const tree = buildTagTree(filtered);
    const untagged = filtered.filter((b) => b.tags.length === 0);

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
                <button className="icon-btn" onClick={handleSaveCurrentPage} data-tooltip="Save Current Page">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M3 2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v12l-5-2.5L3 14V2z"/>
                    </svg>
                </button>
                {tree.size > 0 && (
                    <>
                        <button className="icon-btn" onClick={() => setExpandSignal(s => ({ expanded: true, version: (s?.version ?? 0) + 1 }))} data-tooltip="Expand All">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="4,3 8,7 12,3"/>
                                <polyline points="4,8 8,12 12,8"/>
                            </svg>
                        </button>
                        <button className="icon-btn" onClick={() => setExpandSignal(s => ({ expanded: false, version: (s?.version ?? 0) + 1 }))} data-tooltip="Collapse All">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="4,8 8,4 12,8"/>
                                <polyline points="4,13 8,9 12,13"/>
                            </svg>
                        </button>
                    </>
                )}
                <input
                    type="search"
                    placeholder="Search bookmarks..."
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                />
            </div>
            {filterQuery.trim() && filtered.length === 0
                ? <p className="empty-state">No bookmarks match your search.</p>
                :
                <ul className="tag-tree">
                    {Array.from(tree.values()).map((node) => (
                        <TagTreeNode key={node.fullPath} node={node} onUpdate={onUpdate} onDelete={onDelete} onEdit={onEdit} expandSignal={expandSignal} openInNewTab={openInNewTab} />
                    ))}
                    {untagged.length > 0 && (
                        <li className="tree-node">
                            <span className="tree-label">Untagged</span>
                            <ul>
                                {untagged.map((bookmark) => (
                                    <BookmarkLeaf key={bookmark.id} bookmark={bookmark} onUpdate={onUpdate} onDelete={onDelete} onEdit={onEdit} openInNewTab={openInNewTab} />
                                ))}
                            </ul>
                        </li>
                    )}
                </ul>
            }
        </div>
    );
}

function TagTreeNode({ node, onUpdate, onDelete, onEdit, expandSignal, openInNewTab }: {
    node: TagNode;
    onUpdate: (bookmark: Bookmark) => void;
    onDelete: (id: string) => void;
    onEdit: (bookmark: Bookmark) => void;
    expandSignal?: { expanded: boolean; version: number } | null;
    openInNewTab: boolean;
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
                        <TagTreeNode key={child.fullPath} node={child} onUpdate={onUpdate} onDelete={onDelete} onEdit={onEdit} expandSignal={expandSignal} openInNewTab={openInNewTab} />
                    ))}
                    {hasBookmarks && node.bookmarks.map((bookmark) => (
                        <BookmarkLeaf key={bookmark.id} bookmark={bookmark} onUpdate={onUpdate} onDelete={onDelete} onEdit={onEdit} openInNewTab={openInNewTab} />
                    ))}
                </ul>
            )}
        </li>
    );
}
