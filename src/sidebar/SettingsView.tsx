import { useState, FormEvent, useEffect } from "react";
import { Settings, AIProviderID, StorageBackend } from '../shared/types';
import { saveFileHandle, getFileHandle } from "../shared/storage/file-handle-store";

interface SettingsViewProps {
    settings: Settings;
    onSave: (settings: Settings) => void;
    onImport: () => Promise<{ imported: number; skipped: number }>;
}

export function SettingsView({ settings, onSave, onImport }: SettingsViewProps) {
    const [aiProvider, setAIProvider] = useState<AIProviderID>(settings.aiProvider);
    const [aiApiKey, setAIApiKey] = useState(settings.aiApiKey);
    const [storageBackend, setStorageBackend] = useState<StorageBackend>(settings.storageBackend);
    const [azureEndpoint, setAzureEndpoint] = useState(settings.azureEndpoint ?? '');
    const [azureDeployment, setAzureDeployment] = useState(settings.azureDeployment ?? '');
    const [openRouterModel, setOpenRouterModel] = useState(settings.openRouterModel ?? '');
    const [fileHandleName, setFileHandleName] = useState<string | null>(null);
    const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
    const openInNewTab = settings.openInNewTab ?? true;

    function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        // build Settings object and call onSave
        const newSettings: Settings = {
            aiProvider,
            aiApiKey,
            storageBackend,
            openInNewTab
        };
        if (aiProvider === 'azure-openai') {
            newSettings.azureEndpoint = azureEndpoint;
            newSettings.azureDeployment = azureDeployment;
        } else if (aiProvider === 'openrouter') {
            newSettings.openRouterModel = openRouterModel;
        }
        onSave(newSettings);
    }

    async function handleSelectFile() {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: 'bookmarks.json',
                types: [{ description: 'JSON Files', accept: {'application/json': ['.json']} }]
            });
            await saveFileHandle(handle);
            setFileHandleName(handle.name);
        } catch {
            // user cancelled - do nothing
        }
    }

    async function handleImport() {
        const result = await onImport();
        setImportResult(result);
    }

    useEffect(() => {
        if (settings.storageBackend === 'file') {
            getFileHandle().then((handle) => {
                if (handle) {
                    setFileHandleName(handle.name);
                }
            });
        }
    }, [settings.storageBackend]);

    return (
        <div className="settings-view">
            <form onSubmit={handleSubmit}>
                <div>
                    <label>
                        AI Provider:
                        <select value={aiProvider} onChange={(e) => setAIProvider(e.target.value as AIProviderID)}>
                            <option value="anthropic">Anthropic</option>
                            <option value="openai">OpenAI</option>
                            <option value="azure-openai">Azure OpenAI</option>
                            <option value="openrouter">OpenRouter</option>
                        </select>
                    </label>
                </div>
                <div>
                    <label>
                        AI API Key:
                        <input type="password" value={aiApiKey} onChange={(e) => setAIApiKey(e.target.value)} />
                    </label>
                </div>
                {aiProvider === 'azure-openai' && (
                    <>
                        <div>
                            <label>
                                Azure Endpoint:
                                <input type="text" value={azureEndpoint} onChange={(e) => setAzureEndpoint(e.target.value)} />
                            </label>
                        </div>
                        <div>
                            <label>
                                Azure Deployment:
                                <input type="text" value={azureDeployment} onChange={(e) => setAzureDeployment(e.target.value)} />
                            </label>
                        </div>
                    </>
                )}
                {aiProvider === 'openrouter' && (
                    <div>
                        <label>
                            OpenRouter Model:
                            <input type="text" value={openRouterModel} onChange={(e) => setOpenRouterModel(e.target.value)} />
                        </label>
                    </div>
                )}
                <div>
                    <label>
                        Storage Backend:
                        <select value={storageBackend} onChange={(e) => setStorageBackend(e.target.value as StorageBackend)}>
                            <option value="browser">Browser</option>
                            <option value="file">File</option>
                        </select>
                    </label>
                </div>
                {storageBackend === 'file' && (
                    <div>
                        <button type="button" onClick={handleSelectFile}>Select File...</button>
                        {fileHandleName && <span>Selected File: {fileHandleName}</span>}
                    </div>
                )}
                <label className="checkbox-label">
                    <input
                        type="checkbox"
                        checked={openInNewTab}
                        onChange={(e) => onSave({ ...settings, openInNewTab: e.target.checked })}
                    />
                    Open bookmarks in new tab
                </label>
                <button type="submit" disabled={storageBackend === 'file' && !fileHandleName}>Save Settings</button>
            </form>
            <div className="import-section">
                <button type="button" onClick={handleImport}>Import from Browser</button>
                {importResult && (
                    <p>Imported {importResult.imported} bookmark{importResult.imported !== 1 ? 's' : ''}
                    {importResult.skipped > 0 ? ` (${importResult.skipped} skipped as duplicates)` : ''}.</p>
                )}
            </div>
        </div>
    );
}