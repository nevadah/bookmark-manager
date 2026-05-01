import { StorageProvider } from "./types";
import { Settings } from "../types";

export function createStorageProvider(settings: Settings): StorageProvider {
    switch (settings.storageBackend) {
        case 'file':
            throw new Error(`File storage backend is not implemented yet.`);
        case 'browser':
            throw new Error(`Browser storage backend is not implemented yet.`);
        default: {
            const _exhaustive: never = settings.storageBackend;
            throw new Error(`Unknown storage backend: ${String(_exhaustive)}`);
        }
    }
}