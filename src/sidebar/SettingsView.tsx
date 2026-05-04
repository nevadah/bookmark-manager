import { useState, FormEvent } from "react";
import { Settings, AIProviderID, StorageBackend } from '../shared/types';

interface SettingsViewProps {
    settings: Settings;
    onSave: (settings: Settings) => void;
}

export function SettingsView({ settings, onSave }: SettingsViewProps) {
    const [aiProvider, setAIProvider] = useState<AIProviderID>(settings.aiProvider);
    const [aiApiKey, setAIApiKey] = useState(settings.aiApiKey);
    const [storageBackend, setStorageBackend] = useState<StorageBackend>(settings.storageBackend);
    const [azureEndpoint, setAzureEndpoint] = useState(settings.azureEndpoint ?? '');
    const [azureDeployment, setAzureDeployment] = useState(settings.azureDeployment ?? '');
    const [openRouterModel, setOpenRouterModel] = useState(settings.openRouterModel ?? '');

    function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        // build Settings object and call onSave
        const newSettings: Settings = {
            aiProvider,
            aiApiKey,
            storageBackend
        };
        if (aiProvider === 'azure-openai') {
            newSettings.azureEndpoint = azureEndpoint;
            newSettings.azureDeployment = azureDeployment;
        } else if (aiProvider === 'openrouter') {
            newSettings.openRouterModel = openRouterModel;
        }
        onSave(newSettings);
    }

    return (
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
            <button type="submit">Save Settings</button>
        </form>
    );
}