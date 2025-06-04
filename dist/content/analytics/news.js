// content/analytics/news.js
(function () {
    'use strict';

    const INJECTED_LOG_PREFIX = '[Replify InjectedNewsPatch]:';
    // console.log(INJECTED_LOG_PREFIX, 'Injected script (news.js) executed.');

    if (window.__REPLIFY_NEWS_FETCH_APPLIED__) {
        // console.warn(INJECTED_LOG_PREFIX, 'News fetch override already applied. Aborting.');
        return;
    }

    const pageContextOriginalFetch = window.fetch;
    if (!pageContextOriginalFetch) {
        console.error(INJECTED_LOG_PREFIX, 'CRITICAL: window.fetch is null/undefined in page context!');
        return;
    }
    // console.log(INJECTED_LOG_PREFIX, 'pageContextOriginalFetch captured by news injected script.');

    const SESSION_STORAGE_KEY = 'replifyNewsAnalyticsBaseline';
    const BASELINE_CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

    const rand = (min, max) => {
        min = Math.ceil(min); max = Math.floor(max);
        if (min > max) [min, max] = [max, min];
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };
    const randFloat = (min, max, decimals = 2) => parseFloat((Math.random() * (max - min) + min).toFixed(decimals));

    const TARGET_NEWS_API_URLS = {
        TIMESERIES: '/api/branch/analytics/posts/timeseries',
        RANKINGS: '/api/branch/analytics/posts/rankings',
        INTERACTIONS: '/api/branch/analytics/posts/stats/interactions'
    };

    function getUrlParams(urlString) {
        const params = {};
        try {
            const url = new URL(urlString, window.location.origin);
            url.searchParams.forEach((value, key) => { params[key] = value; });
        } catch (e) { /* silently fail for now */ }
        return params;
    }

    function calculateDateMetrics(sinceStr, untilStr) {
        // ... (same calculateDateMetrics function from email.js) ...
        const since = new Date(decodeURIComponent(sinceStr));
        const until = new Date(decodeURIComponent(untilStr));
        if (isNaN(since.getTime()) || isNaN(until.getTime()) || since > until) {
            const defaultUntil = new Date();
            const defaultSince = new Date(defaultUntil.getTime() - 30 * 24 * 60 * 60 * 1000); // Default to 30 days
            return { days: 30, weeks: 4, months: 1, error: true, sinceDate: defaultSince, untilDate: defaultUntil };
        }
        const dayMillis = 1000 * 60 * 60 * 24;
        const days = Math.max(1, Math.ceil((until - since) / dayMillis));
        const weeks = Math.max(1, Math.ceil(days / 7));
        const months = Math.max(1, Math.ceil(days / 30.44));
        return { days, weeks, months, sinceDate: since, untilDate: until, error: false };
    }

    function parseFilters(urlString) {
        const params = getUrlParams(urlString);
        let filterCount = 0;
        let reductionFactor = 1.0;
        // These are very rough estimates, adjust as needed
        const filterTypeReductions = {
            platform: 0.5,  // e.g., choosing 'ios' cuts traffic by ~half
            spaceId: 0.3,   // A specific space gets ~30% of total
            channelId: 0.4, // A specific channel gets ~40% of its parent (space or total)
            groupId: 0.2    // A specific group gets ~20% of its parent
        };

        if (params.filter) {
            const filterString = decodeURIComponent(params.filter).toLowerCase();
            if (filterString.includes('platform eq')) { filterCount++; reductionFactor *= filterTypeReductions.platform; }
            if (filterString.includes('spaceid eq')) { filterCount++; reductionFactor *= filterTypeReductions.spaceId; }
            if (filterString.includes('channelid eq')) { filterCount++; reductionFactor *= filterTypeReductions.channelId; }
            if (filterString.includes('groupid eq')) { filterCount++; reductionFactor *= filterTypeReductions.groupId; }
        }
        return { filterCount, reductionFactor };
    }

    function getBaselineYearlyMetrics() {
        try {
            const cached = sessionStorage.getItem(SESSION_STORAGE_KEY);
            if (cached) {
                const data = JSON.parse(cached);
                if (data.timestamp && (Date.now() - data.timestamp < BASELINE_CACHE_DURATION_MS)) {
                    // console.log(INJECTED_LOG_PREFIX, "Using cached baseline metrics.");
                    return data.metrics;
                }
            }
        } catch (e) { console.error(INJECTED_LOG_PREFIX, "Error reading from session storage:", e); }

        // console.log(INJECTED_LOG_PREFIX, "Generating new baseline yearly metrics.");
        // Generous yearly figures for "All Filters"
        const metrics = {
            registeredVisitors: rand(15000, 30000),
            registeredVisits: 0, // Will be derived
            unregisteredVisitors: rand(100, 500),
            unregisteredVisits: 0, // Will be derived
            newPosts: rand(200, 500), // ~1-2 new posts per working day
            comments: 0, // Will be derived
            likes: 0,    // Will be derived
            shares: 0,   // Will be derived
            publishedPosts: 0, // Equivalent to newPosts or slightly more
            publishedPostsUnique: 0, // Unique content items published
            interactedPostsUnique: 0 // Unique posts that received interaction
        };

        metrics.registeredVisits = metrics.registeredVisitors * randFloat(2.5, 5.0);
        metrics.unregisteredVisits = metrics.unregisteredVisitors * randFloat(1.5, 3.0);
        
        // Interactions are a fraction of visitors or posts
        const interactionBase = metrics.registeredVisitors * 0.1; // 10% of visitors interact
        metrics.likes = Math.round(interactionBase * randFloat(0.3, 0.7)); // Likes are most common
        metrics.comments = Math.round(interactionBase * randFloat(0.05, 0.2));
        metrics.shares = Math.round(interactionBase * randFloat(0.02, 0.1));

        metrics.publishedPostsUnique = metrics.newPosts; // Assume each newPost is unique content
        metrics.publishedPosts = metrics.publishedPostsUnique * randFloat(1.0, 1.2); // Slight factor for cross-posting etc.
        metrics.interactedPostsUnique = Math.round(metrics.publishedPostsUnique * randFloat(0.6, 0.9)); // Most posts get some interaction

        try {
            sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ metrics, timestamp: Date.now() }));
        } catch (e) { console.error(INJECTED_LOG_PREFIX, "Error writing to session storage:", e); }
        
        return metrics;
    }

    function generateMetricsForPeriodAndFilters(daysInRange, filterReduction) {
        const yearlyBaseline = getBaselineYearlyMetrics();
        const dailyFactor = daysInRange / 365.0;
        const result = {};

        for (const key in yearlyBaseline) {
            result[key] = Math.round(yearlyBaseline[key] * dailyFactor * filterReduction * randFloat(0.85, 1.15));
            result[key] = Math.max(0, result[key]); // Ensure non-negative
        }

        // Ensure some minimums for very short periods or heavy filtering, so it's not all zeros
        if (daysInRange <= 7 || filterReduction < 0.1) {
            result.registeredVisitors = Math.max(result.registeredVisitors, rand(1, 10));
            result.registeredVisits = Math.max(result.registeredVisits, result.registeredVisitors);
            result.newPosts = Math.max(result.newPosts, (daysInRange <=7 && daysInRange >=1) ? rand(0,1) : rand(0, Math.ceil(daysInRange/7)));
            result.publishedPostsUnique = Math.max(result.publishedPostsUnique, result.newPosts);
            result.publishedPosts = Math.max(result.publishedPosts, result.publishedPostsUnique);

            if (result.registeredVisitors > 0) {
                 result.likes = Math.max(result.likes, rand(0, Math.floor(result.registeredVisitors * 0.1)));
                 result.interactedPostsUnique = Math.max(result.interactedPostsUnique, result.likes > 0 ? 1 : 0, result.comments > 0 ? 1 : 0);
            }
        }
        // Logical consistencies
        result.registeredVisits = Math.max(result.registeredVisits, result.registeredVisitors);
        result.unregisteredVisits = Math.max(result.unregisteredVisits, result.unregisteredVisitors);
        result.publishedPosts = Math.max(result.publishedPosts, result.publishedPostsUnique);
        result.interactedPostsUnique = Math.min(result.interactedPostsUnique, result.publishedPostsUnique);
        
        // Ensure likes, comments, shares are not more than visitors (rough check)
        result.likes = Math.min(result.likes, result.registeredVisitors);
        result.comments = Math.min(result.comments, result.registeredVisitors);
        result.shares = Math.min(result.shares, result.registeredVisitors);

        return result;
    }


    const injectedNewsCustomFetch = async function(...args) {
        const resource = args[0];
        const requestFullUrl = typeof resource === 'string' ? resource : resource.url;
        let urlPath = '';
        let urlParams = {};

        try {
            const parsedUrl = new URL(requestFullUrl, window.location.origin);
            urlPath = parsedUrl.pathname;
            urlParams = getUrlParams(requestFullUrl);
        } catch (e) {
            if (requestFullUrl.startsWith('/')) {
                 urlPath = requestFullUrl.split('?')[0];
                 urlParams = getUrlParams(requestFullUrl);
            } else { return pageContextOriginalFetch.apply(this, args); }
        }

        let matchedEndpointKey = null;
        if (urlPath === TARGET_NEWS_API_URLS.TIMESERIES) matchedEndpointKey = 'TIMESERIES';
        else if (urlPath === TARGET_NEWS_API_URLS.RANKINGS) matchedEndpointKey = 'RANKINGS';
        else if (urlPath === TARGET_NEWS_API_URLS.INTERACTIONS) matchedEndpointKey = 'INTERACTIONS';

        if (matchedEndpointKey) {
            // console.log(INJECTED_LOG_PREFIX + ` Intercepting ${matchedEndpointKey}: ${requestFullUrl.substring(0,100)}`);
            
            const { days, weeks, months, sinceDate, untilDate } = calculateDateMetrics(urlParams.since, urlParams.until);
            const { filterCount, reductionFactor } = parseFilters(requestFullUrl);
            
            // Get overall metrics for the current period and filters
            const periodMetrics = generateMetricsForPeriodAndFilters(days, reductionFactor);

            try {
                const response = await pageContextOriginalFetch.apply(this, args);
                let originalJsonData = {};
                if (response.ok && response.headers.get("content-type")?.includes("application/json")) {
                    originalJsonData = await response.clone().json();
                }

                let modifiedData = {};

                switch (matchedEndpointKey) {
                    case 'INTERACTIONS':
                        modifiedData = {
                            publishedPosts: periodMetrics.publishedPosts,
                            publishedPostsUnique: periodMetrics.publishedPostsUnique,
                            interactedPostsUnique: periodMetrics.interactedPostsUnique
                        };
                        break;

                    case 'TIMESERIES':
                        modifiedData.timeseries = [];
                        const groupBy = urlParams.groupBy || 'day';
                        let numIntervals = 0;
                        if (groupBy === 'month') numIntervals = months;
                        else if (groupBy === 'week') numIntervals = weeks;
                        else numIntervals = days;
                        numIntervals = Math.max(1, numIntervals);

                        let currentDate = new Date(sinceDate);
                        const tempTotals = { ...periodMetrics }; // Use a copy for distribution

                        for (let i = 0; i < numIntervals; i++) {
                            const intervalDateStr = currentDate.toISOString().split('T')[0] + "T00:00:00Z"; // Or use original group if available
                            let groupData = {};
                            
                            // Distribute totals
                            ['registeredVisitors', 'registeredVisits', 'unregisteredVisitors', 'unregisteredVisits', 'newPosts', 'comments', 'likes', 'shares'].forEach(key => {
                                const share = (i === numIntervals - 1) ? tempTotals[key] : Math.round(periodMetrics[key] / numIntervals * randFloat(0.7, 1.3));
                                groupData[key] = Math.max(0, share);
                                tempTotals[key] = Math.max(0, tempTotals[key] - groupData[key]);
                            });
                            // Basic consistencies for interval data
                            groupData.registeredVisits = Math.max(groupData.registeredVisits, groupData.registeredVisitors);
                            groupData.unregisteredVisits = Math.max(groupData.unregisteredVisits, groupData.unregisteredVisitors);
                            groupData.likes = Math.min(groupData.likes, groupData.registeredVisitors);
                             
                            // The API response uses a nested group for date parts
                            const dateGroup = {
                                day: currentDate.getUTCDate(),
                                month: currentDate.getUTCMonth() + 1, // JS months are 0-indexed
                                year: currentDate.getUTCFullYear()
                            };

                            modifiedData.timeseries.push({ group: dateGroup, ...groupData });

                            if (groupBy === 'month') currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
                            else if (groupBy === 'week') currentDate.setUTCDate(currentDate.getUTCDate() + 7);
                            else currentDate.setUTCDate(currentDate.getUTCDate() + 1);
                            if (currentDate > untilDate && i < numIntervals - 1) break;
                        }
                        break;

                    case 'RANKINGS':
                        modifiedData.entities = (originalJsonData && originalJsonData.entities) ? originalJsonData.entities : { contents: {}, posts: {}, spaces: {} };
                        modifiedData.ranking = [];
                        const existingRankingItems = (originalJsonData && Array.isArray(originalJsonData.ranking)) ? originalJsonData.ranking : [];
                        
                        if (existingRankingItems.length > 0) {
                            // console.log(INJECTED_LOG_PREFIX, "Augmenting existing ranking items.");
                            const numItemsToProcess = existingRankingItems.length; // Process all existing
                            let remainingMetrics = { ...periodMetrics }; // For distributing among items

                            existingRankingItems.forEach((item, index) => {
                                const itemMetrics = {};
                                // Distribute a portion of overall metrics to each item
                                ['registeredVisitors', 'registeredVisits', 'unregisteredVisitors', 'unregisteredVisits', 'newPosts', 'comments', 'likes', 'shares'].forEach(key => {
                                    const share = (index === numItemsToProcess - 1) ? remainingMetrics[key] : Math.round(periodMetrics[key] / numItemsToProcess * randFloat(0.5, 1.5));
                                    itemMetrics[key] = Math.max(0, share);
                                    remainingMetrics[key] = Math.max(0, remainingMetrics[key] - itemMetrics[key]);
                                });
                                // Basic consistencies for item data
                                itemMetrics.registeredVisits = Math.max(itemMetrics.registeredVisits, itemMetrics.registeredVisitors);
                                itemMetrics.unregisteredVisits = Math.max(itemMetrics.unregisteredVisits, itemMetrics.unregisteredVisitors);
                                itemMetrics.likes = Math.min(itemMetrics.likes, itemMetrics.registeredVisitors);


                                modifiedData.ranking.push({
                                    group: item.group, // Preserve original group (postId, channelId, etc.)
                                    ...itemMetrics
                                });
                            });
                        } else {
                            // console.log(INJECTED_LOG_PREFIX, "Original RANKINGS empty. Returning empty ranking.");
                            // Per user request, if original ranking is empty, keep it empty.
                            // Entities are already copied or initialized.
                        }
                        break;
                }
                
                // console.log(INJECTED_LOG_PREFIX + ` Modified ${matchedEndpointKey} data:`, JSON.parse(JSON.stringify(modifiedData)));
                return new Response(JSON.stringify(modifiedData), {
                    status: 200, statusText: "OK", headers: {'Content-Type': 'application/json'}
                });

            } catch (err) {
                console.error(INJECTED_LOG_PREFIX + ` Error during data generation for ${requestFullUrl}:`, err);
                // Fallback for errors
                const emptyResponses = {
                    TIMESERIES: {timeseries:[]},
                    RANKINGS: {entities:{contents:{},posts:{},spaces:{}}, ranking:[]},
                    INTERACTIONS: {publishedPosts:0,publishedPostsUnique:0,interactedPostsUnique:0}
                };
                return new Response(JSON.stringify(emptyResponses[matchedEndpointKey] || {}), {status: 200, headers: {'Content-Type': 'application/json'}});
            }
        }
        return pageContextOriginalFetch.apply(this, args);
    };

    window.fetch = injectedNewsCustomFetch;
    window.__REPLIFY_NEWS_FETCH_APPLIED__ = true;
    // console.log(INJECTED_LOG_PREFIX + ' News fetch override applied.');

    window.__REPLIFY_REVERT_NEWS_FETCH__ = function() { /* ... (same revert structure as other patches) ... */ 
        if (window.fetch === injectedNewsCustomFetch) {
            window.fetch = pageContextOriginalFetch;
            delete window.__REPLIFY_NEWS_FETCH_APPLIED__;
            delete window.__REPLIFY_REVERT_NEWS_FETCH__;
            console.log(INJECTED_LOG_PREFIX + ' News fetch restored by revert function.');
            return true;
        }
        return false;
    };
})();