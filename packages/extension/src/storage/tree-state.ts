import { Bookmark } from "@bookmark-manager/shared";

const TREE_STATE_KEY = 'tagTreeState';

export async function getTreeState(): Promise<Record<string, boolean>> {
    const result = await chrome.storage.local.get(TREE_STATE_KEY);
    return result[TREE_STATE_KEY] ?? {};
}

export async function saveTreeState(state: Record<string, boolean>): Promise<void> {
    await chrome.storage.local.set({ [TREE_STATE_KEY]: state });
}

export function pruneTreeState(
    state: Record<string, boolean>,
    bookmarks: Bookmark[]
): Record<string, boolean> {
    const validPaths = new Set<string>();
    for (const bookmark of bookmarks) {
        for (const tag of bookmark.tags) {
            const segments = tag.split('/');
            let path = '';
            for (const segment of segments) {
                path = path ? `${path}/${segment}` : segment;
                validPaths.add(path);
            }
        }
    }
    return Object.fromEntries(
        Object.entries(state).filter(([path]) => validPaths.has(path))
    );
}
