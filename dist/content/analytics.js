/* dist/content/analytics.js */
console.log("[Replify] Analytics Content Script Loader Executed. Path:", window.location.pathname);

const newsPatchScriptPath = 'content/analytics/news.js'; // Store as a single string since it's just one patch

function injectNewsPatchScript() {
    const scriptId = 'replify-injected-' + newsPatchScriptPath.split('/').pop();
    if (!document.getElementById(scriptId)) { // Prevent re-injecting same script tag by ID
        const scriptElement = document.createElement('script');
        scriptElement.id = scriptId;
        scriptElement.src = chrome.runtime.getURL(newsPatchScriptPath);
        scriptElement.onload = () => console.log(`[Replify CS] Pre-injected: ${newsPatchScriptPath} loaded.`);
        scriptElement.onerror = () => console.error(`[Replify CS] ERROR pre-injecting ${newsPatchScriptPath}.`);
        (document.head || document.documentElement).appendChild(scriptElement);
    }
}

if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get("redirectAnalyticsState", (result) => {
        const state = result.redirectAnalyticsState || {};
        if (state.news === true) {
            injectNewsPatchScript(); // Call the specific news injection function
        }
    });
}


const campaignsPatchScriptPath = 'content/analytics/campaigns.js'; 

function injectCampaignsPatchScript() {
    const scriptId = 'replify-injected-' + campaignsPatchScriptPath.split('/').pop();
    if (!document.getElementById(scriptId)) { // Prevent re-injecting same script tag by ID
        const scriptElement = document.createElement('script');
        scriptElement.id = scriptId;
        scriptElement.src = chrome.runtime.getURL(campaignsPatchScriptPath);
        scriptElement.onload = () => console.log(`[Replify CS] Pre-injected: ${campaignsPatchScriptPath} loaded.`);
        scriptElement.onerror = () => console.error(`[Replify CS] ERROR pre-injecting ${campaignsPatchScriptPath}.`);
        (document.head || document.documentElement).appendChild(scriptElement);
    }
}

if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get("redirectAnalyticsState", (result) => {
        const state = result.redirectAnalyticsState || {};
        if (state.campaigns === true) {
            injectCampaignsPatchScript(); // Call the specific campaigns injection function
        }
    });
}


// --- Global state variables for each patch ---
let campaignsMutationObserver = null; // Keep for campaigns patch internal management
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

// let newsPatchAppliedAtStart = false; // Not strictly needed for executeEnabledPatches logic

let hashtagsPatchCurrentlyActive = false;
const REPLIFY_HASHTAGS_LOG_PREFIX = '[Replify HashtagsPatchCS]:';
const REPLIFY_HASHTAGS_INJECTED_SCRIPT_ID = 'replify-hashtags-fetch-override-script';

// --- PATCH MANAGEMENT DEFINITION (needed for early news patch's urlCheck) ---
// Define PATCH_INFO earlier so applyNewsPatch can use its urlCheck if needed,
// and the early news application logic can use it too.
const PATCH_INFO_DEFINITIONS = {
    campaigns: {
        urlCheck: (pathname) => pathname.startsWith("/studio/analytics/campaigns")
    },
    posts: {
        urlCheck: (pathname) => pathname.startsWith("/content/news/article/")
    },
    email: {
        urlCheck: (pathname) => pathname.includes("/studio/analytics/email")
    },
    news: {
        urlCheck: (pathname) => pathname.startsWith("/admin/analytics/news")
    },
    hashtags: {
        urlCheck: (pathname) => pathname.includes("/studio/analytics/hashtags")
    }
};


// --- NEWS PATCH ---
function applyNewsPatch() {
    // This check ensures it only runs if on the correct page,
    // complementing the check before calling it in executeEnabledPatches or early application.
    if (!PATCH_INFO_DEFINITIONS.news.urlCheck(window.location.pathname)) {
        return;
    }
    if (newsPatchCurrentlyActive) return; // Already applied

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

// --- CAMPAIGNS PATCH ---
// storageEnabled: Boolean indicating if chrome.storage wants this patch active.
function applyCampaignsPatch(storageEnabled = true) {
    const isOnCampaignsPage = PATCH_INFO_DEFINITIONS.campaigns.urlCheck(window.location.pathname);

    // If not on the correct page OR storage does not want this patch active:
    // Ensure observer is disconnected and take no further action to apply/re-apply script.
    if (!isOnCampaignsPage || !storageEnabled) {
        if (campaignsMutationObserver) {
            campaignsMutationObserver.disconnect();
            // console.log(REPLIFY_CAMPAIGNS_LOG_PREFIX, "Observer disconnected (not on page or storage disabled).");
        }
        // The script, if previously injected, remains. campaignsPatchCurrentlyActive flag also remains true.
        return;
    }

    // At this point, we are on the campaigns page AND storage has it enabled.
    // Manage the MutationObserver: disconnect existing (if any), create and connect new one.
    if (campaignsMutationObserver) {
        campaignsMutationObserver.disconnect();
    }

    // Define the observer callback function locally or ensure it's accessible if defined globally.
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

    // Specific condition from original code for when to activate the observer.
    if (window.location.pathname.includes('/studio/analytics/campaigns/') && !window.location.pathname.endsWith('/campaigns')) {
        campaignsMutationObserver.observe(document.body, { childList: true, subtree: true });
    }

    // If patch script is already active (previously injected), no need to re-inject.
    // Observer logic above would have been re-evaluated and applied as necessary.
    if (campaignsPatchCurrentlyActive) {
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
}

// --- POSTS PATCH ---
function applyPostsPatch() {
    if (!PATCH_INFO_DEFINITIONS.posts.urlCheck(window.location.pathname)) return;
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

// --- EMAIL PATCH ---
function applyEmailPatch() {
    if (!PATCH_INFO_DEFINITIONS.email.urlCheck(window.location.pathname)) return;
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

// --- HASHTAGS PATCH ---
function applyHashtagsPatch() {
    if (!PATCH_INFO_DEFINITIONS.hashtags.urlCheck(window.location.pathname)) return;
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

// --- PATCH MANAGEMENT ---
const PATCH_INFO = {
    campaigns: {
        isActive: () => campaignsPatchCurrentlyActive,
        apply: applyCampaignsPatch, // Will be called with storage state
        logPrefix: REPLIFY_CAMPAIGNS_LOG_PREFIX,
        urlCheck: PATCH_INFO_DEFINITIONS.campaigns.urlCheck
    },
    posts: {
        isActive: () => postsPatchCurrentlyActive,
        apply: applyPostsPatch,
        logPrefix: REPLIFY_POSTS_LOG_PREFIX,
        urlCheck: PATCH_INFO_DEFINITIONS.posts.urlCheck
    },
    email: {
        isActive: () => emailPatchCurrentlyActive,
        apply: applyEmailPatch,
        logPrefix: REPLIFY_EMAIL_LOG_PREFIX,
        urlCheck: PATCH_INFO_DEFINITIONS.email.urlCheck
    },
    news: {
        isActive: () => newsPatchCurrentlyActive,
        apply: applyNewsPatch,
        logPrefix: REPLIFY_NEWS_LOG_PREFIX,
        urlCheck: PATCH_INFO_DEFINITIONS.news.urlCheck
    },
    hashtags: {
        isActive: () => hashtagsPatchCurrentlyActive,
        apply: applyHashtagsPatch,
        logPrefix: REPLIFY_HASHTAGS_LOG_PREFIX,
        urlCheck: PATCH_INFO_DEFINITIONS.hashtags.urlCheck
    }
};

function executeEnabledPatches() {
    if (!(chrome.storage && chrome.storage.local)) {
        console.error("[Replify] Chrome storage API not available.");
        return;
    }

    chrome.storage.local.get("redirectAnalyticsState", (result) => {
        const state = result.redirectAnalyticsState || {};

        for (const type in PATCH_INFO) {
            const patch = PATCH_INFO[type];
            if (!patch) {
                console.warn(`[Replify] No patch info found for type: ${type}`);
                continue;
            }

            const storageSaysEnable = state[type] === true;
            const onCorrectPage = patch.urlCheck(window.location.pathname); // URL check from PATCH_INFO

            if (type === 'campaigns') {
                // Campaigns patch manages its observer based on storage and page state.
                // Pass storage state directly; applyCampaignsPatch will check page state internally.
                patch.apply(storageSaysEnable);
            } else {
                // For other patches, apply if storage enabled AND on correct page.
                // The apply function itself will check its 'currentlyActive' flag to prevent re-injection.
                if (storageSaysEnable && onCorrectPage) {
                    patch.apply();
                }
                // No 'else' branch for explicit cleanup, as per requirements.
                // Injected scripts remain. `currentlyActive` flags remain true once set.
                // Effects of patches that don't have ongoing logic (like observers)
                // will naturally cease if the user navigates away from the targeted elements/pages.
            }
        }
    });
}

// --- INITIALIZATION & LISTENERS ---
// News patch is attempted early, immediately after its definition and storage check.
executeEnabledPatches(); // Initial run for all patches based on current state.

if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.redirectAnalyticsState) {
            executeEnabledPatches();
        }
    });
}

// SPA Navigation detection
const observeUrlChangesFallback = () => {
    let oldHref = document.location.href;
    const observer = new MutationObserver(() => {
        if (oldHref !== document.location.href) {
            oldHref = document.location.href;
            executeEnabledPatches();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('popstate', () => {
        executeEnabledPatches();
    });
};

if (window.navigation && typeof window.navigation.addEventListener === 'function') {
    window.navigation.addEventListener('navigatesuccess', () => {
        executeEnabledPatches();
    });
     window.navigation.addEventListener('navigateerror', (event) => {
        console.error("[Replify] SPA 'navigateerror' event:", event.message);
        executeEnabledPatches(); // Re-evaluate state even on navigation errors
    });
} else {
    observeUrlChangesFallback(); // Use fallback for older environments
}