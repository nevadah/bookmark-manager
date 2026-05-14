import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { Settings, AIProviderID, StorageBackend } from '@bookmark-manager/shared';
import { saveFileHandle, getFileHandle } from "../storage/file-handle-store";

interface SettingsViewProps {
    settings: Settings;
    apiKey: string;
    onSave: (settings: Settings, apiKey: string) => void;
    onImport: () => Promise<{ imported: number; skipped: number }>;
    serverToken: string;
    onLogin: (token: string) => void;
    onLogout: () => void;
}

export function SettingsView({ settings, apiKey, onSave, onImport, serverToken, onLogin, onLogout }: SettingsViewProps) {
    const { t } = useTranslation();
    const [aiProvider, setAIProvider] = useState<AIProviderID>(settings.aiProvider);
    const [aiApiKey, setAIApiKey] = useState(apiKey);
    const [storageBackend, setStorageBackend] = useState<StorageBackend>(settings.storageBackend);
    const [serverUrl, setServerUrl] = useState(settings.serverUrl ?? '');
    const [azureEndpoint, setAzureEndpoint] = useState(settings.azureEndpoint ?? '');
    const [azureDeployment, setAzureDeployment] = useState(settings.azureDeployment ?? '');
    const [openRouterModel, setOpenRouterModel] = useState(settings.openRouterModel ?? '');
    const [fileHandleName, setFileHandleName] = useState<string | null>(null);
    const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
    const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
    const [authEmail, setAuthEmail] = useState('');
    const [authPassword, setAuthPassword] = useState('');
    const [authPasswordConfirm, setAuthPasswordConfirm] = useState('');
    const [authError, setAuthError] = useState<string | null>(null);
    const openInNewTab = settings.openInNewTab ?? true;
    const fileSystemSupported = typeof window.showSaveFilePicker === 'function';

    function buildSettings(overrides?: Partial<Settings>): Settings {
        const provider = overrides?.aiProvider ?? aiProvider;
        const backend = overrides?.storageBackend ?? storageBackend;
        const s: Settings = {
            aiProvider: provider,
            storageBackend: backend,
            serverUrl: overrides?.serverUrl ?? serverUrl,
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

    async function handleOpenExistingFile() {
        try {
            const [handle] = await window.showOpenFilePicker({
                types: [{ description: 'JSON Files', accept: {'application/json': ['.json']} }]
            });
            const permission = await handle.requestPermission({ mode: 'readwrite' });
            if (permission !== 'granted') return;
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

    async function handleSignIn() {
        setAuthError(null);
        if (!serverUrl) {
            setAuthError(t('settings.serverUrlRequired'));
            return;
        }
        try {            
            const response = await fetch(`${serverUrl.replace(/\/+$/, '')}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: authEmail, password: authPassword }),
            });
            if (!response.ok) {
                setAuthError(t('settings.loginFailed'));
                return;
            }
            const data = await response.json();
            onLogin(data.token);
            setAuthEmail('');
            setAuthPassword('');
            setAuthPasswordConfirm('');
        } catch {
            setAuthError(t('settings.loginFailed'));
        }
    }

    async function handleSignUp() {
        setAuthError(null);
        if (!serverUrl) {
            setAuthError(t('settings.serverUrlRequired'));
            return;
        }
        if (authPassword !== authPasswordConfirm) {
            setAuthError(t('settings.passwordMismatch'));
            return;
        }
        try {
            const response = await fetch(`${serverUrl.replace(/\/+$/, '')}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: authEmail, password: authPassword }),
            });
            if (!response.ok) {
                setAuthError(t('settings.signupFailed'));
                return;
            }
            const data = await response.json();
            onLogin(data.token);
            setAuthEmail('');
            setAuthPassword('');
            setAuthPasswordConfirm('');
        } catch {
            setAuthError(t('settings.signupFailed'));
        }
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
            <div className="settings-fields">
                {storageBackend !== 'server' && (
                    <>
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
                    </>
                )}
                <div>
                    <label>
                        {t('settings.storageBackend')}
                        <select value={storageBackend}
                            onChange={(e) => {
                                const b = e.target.value as StorageBackend;
                                setStorageBackend(b);
                                if (b === 'file' && !fileHandleName) return;
                                if (b === 'server') return;
                                onSave(buildSettings({ storageBackend: b }), aiApiKey);
                            }}>
                            <option value="browser">{t('settings.storageBrowser')}</option>
                            {fileSystemSupported && <option value="file">{t('settings.storageFile')}</option>}
                            <option value="server">{t('settings.storageServer')}</option>
                        </select>
                    </label>
                </div>
                {storageBackend === 'file' && (
                    <div className="file-storage-controls">
                        <button type="button" onClick={handleSelectFile}>{t('settings.newFile')}</button>
                        <button type="button" onClick={handleOpenExistingFile}>{t('settings.openExistingFile')}</button>
                        {fileHandleName && <span>{t('settings.selectedFile', { name: fileHandleName })}</span>}
                    </div>
                )}
                {storageBackend === 'server' && (
                    <div className="server-auth">
                        <label>
                            {t('settings.serverUrl')}
                            <input type ="text" value={serverUrl ?? ''} onChange={(e) => setServerUrl(e.target.value)} onBlur={(e) => onSave(buildSettings({ serverUrl: e.target.value }), aiApiKey)} />
                        </label>
                    </div>
                )}
                {storageBackend === 'server' && (
                    <>
                        {serverToken ? (
                            <div className="server-auth auth-status">
                                <p>{t('settings.loggedIn')}</p>
                                <button type="button" onClick={onLogout}>{t('settings.logout')}</button>
                            </div>
                        ) : (
                            <div className="server-auth">
                                {authMode === 'signin' ? (
                                    <>
                                        <label>
                                            {t('settings.email')}
                                            <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} />
                                        </label>
                                        <label>
                                            {t('settings.password')}
                                            <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} minLength={8} maxLength={128}/>
                                        </label>
                                        {authError && <p className="auth-error">{authError}</p>}
                                        <div className="auth-buttons">
                                            <button type="button" onClick={handleSignIn}>{t('settings.signIn')}</button>
                                            <button type="button" onClick={() => setAuthMode('signup')}>{t('settings.signUp')}</button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <label>
                                            {t('settings.email')}
                                            <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} />
                                        </label>
                                        <label>
                                            {t('settings.password')}
                                            <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} minLength={8} maxLength={128} />
                                        </label>
                                        <label>
                                            {t('settings.confirmPassword')}
                                            <input type="password" value={authPasswordConfirm} onChange={(e) => setAuthPasswordConfirm(e.target.value)} minLength={8} maxLength={128} />
                                        </label>
                                        {authError && <p className="auth-error">{authError}</p>}
                                        <div className="auth-buttons">
                                            <button type="button" onClick={handleSignUp}>{t('settings.signUp')}</button>
                                            <button type="button" onClick={() => setAuthMode('signin')}>{t('settings.cancel')}</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </>)}
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
