export type AIProviderID = 'anthropic' | 'openai' | 'azure-openai' | 'openrouter';
export type RootDataVersion = '1.0';

export interface Settings {
    aiProvider: AIProviderID;
    aiApiKey: string;
    dataFilePath: string;
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
}

export interface RootData {
    version: RootDataVersion;
    settings: Settings;
    bookmarks: Bookmark[];
}
