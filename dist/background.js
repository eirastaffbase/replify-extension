// background.js

console.log("Background script loaded. Storage-based communication enabled.");

// Listener to capture survey JWTs from redirects
chrome.webRequest.onBeforeRedirect.addListener(
  (details) => {
    const match = details.url.match(/installations\/([a-f0-9]+)\/service/);
    if (!match) return;
    
    const surveyId = match[1];

    if (details.redirectUrl.includes("pluginsurveys-us1.staffbase.com/register?jwt=")) {
      const url = new URL(details.redirectUrl);
      const jwt = url.searchParams.get("jwt");

      if (jwt && surveyId) {
        chrome.storage.local.set({ [surveyId]: jwt });
        console.log(`[Background] Stored JWT for survey ID: ${surveyId}`);
      }
    }
  },
  { urls: ["*://app.staffbase.com/api/installations/*/service/frontend/forward"] }
);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'automationComplete') {
    console.log("[Background] Automation complete. Cleaning up leftover JWTs from storage...");
    chrome.storage.local.get(null, (items) => {
      const keysToRemove = Object.keys(items).filter(key => 
        // Simple check: if a key is a 24-character hex string, it's likely a survey ID
        /^[a-f0-9]{24}$/.test(key)
      );
      
      if (keysToRemove.length > 0) {
        chrome.storage.local.remove(keysToRemove, () => {
          console.log(`[Background] Removed ${keysToRemove.length} leftover survey JWTs.`);
        });
      } else {
        console.log("[Background] No leftover JWTs found to clean up.");
      }
    });
  }
});


// Side panel code
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch(console.error);
  }
});