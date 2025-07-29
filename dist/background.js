// background.js

console.log("Background script loaded. Storage-based communication enabled.");

chrome.webRequest.onBeforeRedirect.addListener(
  (details) => {
    // Extract the survey ID from the original URL (e.g., '68883da52e127624193aab12')
    const match = details.url.match(/installations\/([a-f0-9]+)\/service/);
    if (!match) return;
    
    const surveyId = match[1];

    // Check if it's the redirect we're looking for
    if (details.redirectUrl.includes("pluginsurveys-us1.staffbase.com/register?jwt=")) {
      const url = new URL(details.redirectUrl);
      const jwt = url.searchParams.get("jwt");

      if (jwt && surveyId) {
        // ✅ Store the JWT in chrome.storage, keyed by the survey ID
        const dataToStore = { [surveyId]: jwt };
        chrome.storage.local.set(dataToStore);
        console.log(`[Background] Stored JWT in storage for survey ID: ${surveyId}`);
      }
    }
  },
  { urls: ["*://app.staffbase.com/api/installations/*/service/frontend/forward"] }
);

// Side panel code
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch(console.error);
  }
});