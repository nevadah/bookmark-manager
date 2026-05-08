chrome.runtime.onInstalled.addListener(() => {
    if ('sidePanel' in chrome) {
        chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    }
});

chrome.action.onClicked.addListener(() => {
    if (!('sidePanel' in chrome)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).browser?.sidebarAction?.toggle();
    }
});

chrome.runtime.onMessage.addListener((_message, _sender, _sendResponse) => {
    // Message handlers will be added here as the sidebar UI is built.
});
