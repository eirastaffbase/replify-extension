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

let hashtagsPatchCurrentlyActive = false;
const REPLIFY_HASHTAGS_LOG_PREFIX = '[Replify HashtagsPatchCS]:';
const REPLIFY_HASHTAGS_INJECTED_SCRIPT_ID = 'replify-hashtags-fetch-override-script';

let dashboardPatchCurrentlyActive = false;
const REPLIFY_DASHBOARD_LOG_PREFIX = '[Replify DashboardPatchCS]:';
const REPLIFY_DASHBOARD_INJECTED_SCRIPT_ID = 'replify-dashboard-fetch-override-script';

let userPatchCurrentlyActive = false;
const REPLIFY_USER_LOG_PREFIX = '[Replify UserPatchCS]:';
const REPLIFY_USER_INJECTED_SCRIPT_ID = 'replify-user-fetch-override-script';

let searchPatchCurrentlyActive = false;
const REPLIFY_SEARCH_LOG_PREFIX = '[Replify UserPatchCS]:';
const REPLIFY_SEARCH_INJECTED_SCRIPT_ID = 'replify-search-fetch-override-script';



// --- PATCH MANAGEMENT DEFINITION ---
const PATCH_INFO_DEFINITIONS = {
    campaigns: {
        urlCheck: (pathname) => pathname.startsWith("/studio/analytics/campaigns")
    },
    posts: {
        urlCheck: (pathname) => pathname.startsWith("/content/news/article/")
    },
    email: {
        urlCheck: (pathname) => pathname.includes("/studio/analytics/email") || pathname.startsWith("/studio/email/")
    },
    news: {
        urlCheck: (pathname) => pathname.startsWith("/admin/analytics/news")
    },
    hashtags: {
        urlCheck: (pathname) => pathname.includes("/studio/analytics/hashtags")
    },
    dashboard: {
        urlCheck: (pathname) => pathname.endsWith("/studio")
    },
    user: {
        urlCheck: (pathname) => pathname.includes("/admin/analytics/users")
    },
    search: {
        urlCheck: (pathname) => pathname.includes("/studio/analytics/search")
    }
};


// --- NEWS PATCH ---
function applyNewsPatch() {
    if (!PATCH_INFO_DEFINITIONS.news.urlCheck(window.location.pathname)) {
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

// --- CAMPAIGNS PATCH ---
function applyCampaignsPatch(storageEnabled = true) {
    const isOnCampaignsPage = PATCH_INFO_DEFINITIONS.campaigns.urlCheck(window.location.pathname);

    if (!isOnCampaignsPage || !storageEnabled) {
        if (campaignsMutationObserver) {
            campaignsMutationObserver.disconnect();
        }
        return;
    }

    if (campaignsMutationObserver) {
        campaignsMutationObserver.disconnect();
    }

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

// --- DASHBOARD PATCH ---
function applyDashboardPatch() {
    if (!PATCH_INFO_DEFINITIONS.dashboard.urlCheck(window.location.pathname)) return;
    if (dashboardPatchCurrentlyActive) return;

    console.log(REPLIFY_DASHBOARD_LOG_PREFIX, "Applying Dashboard Patch via SCRIPT SRC INJECTION...");
    const oldScriptElement = document.getElementById(REPLIFY_DASHBOARD_INJECTED_SCRIPT_ID);
    if (oldScriptElement) oldScriptElement.remove();
    const scriptElement = document.createElement('script');
    scriptElement.id = REPLIFY_DASHBOARD_INJECTED_SCRIPT_ID;
    scriptElement.src = chrome.runtime.getURL('content/analytics/dashboard.js');
    scriptElement.onload = () => console.log(REPLIFY_DASHBOARD_LOG_PREFIX, "Injected dashboard.js loaded.");
    scriptElement.onerror = () => console.error(REPLIFY_DASHBOARD_LOG_PREFIX, "ERROR loading injected email.js.");
    (document.head || document.documentElement).appendChild(scriptElement);
    dashboardPatchCurrentlyActive = true;
}

// --- USER PATCH ---
function applyUserPatch() {
    if (!PATCH_INFO_DEFINITIONS.user.urlCheck(window.location.pathname)) return;
    if (userPatchCurrentlyActive) return;

    console.log(REPLIFY_USER_LOG_PREFIX, "Applying User Patch via SCRIPT SRC INJECTION...");
    const oldScriptElement = document.getElementById(REPLIFY_USER_INJECTED_SCRIPT_ID);
    if (oldScriptElement) oldScriptElement.remove();
    const scriptElement = document.createElement('script');
    scriptElement.id = REPLIFY_USER_INJECTED_SCRIPT_ID;
    scriptElement.src = chrome.runtime.getURL('content/analytics/user.js');
    scriptElement.onload = () => console.log(REPLIFY_USER_LOG_PREFIX, "Injected user.js loaded.");
    scriptElement.onerror = () => console.error(REPLIFY_USER_LOG_PREFIX, "ERROR loading injected email.js.");
    (document.head || document.documentElement).appendChild(scriptElement);
    userPatchCurrentlyActive = true;
}

// --- SEARCH PATCH ---
function applySearchPatch() {
    if (!PATCH_INFO_DEFINITIONS.search.urlCheck(window.location.pathname)) return;
    if (searchPatchCurrentlyActive) return;

    console.log(REPLIFY_SEARCH_LOG_PREFIX, "Applying Search Patch via SCRIPT SRC INJECTION...");
    const oldScriptElement = document.getElementById(REPLIFY_SEARCH_INJECTED_SCRIPT_ID);
    if (oldScriptElement) oldScriptElement.remove();
    const scriptElement = document.createElement('script');
    scriptElement.id = REPLIFY_SEARCH_INJECTED_SCRIPT_ID;
    scriptElement.src = chrome.runtime.getURL('content/analytics/search.js');
    scriptElement.onload = () => console.log(REPLIFY_SEARCH_LOG_PREFIX, "Injected search.js loaded.");
    scriptElement.onerror = () => console.error(REPLIFY_SEARCH_LOG_PREFIX, "ERROR loading injected email.js.");
    (document.head || document.documentElement).appendChild(scriptElement);
    searchPatchCurrentlyActive = true;
}


// --- PATCH MANAGEMENT ---
const PATCH_INFO = {
    campaigns: {
        isActive: () => campaignsPatchCurrentlyActive,
        apply: applyCampaignsPatch, 
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
    },
    dashboard: {
        isActive: () => dashboardPatchCurrentlyActive,
        apply: applyDashboardPatch,
        logPrefix: REPLIFY_DASHBOARD_LOG_PREFIX,
        urlCheck: PATCH_INFO_DEFINITIONS.dashboard.urlCheck
    },
    user: {
        isActive: () => userPatchCurrentlyActive,
        apply: applyUserPatch,
        logPrefix: REPLIFY_USER_LOG_PREFIX,
        urlCheck: PATCH_INFO_DEFINITIONS.user.urlCheck
    },
    search: {
        isActive: () => searchPatchCurrentlyActive,
        apply: applySearchPatch,
        logPrefix: REPLIFY_SEARCH_LOG_PREFIX,
        urlCheck: PATCH_INFO_DEFINITIONS.search.urlCheck
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
            const onCorrectPage = patch.urlCheck(window.location.pathname); 

            if (type === 'campaigns') {
                patch.apply(storageSaysEnable);
            } else {
                if (storageSaysEnable && onCorrectPage) {
                    patch.apply();
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
        executeEnabledPatches(); 
    });
} else {
    observeUrlChangesFallback(); 
}