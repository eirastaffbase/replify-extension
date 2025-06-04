// content/analytics/news.js
(function () {

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
        } catch (e) { /* silently fail */ }
        return params;
    }

    function calculateDateMetrics(sinceStr, untilStr) {
        const sinceInput = decodeURIComponent(sinceStr);
        const untilInput = decodeURIComponent(untilStr);
        let since = new Date(sinceInput);
        let until = new Date(untilInput);

        // Handle cases where timezone might make 'until' seem before 'since' on the same day for short periods
        if (until < since && (until.toDateString() === since.toDateString() || new Date(until.getTime() + 24*60*60*1000) > since) ) {
           // If 'until' is on the same day as 'since' but earlier time, or very close, adjust 'until' to end of its day for calculation.
           // Or if 'until' is slightly before 'since' due to timezone parsing for 'today' or 'yesterday' ranges
           // A common pattern for "today" might be since=T00:00:00 and until=Tcurrent_time.
           // For "yesterday", since=YESTERDAY_T00:00:00, until=YESTERDAY_T23:59:59
           // If 'until' is the current time on the same day as 'since', this calculation is fine.
        }
        
        if (isNaN(since.getTime()) || isNaN(until.getTime()) || until < since) {
            console.warn(INJECTED_LOG_PREFIX, `Date parsing issue or until<since. since: ${sinceInput}, until: ${untilInput}. Defaulting to ~1 day.`);
            const defaultUntil = new Date();
            const defaultSince = new Date(defaultUntil.getTime() - 1 * 24 * 60 * 60 * 1000);
            since = defaultSince;
            until = defaultUntil;
        }

        const millisPerMinute = 1000 * 60;
        const millisPerHour = millisPerMinute * 60;
        const millisPerDay = millisPerHour * 24;

        const durationMillis = Math.max(millisPerHour, until - since); // Ensure at least 1 hour duration for calculations

        const hours = Math.max(1, Math.ceil(durationMillis / millisPerHour));
        const days = Math.max(1, Math.ceil(durationMillis / millisPerDay));
        const weeks = Math.max(1, Math.ceil(days / 7));
        const months = Math.max(1, Math.ceil(days / 30.44));
        
        return { hours, days, weeks, months, sinceDate: since, untilDate: until, error: false };
    }


    function parseFilters(urlString) { /* ... same as before ... */
        const params = getUrlParams(urlString);
        let filterCount = 0;
        let reductionFactor = 1.0;
        const filterTypeReductions = { platform: 0.5, spaceId: 0.3, channelId: 0.4, groupId: 0.2 };
        if (params.filter) {
            const filterString = decodeURIComponent(params.filter).toLowerCase();
            if (filterString.includes('platform eq')) { filterCount++; reductionFactor *= filterTypeReductions.platform; }
            if (filterString.includes('spaceid eq')) { filterCount++; reductionFactor *= filterTypeReductions.spaceId; }
            if (filterString.includes('channelid eq')) { filterCount++; reductionFactor *= filterTypeReductions.channelId; }
            if (filterString.includes('groupid eq')) { filterCount++; reductionFactor *= filterTypeReductions.groupId; }
        }
        return { filterCount, reductionFactor };
    }

    function getBaselineYearlyMetrics() { /* ... same as before, but ensure all relevant metrics are here ... */
        try {
            const cached = sessionStorage.getItem(SESSION_STORAGE_KEY);
            if (cached) {
                const data = JSON.parse(cached);
                if (data.timestamp && (Date.now() - data.timestamp < BASELINE_CACHE_DURATION_MS)) {
                    return data.metrics;
                }
            }
        } catch (e) { console.error(INJECTED_LOG_PREFIX, "Error reading from session storage:", e); }

        const metrics = {
            registeredVisitors: rand(5000, 10000), registeredVisits: 0,
            unregisteredVisitors: rand(100, 500), unregisteredVisits: 0,
            newPosts: rand(200, 500), comments: 0, likes: 0, shares: 0,
            publishedPosts: 0, publishedPostsUnique: 0, interactedPostsUnique: 0
        };
        metrics.registeredVisits = Math.round(metrics.registeredVisitors * randFloat(2.5, 5.0));
        metrics.unregisteredVisits = Math.round(metrics.unregisteredVisitors * randFloat(1.5, 3.0));
        
        const interactionBaseVisitors = metrics.registeredVisitors; // Base interactions on visitors
        metrics.likes = Math.round(interactionBaseVisitors * randFloat(0.15, 0.35)); // Increased likelihood of likes
        metrics.comments = Math.round(interactionBaseVisitors * randFloat(0.03, 0.15)); // Increased comments
        metrics.shares = Math.round(interactionBaseVisitors * randFloat(0.01, 0.08)); // Increased shares

        metrics.publishedPostsUnique = metrics.newPosts;
        metrics.publishedPosts = Math.round(metrics.publishedPostsUnique * randFloat(1.0, 1.2));
        metrics.interactedPostsUnique = Math.round(metrics.publishedPostsUnique * randFloat(0.7, 0.95)); // Most posts get some interaction

        try {
            sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ metrics, timestamp: Date.now() }));
        } catch (e) { console.error(INJECTED_LOG_PREFIX, "Error writing to session storage:", e); }
        return metrics;
    }

    function generateMetricsForPeriodAndFilters(periodUnits, filterReduction) {
        const yearlyBaseline = getBaselineYearlyMetrics();
        // Use hours for scaling if period is less than a day, otherwise days.
        const isShortPeriod = periodUnits.days <= 1;
        const basePeriodUnit = isShortPeriod ? (365 * 24) : 365; // Yearly baseline in hours or days
        const currentPeriodUnit = isShortPeriod ? periodUnits.hours : periodUnits.days;
        
        const scalingFactor = currentPeriodUnit / basePeriodUnit;
        const result = {};

        for (const key in yearlyBaseline) {
            result[key] = Math.round(yearlyBaseline[key] * scalingFactor * filterReduction * randFloat(0.80, 1.20));
            result[key] = Math.max(0, result[key]);
        }

        // Ensure some minimums, especially for interactions on short periods
        const minVisitors = (periodUnits.days <=1 && periodUnits.hours > 0) ? rand(0,3) : rand(1,10);
        result.registeredVisitors = Math.max(result.registeredVisitors, minVisitors);
        result.registeredVisits = Math.max(result.registeredVisits, result.registeredVisitors * rand(1,2));
        
        result.newPosts = Math.max(result.newPosts, (periodUnits.days <=1 && Math.random() < 0.3) ? 1 : 0 ); // Chance of 1 new post for <=1 day
        if (periodUnits.days > 1 && periodUnits.days <= 7) result.newPosts = Math.max(result.newPosts, rand(0,2));


        result.publishedPostsUnique = Math.max(result.publishedPostsUnique, result.newPosts);
        result.publishedPosts = Math.max(result.publishedPosts, result.publishedPostsUnique);

        if (result.registeredVisitors > 0) {
            result.likes = Math.max(result.likes, rand(0, Math.floor(result.registeredVisitors * 0.15) +1));
            result.comments = Math.max(result.comments, rand(0, Math.floor(result.registeredVisitors * 0.05)+1));
            result.shares = Math.max(result.shares, rand(0, Math.floor(result.registeredVisitors * 0.02)+1));
            result.interactedPostsUnique = Math.max(
                result.interactedPostsUnique, 
                (result.likes > 0 || result.comments > 0 || result.shares > 0) ? Math.max(1, result.newPosts > 0 ? 1: 0) : 0
            );
        } else { // If no visitors, no interactions
            result.likes = 0; result.comments = 0; result.shares = 0; result.interactedPostsUnique = 0;
        }
        
        // Logical consistencies
        result.unregisteredVisits = Math.max(result.unregisteredVisits, result.unregisteredVisitors);
        result.interactedPostsUnique = Math.min(result.interactedPostsUnique, result.publishedPostsUnique);
        result.likes = Math.min(result.likes, result.registeredVisitors * 3); // Allow multiple likes from same visitor over time concept
        result.comments = Math.min(result.comments, result.registeredVisitors * 2);
        result.shares = Math.min(result.shares, result.registeredVisitors);


        return result;
    }


    const injectedNewsCustomFetch = async function(...args) {
        // ... (URL parsing and endpoint matching as before) ...
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
            const dateMetrics = calculateDateMetrics(urlParams.since, urlParams.until);
            const { filterCount, reductionFactor } = parseFilters(requestFullUrl);
            const periodMetrics = generateMetricsForPeriodAndFilters(dateMetrics, reductionFactor);

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
                        const groupBy = urlParams.groupBy || 'day'; // day, week, month, hour
                        let numIntervals = 0;
                        
                        if (groupBy === 'hour') numIntervals = dateMetrics.hours;
                        else if (groupBy === 'day') numIntervals = dateMetrics.days;
                        else if (groupBy === 'week') numIntervals = dateMetrics.weeks;
                        else if (groupBy === 'month') numIntervals = dateMetrics.months;
                        else numIntervals = dateMetrics.days; // Default for unknown groupBy

                        numIntervals = Math.max(1, Math.min(numIntervals, 100)); // Cap intervals to prevent huge arrays

                        let currentDate = new Date(dateMetrics.sinceDate);
                        const tempTotals = { ...periodMetrics };

                        for (let i = 0; i < numIntervals; i++) {
                            const dateGroup = {
                                hour: groupBy === 'hour' ? currentDate.getUTCHours() : undefined,
                                day: (groupBy === 'hour' || groupBy === 'day' || groupBy === 'week') ? currentDate.getUTCDate() : 1, // Day 1 for month grouping
                                month: (groupBy !== 'year') ? currentDate.getUTCMonth() + 1 : 1, // Month 1 for year grouping
                                year: currentDate.getUTCFullYear()
                            };
                            // Remove undefined fields from dateGroup
                            Object.keys(dateGroup).forEach(key => dateGroup[key] === undefined && delete dateGroup[key]);


                            let groupData = {};
                            const metricKeys = ['registeredVisitors', 'registeredVisits', 'unregisteredVisitors', 'unregisteredVisits', 'newPosts', 'comments', 'likes', 'shares'];
                            
                            metricKeys.forEach(key => {
                                let share;
                                if (periodMetrics[key] === 0) {
                                    share = 0;
                                } else if (numIntervals === 0) { // Avoid division by zero
                                    share = (i === 0) ? tempTotals[key] : 0;
                                } else {
                                    share = (i === numIntervals - 1) ? tempTotals[key] : Math.round(periodMetrics[key] / numIntervals * randFloat(0.6, 1.4));
                                }
                                groupData[key] = Math.max(0, share);
                                tempTotals[key] = Math.max(0, tempTotals[key] - groupData[key]);
                            });
                            
                            groupData.registeredVisits = Math.max(groupData.registeredVisits, groupData.registeredVisitors);
                            groupData.unregisteredVisits = Math.max(groupData.unregisteredVisits, groupData.unregisteredVisitors);
                            if (groupData.registeredVisitors > 0) { // Ensure interactions only if visitors
                                groupData.likes = Math.min(groupData.likes, groupData.registeredVisitors * 2);
                                groupData.comments = Math.min(groupData.comments, groupData.registeredVisitors);
                                groupData.shares = Math.min(groupData.shares, groupData.registeredVisitors);
                            } else {
                                groupData.likes = 0; groupData.comments = 0; groupData.shares = 0;
                            }


                            modifiedData.timeseries.push({ group: dateGroup, ...groupData });

                            if (groupBy === 'hour') currentDate.setUTCHours(currentDate.getUTCHours() + 1);
                            else if (groupBy === 'day') currentDate.setUTCDate(currentDate.getUTCDate() + 1);
                            else if (groupBy === 'week') currentDate.setUTCDate(currentDate.getUTCDate() + 7);
                            else if (groupBy === 'month') currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
                            
                            if (currentDate > dateMetrics.untilDate && i < numIntervals - 1) break;
                        }
                        break;

                    case 'RANKINGS':
                        modifiedData.entities = (originalJsonData && originalJsonData.entities) ? originalJsonData.entities : { contents: {}, posts: {}, spaces: {} };
                        modifiedData.ranking = [];
                        const existingRankingItems = (originalJsonData && Array.isArray(originalJsonData.ranking)) ? originalJsonData.ranking : [];
                        
                        if (existingRankingItems.length > 0) {
                            const numItemsToProcess = existingRankingItems.length;
                            let remainingMetrics = { ...periodMetrics }; 

                            existingRankingItems.forEach((item, index) => {
                                const itemMetrics = {};
                                const metricKeysForRanking = ['registeredVisitors', 'registeredVisits', 'comments', 'likes', 'shares']; // 'newPosts' might not fit per item here
                                
                                metricKeysForRanking.forEach(key => {
                                    let share;
                                     if (periodMetrics[key] === 0) {
                                        share = 0;
                                    } else if (numItemsToProcess === 0) {
                                        share = 0;
                                    }
                                     else {
                                        share = (index === numItemsToProcess - 1) ? remainingMetrics[key] : Math.round(periodMetrics[key] / numItemsToProcess * randFloat(0.5, 1.5));
                                    }
                                    itemMetrics[key] = Math.max(0, share);
                                    remainingMetrics[key] = Math.max(0, remainingMetrics[key] - itemMetrics[key]);
                                });
                                // Add missing metrics that are usually 0 in ranking but expected in schema
                                itemMetrics.unregisteredVisitors = 0;
                                itemMetrics.unregisteredVisits = 0;
                                itemMetrics.newPosts = item.group.postId && periodMetrics.newPosts > 0 && Math.random() < (1/numItemsToProcess * periodMetrics.newPosts) ? 1 : 0;


                                itemMetrics.registeredVisits = Math.max(itemMetrics.registeredVisits, itemMetrics.registeredVisitors);
                                if (itemMetrics.registeredVisitors > 0) {
                                    itemMetrics.likes = Math.min(itemMetrics.likes, itemMetrics.registeredVisitors * 2);
                                    itemMetrics.comments = Math.min(itemMetrics.comments, itemMetrics.registeredVisitors);
                                    itemMetrics.shares = Math.min(itemMetrics.shares, itemMetrics.registeredVisitors);
                                } else {
                                   itemMetrics.likes = 0; itemMetrics.comments = 0; itemMetrics.shares = 0;
                                }


                                modifiedData.ranking.push({
                                    group: item.group, 
                                    ...itemMetrics
                                });
                            });
                        } 
                        // If originalJsonData.ranking is empty, modifiedData.ranking remains []
                        break;
                }
                
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