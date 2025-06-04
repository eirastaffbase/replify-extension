/* dist/content/analytics.js */
console.log("[Replify] Analytics Content Script Loader Executed. Path:", window.location.pathname);

// --- Global state variables for each patch ---
let campaignsMutationObserver = null;
let campaignsPatchCurrentlyActive = false;
const REPLIFY_CAMPAIGNS_LOG_PREFIX = '[Replify CampaignsPatchCS]:';
const REPLIFY_CAMPAIGNS_INJECTED_SCRIPT_ID = 'replify-campaigns-fetch-override-script';

let postsPatchCurrentlyActive = false;
const REPLIFY_POSTS_LOG_PREFIX = '[Replify PostsPatchCS]:';
const REPLIFY_POSTS_INJECTED_SCRIPT_ID = 'replify-posts-fetch-override-script';

let emailPatchCurrentlyActive = false;
const REPLIFY_EMAIL_LOG_PREFIX = '[Replify EmailPatchCS]:';
const REPLIFY_EMAIL_INJECTED_SCRIPT_ID = 'replify-email-fetch-override-script';

let newsPatchCurrentlyActive = false;
const REPLIFY_NEWS_LOG_PREFIX = '[Replify NewsPatchCS]:';
const REPLIFY_NEWS_INJECTED_SCRIPT_ID = 'replify-news-fetch-override-script';

let hashtagsPatchCurrentlyActive = false; // NEW
const REPLIFY_HASHTAGS_LOG_PREFIX = '[Replify HashtagsPatchCS]:'; // NEW
const REPLIFY_HASHTAGS_INJECTED_SCRIPT_ID = 'replify-hashtags-fetch-override-script'; // NEW


// --- CAMPAIGNS PATCH ---
function applyCampaignsPatch() {
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

// --- EMAIL PATCH ---
function applyEmailPatch() {
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

// --- NEWS PATCH ---
function applyNewsPatch() {
    // console.log(REPLIFY_NEWS_LOG_PREFIX, "Attempting to apply News Patch. Path:", window.location.pathname);
    // User specified: /admin/analytics/news
    
    if (!window.location.pathname.startsWith("/admin/analytics/news")) { 
        if (newsPatchCurrentlyActive) cleanupNewsPatch();
        return;
    }
    if (newsPatchCurrentlyActive) return;

    console.log(REPLIFY_NEWS_LOG_PREFIX, "Applying News Patch via SCRIPT SRC INJECTION...");
    const oldScriptElement = document.getElementById(REPLIFY_NEWS_INJECTED_SCRIPT_ID);
    if (oldScriptElement) oldScriptElement.remove();

    const scriptElement = document.createElement('script');
    scriptElement.id = REPLIFY_NEWS_INJECTED_SCRIPT_ID;
    scriptElement.src = chrome.runtime.getURL('content/analytics/news.js'); 
    scriptElement.onload = () => console.log(REPLIFY_NEWS_LOG_PREFIX, "Injected news.js loaded.");
    scriptElement.onerror = () => console.error(REPLIFY_NEWS_LOG_PREFIX, "ERROR loading injected news.js.");
    (document.head || document.documentElement).appendChild(scriptElement);
    newsPatchCurrentlyActive = true;
}

function cleanupNewsPatch() {
    console.log(REPLIFY_NEWS_LOG_PREFIX, "Cleaning up News Patch...");
    const revertScriptCode = `if (typeof window.__REPLIFY_REVERT_NEWS_FETCH__ === 'function') { window.__REPLIFY_REVERT_NEWS_FETCH__(); } else { console.warn('${REPLIFY_NEWS_LOG_PREFIX}', 'News revert function not found.'); }`;
    try {
        const scriptElement = document.createElement('script');
        scriptElement.textContent = revertScriptCode;
        (document.head || document.documentElement).appendChild(scriptElement).remove();
    } catch (e) { console.error(REPLIFY_NEWS_LOG_PREFIX, "Error injecting news cleanup script:", e); }
    newsPatchCurrentlyActive = false;
}

// --- HASHTAGS PATCH --- 
function applyHashtagsPatch() {
    // console.log(REPLIFY_HASHTAGS_LOG_PREFIX, "Attempting to apply Hashtags Patch. Path:", window.location.pathname);
    // URL check from existing PATCH_INFO example: /studio/analytics/hashtags
    if (!window.location.pathname.includes("/studio/analytics/hashtags")) { 
        if (hashtagsPatchCurrentlyActive) cleanupHashtagsPatch();
        return;
    }
    if (hashtagsPatchCurrentlyActive) return;

    console.log(REPLIFY_HASHTAGS_LOG_PREFIX, "Applying Hashtags Patch via SCRIPT SRC INJECTION...");
    const oldScriptElement = document.getElementById(REPLIFY_HASHTAGS_INJECTED_SCRIPT_ID);
    if (oldScriptElement) oldScriptElement.remove();

    const scriptElement = document.createElement('script');
    scriptElement.id = REPLIFY_HASHTAGS_INJECTED_SCRIPT_ID;
    scriptElement.src = chrome.runtime.getURL('content/analytics/hashtags.js'); 
    scriptElement.onload = () => console.log(REPLIFY_HASHTAGS_LOG_PREFIX, "Injected hashtags.js loaded.");
    scriptElement.onerror = () => console.error(REPLIFY_HASHTAGS_LOG_PREFIX, "ERROR loading injected hashtags.js.");
    (document.head || document.documentElement).appendChild(scriptElement);
    hashtagsPatchCurrentlyActive = true;
}

function cleanupHashtagsPatch() {
    console.log(REPLIFY_HASHTAGS_LOG_PREFIX, "Cleaning up Hashtags Patch...");
    const revertScriptCode = `if (typeof window.__REPLIFY_REVERT_HASHTAGS_FETCH__ === 'function') { window.__REPLIFY_REVERT_HASHTAGS_FETCH__(); } else { console.warn('${REPLIFY_HASHTAGS_LOG_PREFIX}', 'Hashtags revert function not found.'); }`;
    try {
        const scriptElement = document.createElement('script');
        scriptElement.textContent = revertScriptCode;
        (document.head || document.documentElement).appendChild(scriptElement).remove();
    } catch (e) { console.error(REPLIFY_HASHTAGS_LOG_PREFIX, "Error injecting hashtags cleanup script:", e); }
    hashtagsPatchCurrentlyActive = false;
}

// --- PATCH MANAGEMENT ---
const PATCH_INFO = {
    campaigns: {
        isActive: () => campaignsPatchCurrentlyActive,
        apply: applyCampaignsPatch,
        cleanup: cleanupCampaignsPatch,
        logPrefix: REPLIFY_CAMPAIGNS_LOG_PREFIX,
        urlCheck: (pathname) => pathname.startsWith("/studio/analytics/campaigns") 
    },
    posts: {
        isActive: () => postsPatchCurrentlyActive,
        apply: applyPostsPatch,
        cleanup: cleanupPostsPatch,
        logPrefix: REPLIFY_POSTS_LOG_PREFIX,
        urlCheck: (pathname) => pathname.startsWith("/content/news/article/")
    },
    email: { 
        isActive: () => emailPatchCurrentlyActive,
        apply: applyEmailPatch,
        cleanup: cleanupEmailPatch,
        logPrefix: REPLIFY_EMAIL_LOG_PREFIX,
        urlCheck: (pathname) => pathname.includes("/studio/analytics/email") 
    },
    news: { 
        isActive: () => newsPatchCurrentlyActive,
        apply: applyNewsPatch,
        cleanup: cleanupNewsPatch,
        logPrefix: REPLIFY_NEWS_LOG_PREFIX,
        urlCheck: (pathname) => pathname.startsWith("/admin/analytics/news") // As specified by user
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
    // console.log("[Replify] executeEnabledPatches. Path:", window.location.pathname); // Less verbose
    if (!(chrome.storage && chrome.storage.local)) {
        console.error("[Replify] Chrome storage API not available.");
        return;
    }

    chrome.storage.local.get("redirectAnalyticsState", (result) => {
        const state = result.redirectAnalyticsState || {};
        // console.log("[Replify] Current redirectAnalyticsState from storage:", state); // Less verbose

        for (const type in PATCH_INFO) {
            const patch = PATCH_INFO[type];
            if (!patch) { 
                console.warn(`[Replify] No patch info found for type: ${type}`);
                continue;
            }
            const shouldBeActiveBasedOnStorage = state[type] === true;
            const isCurrentlyActive = patch.isActive();
            const isOnCorrectPage = patch.urlCheck(window.location.pathname);

            if (shouldBeActiveBasedOnStorage && isOnCorrectPage) {
                if (!isCurrentlyActive) {
                    try {
                        patch.apply();
                    } catch (e) {
                        console.error(`[Replify] Error executing '${type}' patch:`, e);
                    }
                }
            } else { 
                if (isCurrentlyActive) { 
                    // console.log(patch.logPrefix, `Patch '${type}' should NOT be active (Storage: ${shouldBeActiveBasedOnStorage}, PageMatch: ${isOnCorrectPage}). Cleaning up.`); // More verbose
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
            // console.log("[Replify] redirectAnalyticsState changed in storage. Re-evaluating patches."); // Less verbose
            executeEnabledPatches();
        }
    });
}

if (window.navigation) {
    navigation.addEventListener('navigatesuccess', (event) => {
        // console.log("[Replify] SPA 'navigatesuccess' event. New Path:", window.location.pathname); // Less verbose
        executeEnabledPatches();
    });
    navigation.addEventListener('navigateerror', (event) => { 
        console.error("[Replify] SPA 'navigateerror' event:", event.message);
        executeEnabledPatches();
    });
} else {
    // Fallback for SPA navigation
    let oldHref = document.location.href;
    const bodyObserver = new MutationObserver(() => {
        if (oldHref !== document.location.href) {
            oldHref = document.location.href;
            executeEnabledPatches();
        }
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });
}