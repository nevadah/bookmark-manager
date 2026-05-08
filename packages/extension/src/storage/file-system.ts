import { RootData } from '@bookmark-manager/shared';
import { StorageProvider } from './types';
import { getFileHandle } from './file-handle-store';

interface FileSystemFileHandleWithPermissions extends FileSystemFileHandle {
    queryPermission(descriptor?: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
    requestPermission(descriptor?: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
}

export class FileSystemStorageProvider implements StorageProvider {

    private async getHandleWithPermissions(): Promise<FileSystemFileHandleWithPermissions> {
        const handle = await getFileHandle();

        if (!handle) {
            throw new Error('First-run setup required: Please select a file to store your bookmarks.');
        }

        const h = handle as FileSystemFileHandleWithPermissions;
        const permission = await h.queryPermission({ mode: 'readwrite' });

        if (permission !== 'granted') {
            await h.requestPermission({ mode: 'readwrite' });
        }

        return h;
    }

    async readData(): Promise<RootData> {
        const handle = await this.getHandleWithPermissions();
        const file = await handle.getFile();
        const text = await file.text();
        return JSON.parse(text) as RootData;
    }

    async writeData(data: RootData): Promise<void> {
        const handle = await this.getHandleWithPermissions();
        const writable = await handle.createWritable();
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();
    }
}