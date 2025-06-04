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

// --- Global state for EMAIL Patch (Content Script side) ---
let emailPatchCurrentlyActive = false;
const REPLIFY_EMAIL_LOG_PREFIX = '[Replify EmailPatchCS]:';
const REPLIFY_EMAIL_INJECTED_SCRIPT_ID = 'replify-email-fetch-override-script';


// --- CAMPAIGNS PATCH ---
function applyCampaignsPatch() {
    // console.log(REPLIFY_CAMPAIGNS_LOG_PREFIX, "Attempting to apply Campaigns Patch. Path:", window.location.pathname);
    if (!window.location.pathname.includes("/studio/analytics/campaigns")) {
        if (campaignsPatchCurrentlyActive) cleanupCampaignsPatch();
        return;
    }
    if (campaignsPatchCurrentlyActive) return;
    
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
    const revertScriptCode = `if (typeof window.__REPLIFY_REVERT_CAMPAIGNS_FETCH__ === 'function') { window.__REPLIFY_REVERT_CAMPAIGNS_FETCH__(); } else { console.warn('${REPLIFY_CAMPAIGNS_LOG_PREFIX}', 'Campaigns revert function not found.'); }`;
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
    // console.log(REPLIFY_POSTS_LOG_PREFIX, "Attempting to apply Posts Patch. Path:", window.location.pathname);
    if (!window.location.pathname.startsWith("/content/news/article/")) {
        if (postsPatchCurrentlyActive) cleanupPostsPatch();
        return;
    }
    if (postsPatchCurrentlyActive) return;

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
    const revertScriptCode = `if (typeof window.__REPLIFY_REVERT_POSTS_FETCH__ === 'function') { window.__REPLIFY_REVERT_POSTS_FETCH__(); } else { console.warn('${REPLIFY_POSTS_LOG_PREFIX}', 'Posts revert function not found.'); }`;
    try {
        const scriptElement = document.createElement('script');
        scriptElement.textContent = revertScriptCode;
        (document.head || document.documentElement).appendChild(scriptElement).remove();
    } catch (e) { console.error(REPLIFY_POSTS_LOG_PREFIX, "Error injecting posts cleanup script:", e); }
    postsPatchCurrentlyActive = false;
}

// --- EMAIL PATCH --- // NEW
function applyEmailPatch() {
    // console.log(REPLIFY_EMAIL_LOG_PREFIX, "Attempting to apply Email Patch. Path:", window.location.pathname);
    // TODO: Determine the correct URL pattern for email analytics pages
    if (!window.location.pathname.includes("/studio/analytics/email")) { // Example URL pattern
        if (emailPatchCurrentlyActive) cleanupEmailPatch();
        return;
    }
    if (emailPatchCurrentlyActive) return;

    console.log(REPLIFY_EMAIL_LOG_PREFIX, "Applying Email Patch via SCRIPT SRC INJECTION...");
    const oldScriptElement = document.getElementById(REPLIFY_EMAIL_INJECTED_SCRIPT_ID);
    if (oldScriptElement) oldScriptElement.remove();

    const scriptElement = document.createElement('script');
    scriptElement.id = REPLIFY_EMAIL_INJECTED_SCRIPT_ID;
    scriptElement.src = chrome.runtime.getURL('content/analytics/email.js'); 
    scriptElement.onload = () => console.log(REPLIFY_EMAIL_LOG_PREFIX, "Injected email.js loaded.");
    scriptElement.onerror = () => console.error(REPLIFY_EMAIL_LOG_PREFIX, "ERROR loading injected email.js.");
    (document.head || document.documentElement).appendChild(scriptElement);
    emailPatchCurrentlyActive = true;
}

function cleanupEmailPatch() {
    console.log(REPLIFY_EMAIL_LOG_PREFIX, "Cleaning up Email Patch...");
    const revertScriptCode = `if (typeof window.__REPLIFY_REVERT_EMAIL_FETCH__ === 'function') { window.__REPLIFY_REVERT_EMAIL_FETCH__(); } else { console.warn('${REPLIFY_EMAIL_LOG_PREFIX}', 'Email revert function not found.'); }`;
    try {
        const scriptElement = document.createElement('script');
        scriptElement.textContent = revertScriptCode;
        (document.head || document.documentElement).appendChild(scriptElement).remove();
    } catch (e) { console.error(REPLIFY_EMAIL_LOG_PREFIX, "Error injecting email cleanup script:", e); }
    emailPatchCurrentlyActive = false;
}


// --- Your other patch functions (if any) ---
function applyNewsPatch() { /* console.log("[Replify NewsPatchCS]: Apply (Not Implemented)"); */ }
function applyHashtagsPatch() { /* console.log("[Replify HashtagsPatchCS]: Apply (Not Implemented)"); */ }

// --- PATCH MANAGEMENT ---
const PATCH_INFO = {
    campaigns: {
        isActive: () => campaignsPatchCurrentlyActive,
        apply: applyCampaignsPatch,
        cleanup: cleanupCampaignsPatch,
        logPrefix: REPLIFY_CAMPAIGNS_LOG_PREFIX,
        // Example: /studio/analytics/campaigns OR /studio/analytics/campaigns/some-id
        urlCheck: (pathname) => pathname.startsWith("/studio/analytics/campaigns") 
    },
    posts: {
        isActive: () => postsPatchCurrentlyActive,
        apply: applyPostsPatch,
        cleanup: cleanupPostsPatch,
        logPrefix: REPLIFY_POSTS_LOG_PREFIX,
        urlCheck: (pathname) => pathname.startsWith("/content/news/article/")
    },
    email: { // NEW
        isActive: () => emailPatchCurrentlyActive,
        apply: applyEmailPatch,
        cleanup: cleanupEmailPatch,
        logPrefix: REPLIFY_EMAIL_LOG_PREFIX,
        // TODO: Update this with the correct URL pattern(s) for email analytics
        urlCheck: (pathname) => pathname.includes("/studio/analytics/email") 
    },
    news: {
        isActive: () => false, 
        apply: applyNewsPatch,
        cleanup: () => console.log("[Replify NewsPatchCS]: Cleanup (Not Implemented)"),
        logPrefix: "[Replify NewsPatchCS]:",
        urlCheck: (pathname) => pathname.includes("/studio/analytics/news") // Example
    },
    hashtags: {
        isActive: () => false, 
        apply: applyHashtagsPatch,
        cleanup: () => console.log("[Replify HashtagsPatchCS]: Cleanup (Not Implemented)"),
        logPrefix: "[Replify HashtagsPatchCS]:",
        urlCheck: (pathname) => pathname.includes("/studio/analytics/hashtags") // Example
    }
};

function executeEnabledPatches() {
    console.log("[Replify] executeEnabledPatches. Path:", window.location.pathname);
    if (!(chrome.storage && chrome.storage.local)) {
        console.error("[Replify] Chrome storage API not available.");
        return;
    }

    chrome.storage.local.get("redirectAnalyticsState", (result) => {
        const state = result.redirectAnalyticsState || {};
        // console.log("[Replify] Current redirectAnalyticsState from storage:", state);

        for (const type in PATCH_INFO) {
            const patch = PATCH_INFO[type];
            if (!patch) { // Should not happen if PATCH_INFO is defined correctly
                console.warn(`[Replify] No patch info found for type: ${type}`);
                continue;
            }
            const shouldBeActiveBasedOnStorage = state[type] === true;
            const isCurrentlyActive = patch.isActive();
            const isOnCorrectPage = patch.urlCheck(window.location.pathname);

            if (shouldBeActiveBasedOnStorage && isOnCorrectPage) {
                if (!isCurrentlyActive) {
                    // console.log(`[Replify] '${type}' enabled and on correct page. Applying.`);
                    try {
                        patch.apply();
                    } catch (e) {
                        console.error(`[Replify] Error executing '${type}' patch:`, e);
                    }
                }
            } else { 
                if (isCurrentlyActive) { 
                    console.log(patch.logPrefix, `Patch '${type}' should NOT be active (Storage: ${shouldBeActiveBasedOnStorage}, PageMatch: ${isOnCorrectPage}). Cleaning up.`);
                    patch.cleanup();
                }
            }
        }
    });
}

// --- INITIALIZATION & LISTENERS ---
executeEnabledPatches();

if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.redirectAnalyticsState) {
            console.log("[Replify] redirectAnalyticsState changed in storage. Re-evaluating patches.");
            executeEnabledPatches();
        }
    });
}

if (window.navigation) {
    // console.log("[Replify] Navigation API supported. Adding 'navigatesuccess' event listener."); // Less verbose
    navigation.addEventListener('navigatesuccess', (event) => {
        console.log("[Replify] SPA 'navigatesuccess' event. New Path:", window.location.pathname);
        executeEnabledPatches();
    });
    navigation.addEventListener('navigateerror', (event) => { 
        console.error("[Replify] SPA 'navigateerror' event:", event.message);
        executeEnabledPatches();
    });
} else {
    console.warn("[Replify] Navigation API not supported. Using MutationObserver fallback for SPA navigation.");
    let oldHref = document.location.href;
    const bodyObserver = new MutationObserver((mutations) => {
        mutations.forEach(() => {
            if (oldHref !== document.location.href) {
                // console.log("[Replify] Fallback MutationObserver detected URL change from", oldHref, "to", document.location.href); // Less verbose
                oldHref = document.location.href;
                executeEnabledPatches();
            }
        });
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });
    // console.log("[Replify] Fallback MutationObserver for URL changes initiated on document.body."); // Less verbose
}