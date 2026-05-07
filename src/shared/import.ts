import { Bookmark } from './types';

function walk(
    nodes: chrome.bookmarks.BookmarkTreeNode[],
    pathSegments: string[],
    result: Bookmark[]
): void {
    for (const node of nodes) {
        if (node.url) {
            result.push({
                id: crypto.randomUUID(),
                url: node.url,
                title: node.title || node.url,
                description: '',
                tags: pathSegments.length > 0 ? [pathSegments.join('/')] : [],
                aiSuggestedTags: [],
                faviconUrl: undefined,
                faviconCache: null,
                userModifiedTags: false,
                createdAt: node.dateAdded
                    ? new Date(node.dateAdded).toISOString()
                    : new Date().toISOString()
            });
        } else if (node.children) {
            walk(node.children, [...pathSegments, node.title.toLowerCase()], result);
        }
    }
}

export function importBrowserBookmarks(
    tree: chrome.bookmarks.BookmarkTreeNode[]
): Bookmark[] {
    const result: Bookmark[] = [];
    for (const container of tree[0]?.children ?? []) {
        if (container.children) {
            walk(container.children, [], result);
        }
    }
    return result;
}
