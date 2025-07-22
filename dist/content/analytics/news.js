// content/analytics/news.js
(function () {

    const INJECTED_LOG_PREFIX = '[Replify InjectedNewsPatch]:';

    if (window.__REPLIFY_NEWS_FETCH_APPLIED__) {
        return;
    }

    const pageContextOriginalFetch = window.fetch;
    if (!pageContextOriginalFetch) {
        console.error(INJECTED_LOG_PREFIX, 'CRITICAL: window.fetch is null/undefined in page context!');
        return;
    }

    let comparisonTimeseriesData = null;
    const COMPARISON_CACHE_DURATION_MS = 10 * 1000;

    const SESSION_STORAGE_KEY = 'replifyNewsAnalyticsBaseline';
    const BASELINE_CACHE_DURATION_MS = 60 * 60 * 1000;

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
        
        if (isNaN(since.getTime()) || isNaN(until.getTime()) || until < since) {
            const defaultUntil = new Date();
            const defaultSince = new Date(defaultUntil.getTime() - 1 * 24 * 60 * 60 * 1000);
            since = defaultSince;
            until = defaultUntil;
        }

        const millisPerHour = 1000 * 60 * 60;
        const millisPerDay = millisPerHour * 24;
        const durationMillis = Math.max(millisPerHour, until - since);

        const hours = Math.max(1, Math.ceil(durationMillis / millisPerHour));
        const days = Math.max(1, Math.ceil(durationMillis / millisPerDay));
        const weeks = Math.max(1, Math.ceil(days / 7));
        const months = Math.max(1, Math.ceil(days / 30.44));
        
        return { hours, days, weeks, months, sinceDate: since, untilDate: until, error: false };
    }


    function parseFilters(urlString) {
        const params = getUrlParams(urlString);
        let reductionFactor = 1.0;
        const filterTypeReductions = { platform: 0.5, spaceId: 0.3, channelId: 0.4, groupId: 0.2 };
        if (params.filter) {
            const filterString = decodeURIComponent(params.filter).toLowerCase();
            if (filterString.includes('platform eq')) { reductionFactor *= filterTypeReductions.platform; }
            if (filterString.includes('spaceid eq')) { reductionFactor *= filterTypeReductions.spaceId; }
            if (filterString.includes('channelid eq')) { reductionFactor *= filterTypeReductions.channelId; }
            if (filterString.includes('groupid eq')) { reductionFactor *= filterTypeReductions.groupId; }
        }
        return { reductionFactor };
    }
    
    function getBaselineYearlyMetrics() {
        try {
            const cached = sessionStorage.getItem(SESSION_STORAGE_KEY);
            if (cached) {
                const data = JSON.parse(cached);
                if (data.timestamp && (Date.now() - data.timestamp < BASELINE_CACHE_DURATION_MS)) {
                    return data.metrics;
                }
            }
        } catch (e) { console.error(INJECTED_LOG_PREFIX, "Error reading from session storage:", e); }

        // Increased base visitor counts by another 3x.
        const metrics = {
            registeredVisitors: rand(75000, 120000), 
            registeredVisits: 0,
            unregisteredVisitors: rand(1500, 3000), 
            unregisteredVisits: 0,
            newPosts: rand(300, 600), 
            comments: 0, 
            likes: 0, 
            shares: 0,
            publishedPosts: 0, 
            publishedPostsUnique: 0, 
            interactedPostsUnique: 0
        };

        metrics.registeredVisits = Math.round(metrics.registeredVisitors * randFloat(3.0, 5.5));
        metrics.unregisteredVisits = Math.round(metrics.unregisteredVisitors * randFloat(1.5, 3.0));
        
        const interactionBaseVisits = metrics.registeredVisits;
        metrics.likes = Math.round(interactionBaseVisits * randFloat(0.28, 0.35));
        metrics.comments = Math.round(interactionBaseVisits * randFloat(0.03, 0.04));
        metrics.shares = Math.round(interactionBaseVisits * randFloat(0.004, 0.009));

        metrics.publishedPostsUnique = metrics.newPosts;
        metrics.publishedPosts = Math.round(metrics.publishedPostsUnique * randFloat(1.0, 1.2));
        metrics.interactedPostsUnique = Math.round(metrics.publishedPostsUnique * randFloat(0.7, 0.95));

        try {
            sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ metrics, timestamp: Date.now() }));
        } catch (e) { console.error(INJECTED_LOG_PREFIX, "Error writing to session storage:", e); }
        return metrics;
    }
    
    function generateLowerComparisonMetrics(currentPeriodMetrics) {
        const result = {};
        const reductionMin = 0.65;
        const reductionMax = 0.85;

        for (const key in currentPeriodMetrics) {
            const baseValue = currentPeriodMetrics[key];
            if (typeof baseValue === 'number') {
                result[key] = Math.floor(baseValue * randFloat(reductionMin, reductionMax));
            } else {
                result[key] = baseValue;
            }
        }
        
        result.registeredVisits = Math.max(result.registeredVisits, result.registeredVisitors);
        result.unregisteredVisits = Math.max(result.unregisteredVisits, result.unregisteredVisitors);
        result.interactedPostsUnique = Math.min(result.interactedPostsUnique, result.publishedPostsUnique);
        
        if (result.registeredVisitors === 0) {
            result.likes = 0; result.comments = 0; result.shares = 0; result.interactedPostsUnique = 0;
        }

        return result;
    }
    
    function generateMetricsForPeriodAndFilters(periodUnits, filterReduction) {
        const yearlyBaseline = getBaselineYearlyMetrics();
        const isShortPeriod = periodUnits.days <= 1;
        const basePeriodUnit = isShortPeriod ? (365 * 24) : 365;
        const currentPeriodUnit = isShortPeriod ? periodUnits.hours : periodUnits.days;
        
        const scalingFactor = currentPeriodUnit / basePeriodUnit;
        const result = {};

        for (const key in yearlyBaseline) {
            result[key] = Math.round(yearlyBaseline[key] * scalingFactor * filterReduction * randFloat(0.85, 1.15));
            result[key] = Math.max(0, result[key]);
        }
        
        result.registeredVisits = Math.max(result.registeredVisits, result.registeredVisitors);
        result.newPosts = Math.max(result.newPosts, (periodUnits.days <= 7 && Math.random() < 0.3) ? rand(0, 2) : 0 );
        result.publishedPostsUnique = Math.max(result.publishedPostsUnique, result.newPosts);
        result.publishedPosts = Math.round(result.publishedPosts * randFloat(1.0, 1.1));
        result.interactedPostsUnique = Math.min(result.interactedPostsUnique, result.publishedPostsUnique);

        if (periodUnits.hours > 6) {
             result.registeredVisitors = Math.max(result.registeredVisitors, 1);
        }

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
            const dateMetrics = calculateDateMetrics(urlParams.since, urlParams.until);
            const { reductionFactor } = parseFilters(requestFullUrl);
            let periodMetrics;

            if (matchedEndpointKey === 'TIMESERIES') {
                if (comparisonTimeseriesData && (Date.now() - comparisonTimeseriesData.timestamp < COMPARISON_CACHE_DURATION_MS)) {
                    periodMetrics = generateLowerComparisonMetrics(comparisonTimeseriesData.metrics);
                    comparisonTimeseriesData = null;
                } else {
                    periodMetrics = generateMetricsForPeriodAndFilters(dateMetrics, reductionFactor);
                    comparisonTimeseriesData = { metrics: periodMetrics, timestamp: Date.now() };
                }
            } else {
                periodMetrics = generateMetricsForPeriodAndFilters(dateMetrics, reductionFactor);
            }

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
                        
                        if (groupBy === 'hour') numIntervals = dateMetrics.hours;
                        else if (groupBy === 'day') numIntervals = dateMetrics.days;
                        else if (groupBy === 'week') numIntervals = dateMetrics.weeks;
                        else if (groupBy === 'month') numIntervals = dateMetrics.months;
                        else numIntervals = dateMetrics.days;

                        numIntervals = Math.max(1, Math.min(numIntervals, 100));
                        let currentDate = new Date(dateMetrics.sinceDate);
                        const tempTotals = { ...periodMetrics };

                        for (let i = 0; i < numIntervals; i++) {
                             const dateGroup = {
                                hour: groupBy === 'hour' ? currentDate.getUTCHours() : undefined,
                                day: (groupBy === 'hour' || groupBy === 'day' || groupBy === 'week') ? currentDate.getUTCDate() : 1,
                                month: (groupBy !== 'year') ? currentDate.getUTCMonth() + 1 : 1,
                                year: currentDate.getUTCFullYear()
                            };
                            Object.keys(dateGroup).forEach(key => dateGroup[key] === undefined && delete dateGroup[key]);

                            let groupData = {};
                            const metricKeys = ['registeredVisitors', 'registeredVisits', 'unregisteredVisitors', 'unregisteredVisits', 'newPosts', 'comments', 'likes', 'shares'];
                            
                            metricKeys.forEach(key => {
                                let share = (i === numIntervals - 1) ? tempTotals[key] : Math.round(periodMetrics[key] / numIntervals * randFloat(0.6, 1.4));
                                groupData[key] = Math.max(0, share);
                                tempTotals[key] = Math.max(0, tempTotals[key] - groupData[key]);
                            });
                            
                            groupData.registeredVisits = Math.max(groupData.registeredVisits, groupData.registeredVisitors);
                            
                            if (groupData.registeredVisitors > 0) {
                                groupData.likes = Math.max(groupData.likes, 1);
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
                        modifiedData.entities = originalJsonData.entities || { contents: {}, posts: {}, spaces: {} };
                        modifiedData.ranking = [];
                        const existingRankingItems = originalJsonData.ranking || [];
                        
                        if (existingRankingItems.length > 0) {
                            let remainingMetrics = { ...periodMetrics }; 
                            existingRankingItems.forEach((item, index) => {
                                const itemMetrics = {};
                                const metricKeysForRanking = ['registeredVisitors', 'registeredVisits', 'comments', 'likes', 'shares'];
                                
                                metricKeysForRanking.forEach(key => {
                                    let share = (index === existingRankingItems.length - 1) ? remainingMetrics[key] : Math.round(periodMetrics[key] / existingRankingItems.length * randFloat(0.5, 1.5));
                                    itemMetrics[key] = Math.max(0, share);
                                    remainingMetrics[key] = Math.max(0, remainingMetrics[key] - itemMetrics[key]);
                                });
                                
                                itemMetrics.registeredVisits = Math.max(itemMetrics.registeredVisits, itemMetrics.registeredVisitors);
                                modifiedData.ranking.push({ group: item.group, ...itemMetrics });
                            });
                        }
                        break;
                }
                
                return new Response(JSON.stringify(modifiedData), {
                    status: 200, statusText: "OK", headers: {'Content-Type': 'application/json'}
                });

            } catch (err) {
                console.error(INJECTED_LOG_PREFIX + ` Error during data generation for ${requestFullUrl}:`, err);
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

    window.__REPLIFY_REVERT_NEWS_FETCH__ = function() {
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