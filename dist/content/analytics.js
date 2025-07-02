/* dist/content/analytics.js */
console.log("[Replify] Analytics Content Script Loader Executed. Path:", window.location.pathname);

/**
 * Configuration mapping state keys to their corresponding script paths.
 * To add a new script, just add a new entry here.
 */
const scriptConfig = {
    news: 'content/analytics/news.js',
    campaigns: 'content/analytics/campaigns.js',
    user: 'content/analytics/user.js',
    search: 'content/analytics/search.js'
};

/**
 * Injects a script into the document's head if it doesn't already exist.
 * @param {string} scriptPath - The path to the script to inject.
 */
function injectScript(scriptPath) {
    // Generate a unique ID from the filename to prevent re-injection
    const scriptName = scriptPath.split('/').pop();
    const scriptId = `replify-injected-${scriptName}`;

    if (document.getElementById(scriptId)) {
        return; // Script already exists, do nothing
    }

    const scriptElement = document.createElement('script');
    scriptElement.id = scriptId;
    scriptElement.src = chrome.runtime.getURL(scriptPath);
    scriptElement.onload = () => console.log(`[Replify CS] Pre-injected: ${scriptPath} loaded.`);
    scriptElement.onerror = () => console.error(`[Replify CS] ERROR pre-injecting ${scriptPath}.`);
    
    // Append to head or documentElement as a fallback
    (document.head || document.documentElement).appendChild(scriptElement);
}

/**
 * Checks storage and injects all necessary scripts based on the state.
 */
function initializeScriptInjection() {
    if (chrome.storage && chrome.storage.local) {
        // Fetch the state object once for all scripts
        chrome.storage.local.get("redirectAnalyticsState", (result) => {
            const state = result.redirectAnalyticsState || {};

            // Iterate over our script configuration
            for (const key in scriptConfig) {
                // If the corresponding state property is true, inject the script
                if (state[key] === true) {
                    injectScript(scriptConfig[key]);
                }
            }
        });
    }
}

// Run the initialization
initializeScriptInjection();


// --- SINGLE CONFIGURATION OBJECT ---
// All patch information is defined in one place.
// To add a new patch, just add a new entry here.
const PATCH_CONFIG = {
    campaigns: {
        urlCheck: (pathname) => pathname.startsWith("/studio/analytics/campaigns"),
        scriptPath: 'content/analytics/campaigns.js'
    },
    posts: {
        urlCheck: (pathname) => pathname.startsWith("/content/news/article/"),
        scriptPath: 'content/analytics/posts.js'
    },
    email: {
        urlCheck: (pathname) => pathname.includes("/studio/analytics/email") || pathname.startsWith("/studio/email/"),
        scriptPath: 'content/analytics/email.js'
    },
    news: {
        urlCheck: (pathname) => pathname.startsWith("/admin/analytics/news"),
        scriptPath: 'content/analytics/news.js'
    },
    hashtags: {
        urlCheck: (pathname) => pathname.includes("/studio/analytics/hashtags"),
        scriptPath: 'content/analytics/hashtags.js'
    },
    dashboard: {
        urlCheck: (pathname) => pathname.endsWith("/studio"),
        scriptPath: 'content/analytics/dashboard.js'
    },
    user: {
        urlCheck: (pathname) => pathname.includes("/admin/analytics/users"),
        scriptPath: 'content/analytics/user.js'
    },
    search: {
        urlCheck: (pathname) => pathname.includes("/studio/analytics/search"),
        scriptPath: 'content/analytics/search.js'
    },
    pages: {
        urlCheck: (pathname) => pathname.includes("/pages"),
        scriptPath: 'content/analytics/pages.js'
    }
};

// --- GLOBAL STATE & OBSERVERS ---
const patchState = {}; // Single object to track active state, e.g., patchState.news = true
let campaignsMutationObserver = null;

// --- GENERIC PATCH APPLIER ---
// This one function replaces all the individual `apply...Patch` functions.
function applyPatch(type) {
    const config = PATCH_CONFIG[type];
    if (!config) return;

    if (patchState[type]) return; // Already active

    console.log(`[Replify ${type}PatchCS]: Applying Patch via SCRIPT SRC INJECTION...`);
    const scriptId = `replify-${type}-fetch-override-script`;

    // Clean up old script if it exists
    const oldScriptElement = document.getElementById(scriptId);
    if (oldScriptElement) oldScriptElement.remove();

    const scriptElement = document.createElement('script');
    scriptElement.id = scriptId;
    scriptElement.src = chrome.runtime.getURL(config.scriptPath);
    scriptElement.onload = () => console.log(`[Replify ${type}PatchCS]: Injected ${config.scriptPath} loaded.`);
    scriptElement.onerror = () => console.error(`[Replify ${type}PatchCS]: ERROR loading injected ${config.scriptPath}.`);
    (document.head || document.documentElement).appendChild(scriptElement);
    patchState[type] = true;
}

// --- SPECIAL CAMPAIGNS LOGIC ---
function handleCampaignsPatch(storageEnabled) {
    const isOnCampaignsPage = PATCH_CONFIG.campaigns.urlCheck(window.location.pathname);

    if (campaignsMutationObserver) {
        campaignsMutationObserver.disconnect();
    }
    
    if (!isOnCampaignsPage || !storageEnabled) {
        return;
    }

    // Apply the standard script injection
    applyPatch('campaigns');
    
    // Apply the special MutationObserver logic for campaigns
    function removeYearFromAxisDates_CS() {
        document.querySelectorAll('g.visx-axis-bottom text > tspan, g.visx-axis-left text > tspan').forEach(tspan => {
            const match = tspan.textContent.trim().match(/^(\d{1,2}\/\d{1,2})\/\d{2,4}$/);
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


// --- MAIN EXECUTION LOGIC ---
function executeEnabledPatches() {
    if (!chrome.storage || !chrome.storage.local) {
        console.error("[Replify] Chrome storage API not available.");
        return;
    }

    // On navigation, reset the active state of all non-campaigns patches
    Object.keys(patchState).forEach(key => {
        if (key !== 'campaigns') patchState[key] = false;
    });

    chrome.storage.local.get("redirectAnalyticsState", (result) => {
        const state = result.redirectAnalyticsState || {};
        const currentPathname = window.location.pathname;

        for (const type in PATCH_CONFIG) {
            const config = PATCH_CONFIG[type];
            const storageSaysEnable = state[type] === true;
            const onCorrectPage = config.urlCheck(currentPathname);

            if (type === 'campaigns') {
                handleCampaignsPatch(storageSaysEnable);
            } else {
                if (storageSaysEnable && onCorrectPage) {
                    applyPatch(type);
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
            console.log("[Replify] Storage changed, re-evaluating patches.");
            executeEnabledPatches();
        }
    });
}

// Use modern Navigation API if available, otherwise fall back
if (window.navigation && typeof window.navigation.addEventListener === 'function') {
    window.navigation.addEventListener('navigatesuccess', executeEnabledPatches);
    window.navigation.addEventListener('navigateerror', (e) => {
        console.error("[Replify] SPA 'navigateerror' event:", e.message);
        executeEnabledPatches(); 
    });
} else {
    // Fallback for older browsers
    let oldHref = document.location.href;
    const observer = new MutationObserver(() => {
        if (oldHref !== document.location.href) {
            oldHref = document.location.href;
            executeEnabledPatches();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('popstate', executeEnabledPatches);
}