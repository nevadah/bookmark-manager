import { StorageProvider } from "./types";
import { Settings } from "../types";
import { FileSystemStorageProvider } from "./file-system";
import { BrowserStorageProvider } from "./browser";

export function createStorageProvider(settings: Settings): StorageProvider {
    switch (settings.storageBackend) {
        case 'file':
            return new FileSystemStorageProvider();
        case 'browser':
            return new BrowserStorageProvider();
        default: {
            const _exhaustive: never = settings.storageBackend;
            throw new Error(`Unknown storage backend: ${String(_exhaustive)}`);
        }
    }
}