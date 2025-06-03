/* dist/content/analytics.js */
console.log("[Replify] Analytics Content Script Loaded");

// Define your "patch" functions directly here
function applyCampaignsPatch() {
    console.log("[Replify] Applying Campaigns Patch Logic...");
    // ... (The actual code from your original utils/analyticsScripts/campaigns.js)
    // Example:
    // if (window.location.href.includes("someCampaignsSpecificURL")) {
      document.body.style.border = "5px solid red"; // Placeholder for actual logic
    // }
}

function applyNewsPatch() {
    console.log("[Replify] Applying News Patch Logic (if you had one)...");
    // ... news patch logic
}

function applyHashtagsPatch() {
    console.log("[Replify] Applying Hashtags Patch Logic (if you had one)...");
    // ... hashtags patch logic
}
// Add other patch functions as needed

const PATCH_EXECUTORS = {
    campaigns: applyCampaignsPatch,
    news: applyNewsPatch,
    hashtags: applyHashtagsPatch,
    // Add other types that match your redirectState keys
};

function executeEnabledAnalyticsPatches() {
    if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.get("redirectAnalyticsState", (result) => {
            const state = result.redirectAnalyticsState || {};
            console.log("[Replify] Current redirectAnalyticsState:", state);

            if (!/^\/(admin|studio)\/analytics\//.test(location.pathname)) {
                console.debug("[Replify] Not an analytics URL, analytics.js exiting main logic.");
                return;
            }
            console.debug("[Replify] Analytics URL detected, proceeding.");

            for (const type in state) {
                if (state[type] && PATCH_EXECUTORS[type]) {
                    console.log(`[Replify] ${type} is enabled, executing patch.`);
                    try {
                        PATCH_EXECUTORS[type]();
                    } catch (e) {
                        console.error(`[Replify] Error executing ${type} patch:`, e);
                    }
                } else if (state[type] && !PATCH_EXECUTORS[type]) {
                    console.warn(`[Replify] ${type} is enabled but no executor function is defined.`);
                }
            }
        });
    } else {
        console.error("[Replify] Chrome storage API not available.");
    }
}

// Run the checks when the script initially loads
executeEnabledAnalyticsPatches();

// Optional: Listen for changes in storage to react without a page reload
// This is more advanced and might not be needed if your popup always reloads the page.
if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.redirectAnalyticsState) {
            console.log("[Replify] redirectAnalyticsState changed in storage, re-evaluating patches.");
            // You might want to be careful here: re-running patches could have unintended side effects
            // if they are not idempotent or if they manipulate the DOM heavily.
            // For now, a page reload (which your popup does) handles this cleanly.
            // If you want to avoid reload, you'd need to make your patch functions able
            // to "undo" themselves or safely re-apply.
            // For simplicity with your current reload flow, you might not even need this listener.
            // But if you wanted dynamic updates:
            // executeEnabledAnalyticsPatches();
        }
    });
}