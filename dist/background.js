// background.js

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

// NEW: Listener to handle fetching the survey JWT, bypassing CORS
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_SURVEY_JWT') {
    const { forwardLink, csrfToken } = request.payload;

    const fetchJwt = async () => {
      try {
        const response = await fetch(forwardLink, {
          headers: { 'x-csrf-token': csrfToken },
          redirect: 'manual', // We need to read the redirect header
        });

        const locationHeader = response.headers.get('Location');
        if (!locationHeader) {
          throw new Error('Redirect location header not found in background fetch.');
        }

        const jwt = new URL(locationHeader).searchParams.get('jwt');
        if (!jwt) {
          throw new Error('JWT not found in redirect URL.');
        }

        sendResponse({ success: true, jwt: jwt });
      } catch (error) {
        console.error('Background script fetch failed:', error);
        sendResponse({ success: false, error: error.message });
      }
    };

    fetchJwt();
    return true; // Indicates that the response is sent asynchronously
  }
});