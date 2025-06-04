/* dist/content/analytics.js */
console.log("[Replify] Analytics Content Script Loader Executed. Path:", window.location.pathname);

// --- Global state for CAMPAIGNS Patch (Content Script side) ---
let campaignsMutationObserver = null;
let campaignsPatchCurrentlyActive = false;
const REPLIFY_CAMPAIGNS_LOG_PREFIX = '[Replify CampaignsPatchCS]:';
const REPLIFY_CAMPAIGNS_INJECTED_SCRIPT_ID = 'replify-campaigns-fetch-override-script';

// --- Global state for POSTS Patch (Content Script side) ---
let postsPatchCurrentlyActive = false;
const REPLIFY_POSTS_LOG_PREFIX = '[Replify PostsPatchCS]:';
const REPLIFY_POSTS_INJECTED_SCRIPT_ID = 'replify-posts-fetch-override-script';
// Note: The posts patch from Tampermonkey didn't have a MutationObserver, add if needed later.

// --- CAMPAIGNS PATCH ---
function applyCampaignsPatch() {
    console.log(REPLIFY_CAMPAIGNS_LOG_PREFIX, "Attempting to apply Campaigns Patch. Path:", window.location.pathname);

    if (!window.location.pathname.includes("/studio/analytics/campaigns")) {
        // console.log(REPLIFY_CAMPAIGNS_LOG_PREFIX, "Not on a campaigns analytics page."); // Less verbose
        if (campaignsPatchCurrentlyActive) cleanupCampaignsPatch();
        return;
    }
    // console.log(REPLIFY_CAMPAIGNS_LOG_PREFIX, "Page IS /studio/analytics/campaigns. Proceeding."); // Less verbose

    if (campaignsPatchCurrentlyActive) {
        // console.log(REPLIFY_CAMPAIGNS_LOG_PREFIX, "Campaigns patch already active."); // Less verbose
        return;
    }
    console.log(REPLIFY_CAMPAIGNS_LOG_PREFIX, "Applying Campaigns Patch via SCRIPT SRC INJECTION...");

    const oldScriptElement = document.getElementById(REPLIFY_CAMPAIGNS_INJECTED_SCRIPT_ID);
    if (oldScriptElement) oldScriptElement.remove();

    const scriptElement = document.createElement('script');
    scriptElement.id = REPLIFY_CAMPAIGNS_INJECTED_SCRIPT_ID;
    scriptElement.src = chrome.runtime.getURL('content/analytics/campaigns.js');
    
    scriptElement.onload = () => console.log(REPLIFY_CAMPAIGNS_LOG_PREFIX, "Injected campaigns.js loaded.");
    scriptElement.onerror = () => console.error(REPLIFY_CAMPAIGNS_LOG_PREFIX, "ERROR loading injected campaigns.js.");
    
    (document.head || document.documentElement).appendChild(scriptElement);
    campaignsPatchCurrentlyActive = true;

    if (campaignsMutationObserver) campaignsMutationObserver.disconnect();
    function removeYearFromAxisDates_CS() {
        document.querySelectorAll('g.visx-axis-bottom text > tspan, g.visx-axis-left text > tspan').forEach(tspan => {
            const originalDate = tspan.textContent.trim();
            const match = originalDate.match(/^(\d{1,2}\/\d{1,2})\/\d{2,4}$/);
            if (match && match[1]) tspan.textContent = match[1];
        });
    }
    campaignsMutationObserver = new MutationObserver(() => {
        if (document.querySelector('g.visx-axis-bottom') || document.querySelector('g.visx-axis-left')) {
            removeYearFromAxisDates_CS();
        }
    });
    if (window.location.pathname.includes('/studio/analytics/campaigns/') && !window.location.pathname.endsWith('/campaigns')) {
        campaignsMutationObserver.observe(document.body, { childList: true, subtree: true });
    }
}

function cleanupCampaignsPatch() {
    console.log(REPLIFY_CAMPAIGNS_LOG_PREFIX, "Cleaning up Campaigns Patch...");
    const revertScriptCode = `if (typeof window.__REPLIFY_REVERT_CAMPAIGNS_FETCH__ === 'function') window.__REPLIFY_REVERT_CAMPAIGNS_FETCH__(); else console.warn('${REPLIFY_CAMPAIGNS_LOG_PREFIX}', 'Campaigns revert function not found.');`;
    try {
        const scriptElement = document.createElement('script');
        scriptElement.textContent = revertScriptCode;
        (document.head || document.documentElement).appendChild(scriptElement).remove();
    } catch (e) { console.error(REPLIFY_CAMPAIGNS_LOG_PREFIX, "Error injecting campaigns cleanup script:", e); }

    if (campaignsMutationObserver) campaignsMutationObserver.disconnect();
    campaignsPatchCurrentlyActive = false;
}

// --- POSTS PATCH ---
function applyPostsPatch() {
    console.log(REPLIFY_POSTS_LOG_PREFIX, "Attempting to apply Posts Patch. Path:", window.location.pathname);

    if (!window.location.pathname.startsWith("/content/news/article/")) {
        console.log(REPLIFY_POSTS_LOG_PREFIX, "Not on a post article page.");
        if (postsPatchCurrentlyActive) cleanupPostsPatch();
        return;
    }
    console.log(REPLIFY_POSTS_LOG_PREFIX, "Page IS a post article page. Proceeding.");

    if (postsPatchCurrentlyActive) {
        console.log(REPLIFY_POSTS_LOG_PREFIX, "Posts patch already active.");
        return;
    }
    console.log(REPLIFY_POSTS_LOG_PREFIX, "Applying Posts Patch via SCRIPT SRC INJECTION...");

    const oldScriptElement = document.getElementById(REPLIFY_POSTS_INJECTED_SCRIPT_ID);
    if (oldScriptElement) oldScriptElement.remove();

    const scriptElement = document.createElement('script');
    scriptElement.id = REPLIFY_POSTS_INJECTED_SCRIPT_ID;
    scriptElement.src = chrome.runtime.getURL('content/analytics/posts.js');
    
    scriptElement.onload = () => console.log(REPLIFY_POSTS_LOG_PREFIX, "Injected posts.js loaded.");
    scriptElement.onerror = () => console.error(REPLIFY_POSTS_LOG_PREFIX, "ERROR loading injected posts.js.");
    
    (document.head || document.documentElement).appendChild(scriptElement);
    postsPatchCurrentlyActive = true;
}

function cleanupPostsPatch() {
    console.log(REPLIFY_POSTS_LOG_PREFIX, "Cleaning up Posts Patch...");
    const revertScriptCode = `if (typeof window.__REPLIFY_REVERT_POSTS_FETCH__ === 'function') window.__REPLIFY_REVERT_POSTS_FETCH__(); else console.warn('${REPLIFY_POSTS_LOG_PREFIX}', 'Posts revert function not found.');`;
    try {
        const scriptElement = document.createElement('script');
        scriptElement.textContent = revertScriptCode;
        (document.head || document.documentElement).appendChild(scriptElement).remove();
    } catch (e) { console.error(REPLIFY_POSTS_LOG_PREFIX, "Error injecting posts cleanup script:", e); }
    postsPatchCurrentlyActive = false;
}

// --- Your other patch functions (if any) ---
function applyNewsPatch() { console.log("[Replify NewsPatchCS]: Apply (Not Implemented)"); }
function applyHashtagsPatch() { console.log("[Replify HashtagsPatchCS]: Apply (Not Implemented)"); }

// --- PATCH MANAGEMENT ---
const PATCH_EXECUTORS = {
    campaigns: applyCampaignsPatch,
    posts: applyPostsPatch,
    news: applyNewsPatch,
    hashtags: applyHashtagsPatch,
};

function executeEnabledPatches() { // Renamed for clarity
    console.log("[Replify] executeEnabledPatches called. Path:", window.location.pathname);
    if (!(chrome.storage && chrome.storage.local)) {
        console.error("[Replify] Chrome storage API not available.");
        return;
    }

    chrome.storage.local.get("redirectAnalyticsState", (result) => {
        const state = result.redirectAnalyticsState || {};
        console.log("[Replify] Current redirectAnalyticsState from storage:", state);
        
        // Iterate over known patch executors to apply/cleanup based on state and current page
        for (const type in PATCH_EXECUTORS) {
            const patchFunction = PATCH_EXECUTORS[type];
            const shouldBeActive = state[type] === true;
            let currentlyActiveFlag = false; // Determine which active flag to check/set
            let cleanupFunction = null;
            let logPrefix = `[Replify ${type}PatchCS]:`;

            if (type === 'campaigns') {
                currentlyActiveFlag = campaignsPatchCurrentlyActive;
                cleanupFunction = cleanupCampaignsPatch;
                logPrefix = REPLIFY_CAMPAIGNS_LOG_PREFIX;
            } else if (type === 'posts') {
                currentlyActiveFlag = postsPatchCurrentlyActive;
                cleanupFunction = cleanupPostsPatch;
                logPrefix = REPLIFY_POSTS_LOG_PREFIX;
            }
            // Add else if for other patches like 'news', 'hashtags'

            if (shouldBeActive) {
                try {
                    patchFunction(); // Patch function will do its own URL check and apply if conditions met
                } catch (e) {
                    console.error(`[Replify] Error executing '${type}' patch:`, e);
                }
            } else { // Patch is disabled in storage or state is undefined
                if (currentlyActiveFlag && cleanupFunction) {
                    console.log(logPrefix, `Patch '${type}' disabled/undefined in storage. Cleaning up.`);
                    cleanupFunction();
                }
            }
        }

        // Additional cleanup checks if navigated away from a page where a patch *was* active
        // These ensure that even if storage state hasn't changed, patches inactive on wrong pages.
        if (campaignsPatchCurrentlyActive && !window.location.pathname.includes("/studio/analytics/campaigns")) {
            console.log(REPLIFY_CAMPAIGNS_LOG_PREFIX, "Navigated away from campaigns analytics page. Cleaning up campaigns patch.");
            cleanupCampaignsPatch();
        }
        if (postsPatchCurrentlyActive && !window.location.pathname.startsWith("/content/news/article/")) {
            console.log(REPLIFY_POSTS_LOG_PREFIX, "Navigated away from post article page. Cleaning up posts patch.");
            cleanupPostsPatch();
        }
        // Add similar checks for other patches if they are page-specific
    });
}

// --- INITIALIZATION & LISTENERS ---
executeEnabledPatches(); // Renamed

if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.redirectAnalyticsState) {
            console.log("[Replify] redirectAnalyticsState changed in storage. Re-evaluating patches.");
            executeEnabledPatches(); // Renamed
        }
    });
}