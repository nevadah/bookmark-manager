chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onMessage.addListener((_message, _sender, _sendResponse) => {
  // Message handlers will be added here as the sidebar UI is built.
});
