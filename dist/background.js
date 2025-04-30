// side-panel on install
chrome.runtime.onInstalled.addListener(() => {
    if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
      chrome.sidePanel
        .setPanelBehavior({ openPanelOnActionClick: true })
        .catch(console.error);
    } else {
      console.warn('chrome.sidePanel.setPanelBehavior not available');
    }
  });
  