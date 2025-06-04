// content/analytics/hashtags.js
(function () {
    'use strict';

    const INJECTED_LOG_PREFIX = '[Replify InjectedHashtagsPatch]:';
    // console.log(INJECTED_LOG_PREFIX, 'Injected script (hashtags.js) executed.');

    if (window.__REPLIFY_HASHTAGS_FETCH_APPLIED__) {
        // console.warn(INJECTED_LOG_PREFIX, 'Hashtags fetch override already applied. Aborting.');
        return;
    }

    const pageContextOriginalFetch = window.fetch;
    if (!pageContextOriginalFetch) {
        console.error(INJECTED_LOG_PREFIX, 'CRITICAL: window.fetch is null/undefined in page context!');
        return;
    }
    // console.log(INJECTED_LOG_PREFIX, 'pageContextOriginalFetch captured by hashtags injected script.');

    const rand = (min, max) => {
        min = Math.ceil(min); max = Math.floor(max);
        if (min > max) [min, max] = [max, min];
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    const TARGET_HASHTAG_API_URL = '/api/branch/analytics/hashtags/contentsVisitsClicks';

    const injectedHashtagsCustomFetch = async function(...args) {
        const resource = args[0];
        const requestFullUrl = typeof resource === 'string' ? resource : resource.url;
        let urlPath = '';

        try {
            const parsedUrl = new URL(requestFullUrl, window.location.origin);
            urlPath = parsedUrl.pathname;
        } catch (e) {
            if (requestFullUrl.startsWith('/')) {
                 urlPath = requestFullUrl.split('?')[0];
            } else {
                return pageContextOriginalFetch.apply(this, args);
            }
        }

        if (urlPath === TARGET_HASHTAG_API_URL) {
            // console.log(INJECTED_LOG_PREFIX + ` Intercepting ${TARGET_HASHTAG_API_URL}: ${requestFullUrl.substring(0,150)}`);
            
            try {
                const response = await pageContextOriginalFetch.apply(this, args);
                let originalJsonData = []; // Default to empty array

                if (response.ok && response.headers.get("content-type")?.includes("application/json")) {
                    originalJsonData = await response.clone().json();
                } else if (!response.ok) {
                    console.warn(INJECTED_LOG_PREFIX, `Original request for ${TARGET_HASHTAG_API_URL} failed with status ${response.status}. Returning empty array.`);
                     return new Response(JSON.stringify([]), {
                        status: 200, statusText: "OK", headers: {'Content-Type': 'application/json'}
                    });
                }
                 // Ensure originalJsonData is an array
                if (!Array.isArray(originalJsonData)) {
                    console.warn(INJECTED_LOG_PREFIX, `Original data for ${TARGET_HASHTAG_API_URL} is not an array. Returning empty array.`);
                    originalJsonData = [];
                }


                let modifiedData = [];

                if (originalJsonData.length > 0) {
                    // console.log(INJECTED_LOG_PREFIX, "Augmenting existing hashtags.");
                    modifiedData = originalJsonData.map(item => {
                        const newItem = { ...item }; // Clone the item

                        // Add more clicks
                        // More clicks if there are posts/pages, or a base amount if not many posts
                        const baseClicksToAdd = rand(item.posts > 0 || item.pages > 0 ? 3 : 1, item.posts > 0 || item.pages > 0 ? 15 : 5);
                        const clicksFromPosts = Math.floor(item.posts * randFloat(0.5, 2.5));
                        const clicksFromPages = Math.floor(item.pages * randFloat(0.5, 2.5));
                        newItem.clicks += baseClicksToAdd + clicksFromPosts + clicksFromPages;
                        
                        // Add more visits ("users")
                        // Ensure visits increase at least by the number of new clicks, plus some general increase
                        const baseVisitsToAdd = rand(item.posts > 0 || item.pages > 0 ? 5 : 2, item.posts > 0 || item.pages > 0 ? 25 : 10);
                        const visitsFromPosts = Math.floor(item.posts * randFloat(1, 5));
                        const visitsFromPages = Math.floor(item.pages * randFloat(1, 5));
                        newItem.visits += baseVisitsToAdd + visitsFromPosts + visitsFromPages;

                        // Ensure visits >= clicks
                        if (newItem.visits < newItem.clicks) {
                            newItem.visits = newItem.clicks + rand(0, Math.floor(newItem.clicks * 0.2) + 1); // Add 0-20% more visits than clicks
                        }
                        
                        // Ensure stats are non-negative
                        newItem.clicks = Math.max(0, newItem.clicks);
                        newItem.visits = Math.max(0, newItem.visits);
                        
                        return newItem;
                    });
                } else {
                    // console.log(INJECTED_LOG_PREFIX, "Original hashtags list is empty. Returning empty list.");
                    // As per requirement, if original is empty, modified is also empty.
                }
                
                // console.log(INJECTED_LOG_PREFIX + ` Modified hashtags data:`, JSON.parse(JSON.stringify(modifiedData)));
                return new Response(JSON.stringify(modifiedData), {
                    status: 200, statusText: "OK", headers: {'Content-Type': 'application/json'}
                });

            } catch (err) {
                console.error(INJECTED_LOG_PREFIX + ` Error during fetch interception for ${requestFullUrl}:`, err);
                return new Response(JSON.stringify([]), {status: 200, headers: {'Content-Type': 'application/json'}}); // Return empty array on error
            }
        }
        return pageContextOriginalFetch.apply(this, args);
    };

    window.fetch = injectedHashtagsCustomFetch;
    window.__REPLIFY_HASHTAGS_FETCH_APPLIED__ = true;
    // console.log(INJECTED_LOG_PREFIX + ' Hashtags fetch override applied.');

    window.__REPLIFY_REVERT_HASHTAGS_FETCH__ = function() {
        if (window.fetch === injectedHashtagsCustomFetch) {
            window.fetch = pageContextOriginalFetch;
            delete window.__REPLIFY_HASHTAGS_FETCH_APPLIED__;
            delete window.__REPLIFY_REVERT_HASHTAGS_FETCH__;
            console.log(INJECTED_LOG_PREFIX + ' Hashtags fetch restored by revert function.');
            return true;
        }
        return false;
    };
})();