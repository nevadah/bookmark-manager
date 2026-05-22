export type AIProviderID = 'anthropic' | 'openai' | 'azure-openai' | 'openrouter';
export type StorageBackend = 'file' | 'browser' | 'server';

export type RootDataVersion = '1.0';

export interface Settings {
    aiProvider: AIProviderID;
    storageBackend: StorageBackend;
    serverUrl?: string;
    azureEndpoint?: string;
    azureDeployment?: string;
    openRouterModel?: string;
    openInNewTab?: boolean;
}

export interface Bookmark {
    id: string;
    url: string;
    title: string;
    description: string;
    tags: string[];
    aiSuggestedTags: string[];
    faviconUrl?: string;
    faviconCache: null;
    userModifiedTags: boolean;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
}

export interface RootData {
    version: RootDataVersion;
    bookmarks: Bookmark[];
}
