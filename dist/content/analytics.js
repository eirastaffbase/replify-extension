/* dist/content/analytics.js */
console.log("[Replify] Analytics Content Script Loaded. Current page:", window.location.pathname);

let campaignsMutationObserver = null;
let campaignsPatchCurrentlyActive = false;
const REPLIFY_CAMPAIGNS_LOG_PREFIX = '[Replify CampaignsPatchCS]:';
const REPLIFY_INJECTED_SCRIPT_ID = 'replify-campaigns-fetch-override-script';

function applyCampaignsPatch() {
    console.log(REPLIFY_CAMPAIGNS_LOG_PREFIX, "Attempting to apply Campaigns Patch Logic. Current pathname:", window.location.pathname);

    if (!window.location.pathname.includes("/studio/analytics/campaigns")) {
        console.log(REPLIFY_CAMPAIGNS_LOG_PREFIX, "Not on a /studio/analytics/campaigns page. Patch not applied or will be cleaned up.");
        if (campaignsPatchCurrentlyActive) {
            cleanupCampaignsPatch();
        }
        return;
    }
    console.log(REPLIFY_CAMPAIGNS_LOG_PREFIX, "Page IS /studio/analytics/campaigns. Proceeding.");

    if (campaignsPatchCurrentlyActive) {
        console.log(REPLIFY_CAMPAIGNS_LOG_PREFIX, "Campaigns patch (script injection) is ALREADY considered active. Skipping re-application.");
        return;
    }
    console.log(REPLIFY_CAMPAIGNS_LOG_PREFIX, "Applying Campaigns Patch via SCRIPT SRC INJECTION (was not previously active)...");

    // Remove any old injected script tag first
    const oldScriptElement = document.getElementById(REPLIFY_INJECTED_SCRIPT_ID);
    if (oldScriptElement) {
        oldScriptElement.remove();
        console.log(REPLIFY_CAMPAIGNS_LOG_PREFIX, "Removed old injected script tag.");
    }

    const scriptElement = document.createElement('script');
    scriptElement.id = REPLIFY_INJECTED_SCRIPT_ID;
    scriptElement.src = chrome.runtime.getURL('content/main_world_script.js');
    
    scriptElement.onload = function() {
        console.log(REPLIFY_CAMPAIGNS_LOG_PREFIX, "Injected script (main_world_script.js) has loaded via src.");
        // The script tag can be removed after it has loaded and executed if you wish
        // For debugging, you might want to leave it. For production, you might remove it.
        // this.remove(); 
    };
    scriptElement.onerror = function() {
        console.error(REPLIFY_CAMPAIGNS_LOG_PREFIX, "ERROR loading injected script (main_world_script.js) via src.");
    };
    
    (document.head || document.documentElement).appendChild(scriptElement);
    console.log(REPLIFY_CAMPAIGNS_LOG_PREFIX, "Script tag with src injected into page.");

    campaignsPatchCurrentlyActive = true;

    // DOM MutationObserver for graph date formatting (can stay in content script)
    if (campaignsMutationObserver) {
        campaignsMutationObserver.disconnect();
    }
    function removeYearFromAxisDates_CS() {
        document.querySelectorAll('g.visx-axis-bottom text > tspan, g.visx-axis-left text > tspan').forEach(tspan => {
            const originalDate = tspan.textContent.trim();
            const match = originalDate.match(/^(\d{1,2}\/\d{1,2})\/\d{2,4}$/);
            if (match && match[1]) {
                tspan.textContent = match[1];
            }
        });
    }
    campaignsMutationObserver = new MutationObserver((mutations, obs) => {
        const axisBottom = document.querySelector('g.visx-axis-bottom');
        const axisLeft = document.querySelector('g.visx-axis-left');
        if (axisBottom || axisLeft) {
            removeYearFromAxisDates_CS();
        }
    });
    if (window.location.href.includes('/studio/analytics/campaigns/') && !window.location.href.endsWith('/campaigns')) {
        campaignsMutationObserver.observe(document.body, { childList: true, subtree: true });
        console.log(REPLIFY_CAMPAIGNS_LOG_PREFIX, "DOM Observer for date formatting started (CS).");
    }
}

function cleanupCampaignsPatch() {
    console.log(REPLIFY_CAMPAIGNS_LOG_PREFIX, "Cleaning up Campaigns Patch (Content Script initiating revert of injected script)...");

    // To call the revert function, we inject another tiny *inline* script.
    // This specific, small inline script might be allowed if the CSP has a hash/nonce for it,
    // OR, if it's simple enough, some browsers/CSP configurations might permit it.
    // If this also gets blocked by CSP, we'd need a more complex event-based communication.
    const revertScriptCode = `
        if (typeof window.__REPLIFY_REVERT_CAMPAIGNS_FETCH__ === 'function') {
            console.log('User requesting revert: ${REPLIFY_CAMPAIGNS_LOG_PREFIX}', 'Calling window.__REPLIFY_REVERT_CAMPAIGNS_FETCH__ from cleanup script.');
            window.__REPLIFY_REVERT_CAMPAIGNS_FETCH__();
        } else {
            console.warn('User requesting revert: ${REPLIFY_CAMPAIGNS_LOG_PREFIX}', 'Revert function __REPLIFY_REVERT_CAMPAIGNS_FETCH__ not found in page context during cleanup.');
        }
    `;
    try {
        const scriptElement = document.createElement('script');
        scriptElement.textContent = revertScriptCode;
        (document.head || document.documentElement).appendChild(scriptElement);
        scriptElement.remove(); // Remove the cleanup script tag after it runs
    } catch (e) {
        console.error(REPLIFY_CAMPAIGNS_LOG_PREFIX, "Error injecting cleanup script:", e);
    }


    if (campaignsMutationObserver) {
        campaignsMutationObserver.disconnect();
        campaignsMutationObserver = null;
        console.log(REPLIFY_CAMPAIGNS_LOG_PREFIX, "Campaigns MutationObserver disconnected (CS).");
    }
    
    const injectedScriptTag = document.getElementById(REPLIFY_INJECTED_SCRIPT_ID);
    if (injectedScriptTag) {
        // injectedScriptTag.remove(); // Removing the tag doesn't undo the fetch override by itself
        // console.log(REPLIFY_CAMPAIGNS_LOG_PREFIX, "Removed main injected script tag (if it was still there).");
    }

    campaignsPatchCurrentlyActive = false;
    console.log(REPLIFY_CAMPAIGNS_LOG_PREFIX, "Campaigns Patch Cleaned Up and Inactive state SET (CS).");
}

// --- Rest of your analytics.js (PATCH_EXECUTORS, executeEnabledAnalyticsPatches, storage listener) ---
// (Ensure this part is complete and correct from your previous working version)
function applyNewsPatch() { /* ... */ }
function applyHashtagsPatch() { /* ... */ }

const PATCH_EXECUTORS = {
    campaigns: applyCampaignsPatch,
    news: applyNewsPatch,
    hashtags: applyHashtagsPatch,
};

function executeEnabledAnalyticsPatches() {
    // ... (your existing executeEnabledAnalyticsPatches logic, ensure it calls the correct cleanupCampaignsPatch)
    console.log("[Replify] executeEnabledAnalyticsPatches called. Current pathname:", window.location.pathname);
    if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.get("redirectAnalyticsState", (result) => {
            const state = result.redirectAnalyticsState || {};
            console.log("[Replify] Current redirectAnalyticsState from storage:", state);
            // ... (rest of your logic from the version that correctly read storage) ...
            const onAnalyticsPage = /^\/(admin|studio)\/analytics\//.test(location.pathname);

            if (!onAnalyticsPage) {
                console.debug("[Replify] Not an analytics URL (broad check). Main logic exit. Path:", location.pathname);
                if (campaignsPatchCurrentlyActive) {
                     cleanupCampaignsPatch();
                     console.log(REPLIFY_CAMPAIGNS_LOG_PREFIX, "Navigated away from all analytics pages, patch cleaned up by main executor.");
                }
                return;
            }
            console.debug("[Replify] Analytics URL detected (broad check), proceeding. Path:", location.pathname);

            for (const type in PATCH_EXECUTORS) {
                if (state[type] === true) {
                    console.log(`[Replify] '${type}' is ENABLED in state, attempting to execute patch.`);
                    try {
                        PATCH_EXECUTORS[type]();
                    } catch (e) {
                        console.error(`[Replify] Error executing '${type}' patch:`, e);
                    }
                } else if (state[type] === false) { 
                     console.log(`[Replify] '${type}' is DISABLED in state.`);
                    if (type === 'campaigns' && campaignsPatchCurrentlyActive) {
                        console.log(REPLIFY_CAMPAIGNS_LOG_PREFIX, "Campaigns patch explicitly disabled via storage. Cleaning up.");
                        cleanupCampaignsPatch();
                    }
                } else { 
                     console.log(`[Replify] '${type}' has no defined true/false state in storage (current value: ${state[type]}).`);
                     if (type === 'campaigns' && campaignsPatchCurrentlyActive && state[type] !== true) { 
                        console.log(REPLIFY_CAMPAIGNS_LOG_PREFIX, `Campaigns patch state for '${type}' is no longer true (is ${state[type]}). Cleaning up.`);
                        cleanupCampaignsPatch();
                     } else if (!PATCH_EXECUTORS[type] && state[type]) { 
                        console.warn(`[Replify] '${type}' is enabled in storage but no executor function is defined.`);
                     }
                }
            }

            if (campaignsPatchCurrentlyActive && !window.location.pathname.includes("/studio/analytics/campaigns")) {
                console.log(REPLIFY_CAMPAIGNS_LOG_PREFIX, "Still on an analytics page, but NOT /campaigns/. Patch was active. Cleaning up.");
                cleanupCampaignsPatch();
            }
        });
    } else {
        console.error("[Replify] Chrome storage API not available.");
    }
}

executeEnabledAnalyticsPatches();

if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.redirectAnalyticsState) {
            console.log("[Replify] redirectAnalyticsState changed in storage. Re-evaluating patches. New state:", changes.redirectAnalyticsState.newValue);
            executeEnabledAnalyticsPatches();
        }
    });
}