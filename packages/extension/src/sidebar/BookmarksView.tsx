import { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { Bookmark } from "@bookmark-manager/shared";
import { BookmarkLeaf } from "./BookmarkLeaf";
import { getTreeState, pruneTreeState, saveTreeState } from "../storage/tree-state";

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
    const sortedBookmarks = [...bookmarks].sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()));

    for (const bookmark of sortedBookmarks) {
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
    const { t } = useTranslation();
    const [treeState, setTreeState] = useState<Record<string, boolean>>({});
    const [filterQuery, setFilterQuery] = useState('');

    useEffect(() => {
        getTreeState().then(setTreeState);
    }, []);

    useEffect(() => {
        const pruned = pruneTreeState(treeState, bookmarks);
        if (Object.keys(pruned).length !== Object.keys(treeState).length) {
            setTreeState(pruned);
            saveTreeState(pruned);
        }
    }, [bookmarks])

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
    const untagged = filtered.filter((b) => b.tags.length === 0)
        .sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()));

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

    function collectPaths(nodes: Map<string, TagNode>): string[] {
        const paths: string[] = [];
        function walk(current: Map<string, TagNode>) {
            for (const node of current.values()) {
                paths.push(node.fullPath);
                walk(node.children);
            }
        }
        walk(nodes);
        return paths;
    }

    function handleExpandAll() {
        const allPaths = collectPaths(tree);
        const updated = Object.fromEntries(allPaths.map(p => [p, true]));
        setTreeState(updated);
        saveTreeState(updated);
    }

    function handleCollapseAll() {
        const allPaths = collectPaths(tree);
        const updated = Object.fromEntries(allPaths.map(p => [p, false]));
        setTreeState(updated);
        saveTreeState(updated);
    }

    function handleToggleNode(path: string, expanded: boolean) {
        const updated = { ...treeState, [path]: expanded };
        setTreeState(updated);
        saveTreeState(updated);
    }

    if (bookmarks.length === 0) {
        return (
            <div>
                <button onClick={handleSaveCurrentPage}>{t('bookmarksView.saveCurrentPage')}</button>
                <p className="empty-state">{t('bookmarksView.emptyState')}</p>
            </div>
        );
    }

    return (
        <div>
            <div className="bookmarks-toolbar">
                <button className="icon-btn" onClick={handleSaveCurrentPage} data-tooltip={t('bookmarksView.saveCurrentPage')}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M3 2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v12l-5-2.5L3 14V2z" />
                    </svg>
                </button>
                {tree.size > 0 && (
                    <>
                        <button className="icon-btn" onClick={handleExpandAll} data-tooltip={t('bookmarksView.expandAll')}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="4,3 8,7 12,3" />
                                <polyline points="4,8 8,12 12,8" />
                            </svg>
                        </button>
                        <button className="icon-btn" onClick={handleCollapseAll} data-tooltip={t('bookmarksView.collapseAll')}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="4,8 8,4 12,8" />
                                <polyline points="4,13 8,9 12,13" />
                            </svg>
                        </button>
                    </>
                )}
                <input
                    type="search"
                    placeholder={t('bookmarksView.filterPlaceholder')}
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                />
            </div>
            {filterQuery.trim() && filtered.length === 0
                ? <p className="empty-state">{t('bookmarksView.noResults')}</p>
                :
                <ul className="tag-tree">
                    {Array.from(tree.values())
                        .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
                        .map((node) => (
                            <TagTreeNode key={node.fullPath} node={node} onUpdate={onUpdate} onDelete={onDelete} onEdit={onEdit} treeState={treeState} onToggle={handleToggleNode} openInNewTab={openInNewTab} />
                        ))}
                    {untagged.length > 0 && (
                        <li className="tree-node">
                            <span className="tree-label">{t('bookmarksView.untagged')}</span>
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

function TagTreeNode({ node, onUpdate, onDelete, onEdit, treeState, onToggle, openInNewTab }: {
    node: TagNode;
    onUpdate: (bookmark: Bookmark) => void;
    onDelete: (id: string) => void;
    onEdit: (bookmark: Bookmark) => void;
    treeState: Record<string, boolean>;
    onToggle: (path: string, expanded: boolean) => void;
    openInNewTab: boolean;
}) {
    const expanded = treeState[node.fullPath] ?? true;
    const hasBookmarks = node.bookmarks.length > 0;

    return (
        <li className="tree-node">
            <span className="tree-label" onClick={() => onToggle(node.fullPath, !expanded)}>
                {expanded ? '▼' : '▶'} {node.name}
            </span>
            {expanded && (
                <ul>
                    {Array.from(node.children.values())
                        .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
                        .map((child) => (
                            <TagTreeNode key={child.fullPath} node={child} onUpdate={onUpdate} onDelete={onDelete} onEdit={onEdit} treeState={treeState} onToggle={onToggle} openInNewTab={openInNewTab} />
                        ))}
                    {hasBookmarks && node.bookmarks.map((bookmark) => (
                        <BookmarkLeaf key={bookmark.id} bookmark={bookmark} onUpdate={onUpdate} onDelete={onDelete} onEdit={onEdit} openInNewTab={openInNewTab} />
                    ))}
                </ul>
            )}
        </li>
    );
}
