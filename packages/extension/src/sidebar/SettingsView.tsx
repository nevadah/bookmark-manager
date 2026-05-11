import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { Settings, AIProviderID, StorageBackend } from '@bookmark-manager/shared';
import { saveFileHandle, getFileHandle } from "../storage/file-handle-store";

interface SettingsViewProps {
    settings: Settings;
    apiKey: string;
    onSave: (settings: Settings, apiKey: string) => void;
    onImport: () => Promise<{ imported: number; skipped: number }>;
}

export function SettingsView({ settings, apiKey, onSave, onImport }: SettingsViewProps) {
    const { t } = useTranslation();
    const [aiProvider, setAIProvider] = useState<AIProviderID>(settings.aiProvider);
    const [aiApiKey, setAIApiKey] = useState(apiKey);
    const [storageBackend, setStorageBackend] = useState<StorageBackend>(settings.storageBackend);
    const [azureEndpoint, setAzureEndpoint] = useState(settings.azureEndpoint ?? '');
    const [azureDeployment, setAzureDeployment] = useState(settings.azureDeployment ?? '');
    const [openRouterModel, setOpenRouterModel] = useState(settings.openRouterModel ?? '');
    const [fileHandleName, setFileHandleName] = useState<string | null>(null);
    const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
    const openInNewTab = settings.openInNewTab ?? true;
    const fileSystemSupported = typeof window.showSaveFilePicker === 'function';

    function buildSettings(overrides?: Partial<Settings>): Settings {
        const provider = overrides?.aiProvider ?? aiProvider;
        const backend = overrides?.storageBackend ?? storageBackend;
        const s: Settings = {
            aiProvider: provider,
            storageBackend: backend,
            openInNewTab: settings.openInNewTab ?? true
        };
        if (provider === 'azure-openai') {
            s.azureEndpoint = overrides?.azureEndpoint ?? azureEndpoint;
            s.azureDeployment = overrides?.azureDeployment ?? azureDeployment;
        }
        if (provider === 'openrouter') {
            s.openRouterModel = overrides?.openRouterModel ?? openRouterModel;
        }
        return s;
    }

    async function handleSelectFile() {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: 'bookmarks.json',
                types: [{ description: 'JSON Files', accept: {'application/json': ['.json']} }]
            });
            await saveFileHandle(handle);
            setFileHandleName(handle.name);
            onSave(buildSettings({ storageBackend: 'file' }), aiApiKey);
        } catch {
            // user cancelled
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
            <div>
                <div>
                    <label>
                        {t('settings.aiProvider')}
                        <select value={aiProvider}
                            onChange={(e) => {
                                const p = e.target.value as AIProviderID;
                                setAIProvider(p);
                                onSave(buildSettings({ aiProvider: p }), aiApiKey);
                            }}>
                            <option value="anthropic">Anthropic</option>
                            <option value="openai">OpenAI</option>
                            <option value="azure-openai">Azure OpenAI</option>
                            <option value="openrouter">OpenRouter</option>
                        </select>
                    </label>
                </div>
                <div>
                    <label>
                        {t('settings.aiApiKey')}
                        <input type="password" value={aiApiKey} onChange={(e) => setAIApiKey(e.target.value)} onBlur={() => onSave(buildSettings(), aiApiKey)} />
                    </label>
                </div>
                {aiProvider === 'azure-openai' && (
                    <>
                        <div>
                            <label>
                                {t('settings.azureEndpoint')}
                                <input type="text" value={azureEndpoint} onChange={(e) => setAzureEndpoint(e.target.value)} onBlur={() => onSave(buildSettings(), aiApiKey)} />
                            </label>
                        </div>
                        <div>
                            <label>
                                {t('settings.azureDeployment')}
                                <input type="text" value={azureDeployment} onChange={(e) => setAzureDeployment(e.target.value)} onBlur={() => onSave(buildSettings(), aiApiKey)} />
                            </label>
                        </div>
                    </>
                )}
                {aiProvider === 'openrouter' && (
                    <div>
                        <label>
                            {t('settings.openRouterModel')}
                            <input type="text" value={openRouterModel} onChange={(e) => setOpenRouterModel(e.target.value)} onBlur={() => onSave(buildSettings(), aiApiKey)} />
                        </label>
                    </div>
                )}
                <div>
                    <label>
                        {t('settings.storageBackend')}
                        <select value={storageBackend}
                            onChange={(e) => {
                                const b = e.target.value as StorageBackend;
                                setStorageBackend(b);
                                if (b === 'file' && !fileHandleName) return;
                                onSave(buildSettings({ storageBackend: b }), aiApiKey);
                            }}>
                            <option value="browser">{t('settings.storageBrowser')}</option>
                            {fileSystemSupported && <option value="file">{t('settings.storageFile')}</option>}
                        </select>
                    </label>
                </div>
                {storageBackend === 'file' && (
                    <div>
                        <button type="button" onClick={handleSelectFile}>{t('settings.selectFile')}</button>
                        {fileHandleName && <span>{t('settings.selectedFile', { name: fileHandleName })}</span>}
                    </div>
                )}
                <label className="checkbox-label">
                    <input
                        type="checkbox"
                        checked={openInNewTab}
                        onChange={(e) => onSave({ ...settings, openInNewTab: e.target.checked }, aiApiKey)}
                    />
                    {t('settings.openInNewTab')}
                </label>
            </div>
            <div className="import-section">
                <button type="button" onClick={handleImport}>{t('settings.importFromBrowser')}</button>
                {importResult && (
                    <p>
                        {importResult.skipped > 0
                            ? t('settings.importResultWithSkipped', { count: importResult.imported, skipped: importResult.skipped })
                            : t('settings.importResult', { count: importResult.imported })
                        }
                    </p>
                )}
            </div>
        </div>
    );
}
