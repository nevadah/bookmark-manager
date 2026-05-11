interface FilePickerAcceptType {
    description?: string;
    accept: Record<string, string[]>;
}

interface SaveFilePickerOptions {
    suggestedName?: string;
    types?: FilePickerAcceptType[];
}

interface OpenFilePickerOptions {
    types?: FilePickerAcceptType[];
    multiple?: boolean;
}

interface FileSystemFileHandle {
    requestPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
}

interface Window {
    showSaveFilePicker(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>;
    showOpenFilePicker(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>;
}

declare module "*.css";