import { RootData, Bookmark } from "@bookmark-manager/shared";
import { StorageProvider } from "./types";
import { getServerToken } from "./credentials";

interface ServerBookmark {
    id: string;
    url: string;
    title: string;
    description: string;
    tags: string[];
    faviconUrl?: string;
    createdAt: string;
}

function toExtensionBookmark(serverBookmark: ServerBookmark): Bookmark {
    return {
        id: serverBookmark.id,
        url: serverBookmark.url,
        title: serverBookmark.title,
        description: serverBookmark.description,
        tags: serverBookmark.tags,
        aiSuggestedTags: [],
        userModifiedTags: false,
        faviconUrl: serverBookmark.faviconUrl,
        faviconCache: null,
        createdAt: serverBookmark.createdAt,
    };
}

function toServerPayload(bookmark: Bookmark) {
    return {
        id: bookmark.id,
        url: bookmark.url,
        title: bookmark.title,
        description: bookmark.description,
        tags: bookmark.tags,
        ...(bookmark.faviconUrl && { faviconUrl: bookmark.faviconUrl }),
    };
}

function isModified(a: Bookmark, b: Bookmark): boolean {
    return a.url !== b.url || a.title !== b.title || a.description !== b.description ||
        JSON.stringify(a.tags) !== JSON.stringify(b.tags) ||
        a.faviconUrl !== b.faviconUrl;
}

export class RemoteStorageProvider implements StorageProvider {
    private serverUrl: string;
    private cache = new Map<string, Bookmark>();

    constructor(serverUrl: string) {
        this.serverUrl = serverUrl.replace(/\/+$/, '');
    }

    private async getHeaders() {
        const token = await getServerToken();
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
        };
    }

    async readData (): Promise<RootData> {
        const response = await fetch(`${this.serverUrl}/bookmarks`, {
            headers: await this.getHeaders(),
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch bookmarks: ${response.statusText}`);
        }
        const data = await response.json();
        this.cache.clear();
        data.forEach((bookmark: ServerBookmark) => {
            const extBookmark = toExtensionBookmark(bookmark);
            this.cache.set(extBookmark.id, extBookmark);
        });
        return {
            bookmarks: Array.from(this.cache.values()),
            version: '1.0',
        };
    }

    async writeData(newData: RootData): Promise<void> {
        const newMap: Map<string, Bookmark> = new Map<string, Bookmark>(newData.bookmarks.map(b => [b.id, b]));

        // Collect fetch calls into an array and execute in parallel with Promise.all
        // For each id in this.cache that is not in newMap, delete from server
        const headers = await this.getHeaders();
        const fetchPromises: Promise<Response>[] = [];
        for (const id of this.cache.keys()) {
            if (!newMap.has(id)) {
                fetchPromises.push(fetch(`${this.serverUrl}/bookmarks/${id}`, {
                    method: 'DELETE',
                    headers: headers,
                }));
            }
        }

        // for each bookmark in newData.bookmarks, if not in cache, create on server. If in cache but different, update on server
        for (const bookmark of newData.bookmarks) {
            const cached = this.cache.get(bookmark.id);
            if (!cached) {
                fetchPromises.push(fetch(`${this.serverUrl}/bookmarks`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(toServerPayload(bookmark)),
                }));
            } else if (isModified(cached, bookmark)) {
                fetchPromises.push(fetch(`${this.serverUrl}/bookmarks/${bookmark.id}`, {
                    method: 'PATCH',
                    headers: headers,
                    body: JSON.stringify(toServerPayload(bookmark)),
                }));
            }
        }

        await Promise.all(fetchPromises);

        // Update cache to match newData after successful writes
        this.cache.clear();
        newData.bookmarks.forEach(bookmark => {
            this.cache.set(bookmark.id, bookmark);
        });
    }
}
