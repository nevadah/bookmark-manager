chrome.action.onClicked.addListener(() => {
  chrome.sidePanel.open({ windowId: undefined as unknown as number });
});
