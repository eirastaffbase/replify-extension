// content/analytics/pages.js
(function () {

    const INJECTED_LOG_PREFIX = '[Replify InjectedPagesPatch]:';

    // Prevents the script from being injected and run multiple times
    if (window.__REPLIFY_PAGES_FETCH_APPLIED__) {
        return;
    }

    const pageContextOriginalFetch = window.fetch;
    if (!pageContextOriginalFetch) {
        console.error(INJECTED_LOG_PREFIX, 'CRITICAL: window.fetch is not available!');
        return;
    }

    // This object holds metrics from the first API call in a comparison pair.
    let comparisonMetricsData = null;
    const COMPARISON_CACHE_DURATION_MS = 10 * 1000; // 10-second window to catch a comparison call

    const SESSION_STORAGE_KEY = 'replifyPagesAnalyticsBaseline';
    const BASELINE_CACHE_DURATION_MS = 60 * 60 * 1000; // 1-hour cache for baseline metrics

    // --- Utility Functions ---
    const rand = (min, max) => {
        min = Math.ceil(min); max = Math.floor(max);
        if (min > max) [min, max] = [max, min];
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };
    const randFloat = (min, max, decimals = 2) => parseFloat((Math.random() * (max - min) + min).toFixed(decimals));

    // --- Target API Endpoints ---
    const TARGET_PAGES_API_URLS = {
        STATS: '/api/branch/analytics/pages/stats',
        TIMESERIES: '/api/branch/analytics/pages/timeseries',
        RANKING: '/api/branch/analytics/pages/ranking',
    };

    function getUrlParams(urlString) {
        const params = {};
        try {
            const url = new URL(urlString, window.location.origin);
            url.searchParams.forEach((value, key) => { params[key] = value; });
        } catch (e) { /* Silently ignore errors */ }
        return params;
    }

    /**
     * NEW: Checks for Space or Group filters in the URL to reduce metric counts.
     */
    function parseFilters(urlString) {
        const params = getUrlParams(urlString);
        let reductionFactor = 1.0;
        // Define how much each filter type reduces the total numbers
        const filterTypeReductions = {
            spaceId: 0.45, // Filtering by a Space has a significant impact
            groupId: 0.35  // Filtering by a User Group has an even bigger impact
        };

        if (params.filter) {
            const filterString = decodeURIComponent(params.filter).toLowerCase();
            if (filterString.includes('spaceid eq')) {
                reductionFactor *= filterTypeReductions.spaceId;
            }
            if (filterString.includes('groupid eq')) {
                reductionFactor *= filterTypeReductions.groupId;
            }
        }
        return { reductionFactor };
    }

    function calculateDateMetrics(sinceStr, untilStr) {
        const since = new Date(decodeURIComponent(sinceStr));
        const until = new Date(decodeURIComponent(untilStr));

        if (isNaN(since.getTime()) || isNaN(until.getTime()) || until < since) {
            return { days: 1, sinceDate: new Date(Date.now() - 86400000), untilDate: new Date() };
        }
        
        const durationMillis = Math.max(1, until - since);
        const days = Math.ceil(durationMillis / (1000 * 60 * 60 * 24));
        
        return { days, sinceDate: since, untilDate: until };
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

        const metrics = {
            totalVisitors: rand(8000, 15000),
            totalViews: 0,
            sessions: 0,
            clicks: 0,
        };
        metrics.totalViews = Math.round(metrics.totalVisitors * randFloat(8.5, 15.0));
        metrics.sessions = Math.round(metrics.totalViews * randFloat(0.7, 0.9));
        metrics.clicks = Math.round(metrics.totalViews * randFloat(0.1, 0.25));

        try {
            sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ metrics, timestamp: Date.now() }));
        } catch (e) { console.error(INJECTED_LOG_PREFIX, "Error writing to session storage:", e); }
        return metrics;
    }
    
    function generateLowerComparisonMetrics(currentPeriodMetrics) {
        const result = {};
        const reductionFactor = randFloat(0.60, 0.85);

        for (const key in currentPeriodMetrics) {
            if (typeof currentPeriodMetrics[key] === 'number') {
                result[key] = Math.floor(currentPeriodMetrics[key] * reductionFactor);
            }
        }
        
        if (result.totalViews < result.sessions) result.sessions = Math.floor(result.totalViews * randFloat(0.8, 0.95));
        if (result.sessions < result.totalVisitors) result.totalVisitors = Math.floor(result.sessions * randFloat(0.9, 1.0));
        
        return result;
    }

    /**
     * UPDATED: Now accepts a filterReduction factor to scale metrics down.
     */
    function generateMetricsForPeriod(dateMetrics, filterReduction) {
        const yearlyBaseline = getBaselineYearlyMetrics();
        const scalingFactor = dateMetrics.days / 365;
        const result = {};

        for (const key in yearlyBaseline) {
            // Apply the filter reduction factor during metric generation
            result[key] = Math.round(yearlyBaseline[key] * scalingFactor * filterReduction * randFloat(0.85, 1.15));
        }

        result.totalVisitors = Math.max(result.totalVisitors, 1);
        result.totalViews = Math.max(result.totalViews, result.totalVisitors);
        result.sessions = Math.max(result.sessions, result.totalVisitors);
        
        return result;
    }


    const injectedPagesCustomFetch = async function(...args) {
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

        const matchedEndpointKey = Object.keys(TARGET_PAGES_API_URLS).find(key => urlPath === TARGET_PAGES_API_URLS[key]);

        if (matchedEndpointKey) {
            const urlParams = getUrlParams(requestFullUrl);
            const dateMetrics = calculateDateMetrics(urlParams.since, urlParams.until);
            // Get the reduction factor from any applied filters
            const { reductionFactor } = parseFilters(requestFullUrl);
            let periodMetrics;

            if (comparisonMetricsData && (Date.now() - comparisonMetricsData.timestamp < COMPARISON_CACHE_DURATION_MS)) {
                periodMetrics = generateLowerComparisonMetrics(comparisonMetricsData.metrics);
                comparisonMetricsData = null; 
            } else {
                // Pass the reduction factor to the metric generator
                periodMetrics = generateMetricsForPeriod(dateMetrics, reductionFactor);
                comparisonMetricsData = { metrics: periodMetrics, timestamp: Date.now() };
            }

            try {
                const response = await pageContextOriginalFetch.apply(this, args);
                let originalJsonData = {};
                if (response.ok && response.headers.get("content-type")?.includes("application/json")) {
                    originalJsonData = await response.clone().json();
                }

                let modifiedData;

                switch (matchedEndpointKey) {
                    case 'STATS':
                        const totalPages = (originalJsonData.pageWithViews || 0) + (originalJsonData.pageWithNoViews || 0) || 78;
                        const pageWithViews = Math.min(totalPages, Math.max(rand(5, 10), Math.floor(periodMetrics.totalVisitors / 2)));
                        modifiedData = {
                            totalViews: periodMetrics.totalViews,
                            totalVisitors: periodMetrics.totalVisitors,
                            pageWithViews: pageWithViews,
                            pageWithNoViews: Math.max(0, totalPages - pageWithViews)
                        };
                        break;

                    case 'TIMESERIES':
                        modifiedData = { data: [] };
                        let runningViews = periodMetrics.totalViews;
                        let runningVisitors = periodMetrics.totalVisitors;
                        for (let i = 0; i < dateMetrics.days; i++) {
                            const dayDate = new Date(dateMetrics.sinceDate);
                            dayDate.setDate(dayDate.getDate() + i);
                            if (dayDate > dateMetrics.untilDate) break;

                            // UPDATED: Use different random shares for views and visitors to vary the curves
                            const isLastDay = i === dateMetrics.days - 1;
                            
                            // 1. Calculate daily views
                            const viewShare = isLastDay ? 1 : randFloat(0.1, 1.9) / dateMetrics.days;
                            const views = Math.min(runningViews, Math.round(periodMetrics.totalViews * viewShare));
                            
                            // 2. Calculate daily visitors with a *different* random pattern
                            const visitorShare = isLastDay ? 1 : randFloat(0.1, 1.9) / dateMetrics.days;
                            let visitors = Math.min(runningVisitors, Math.round(periodMetrics.totalVisitors * visitorShare));
                            
                            // 3. Ensure visitors are always less than or equal to views for that day
                            visitors = Math.min(views, visitors);

                            modifiedData.data.push({
                                date: dayDate.toISOString().split('T')[0] + "T00:00:00-04:00",
                                views: views,
                                visitors: visitors
                            });
                            runningViews -= views;
                            runningVisitors -= visitors;
                        }
                        break;

                    case 'RANKING':
                        modifiedData = { data: [] };
                        const allPages = originalJsonData.data || [];
                        let remainingViews = periodMetrics.totalViews;
                        let remainingViewers = periodMetrics.totalVisitors;
                        let remainingSessions = periodMetrics.sessions;
                        let remainingClicks = periodMetrics.clicks;

                        const pagesWithTraffic = allPages.slice(0, Math.min(allPages.length, rand(5,10)));
                        const otherPages = allPages.slice(pagesWithTraffic.length);

                        pagesWithTraffic.forEach((page, index) => {
                            const isLast = index === pagesWithTraffic.length - 1;
                            const share = isLast ? 1 : randFloat(0.3, 0.7) * (1 / (pagesWithTraffic.length - index));

                            const views = isLast ? remainingViews : Math.round(remainingViews * share);
                            const viewers = isLast ? remainingViewers : Math.round(remainingViewers * share);
                            const sessions = isLast ? remainingSessions : Math.round(remainingSessions * share);
                            const clicks = isLast ? remainingClicks : Math.round(remainingClicks * share);

                            modifiedData.data.push({
                                ...page,
                                views: views,
                                viewers: Math.min(views, viewers),
                                sessions: Math.min(views, sessions),
                                clicks: Math.min(views, clicks),
                                secondsSpent: views > 0 ? rand(5, 90) : 0,
                                bounceRate: viewers > 0 ? randFloat(10, 70) : 0,
                                shortSessions: Math.floor(sessions * randFloat(0.4, 0.8))
                            });

                            remainingViews = Math.max(0, remainingViews - views);
                            remainingViewers = Math.max(0, remainingViewers - viewers);
                            remainingSessions = Math.max(0, remainingSessions - sessions);
                            remainingClicks = Math.max(0, remainingClicks - clicks);
                        });
                        
                        otherPages.forEach(page => {
                           modifiedData.data.push({ ...page, views: 0, viewers: 0, sessions: 0, secondsSpent: 0, shortSessions: 0, clicks: 0, bounceRate: 0 });
                        });

                        break;
                }
                
                return new Response(JSON.stringify(modifiedData), {
                    status: 200, statusText: "OK", headers: {'Content-Type': 'application/json'}
                });

            } catch (err) {
                console.error(INJECTED_LOG_PREFIX + ` Error during data generation for ${requestFullUrl}:`, err);
                const emptyResponses = {
                    STATS: { totalViews: 0, totalVisitors: 0, pageWithViews: 0, pageWithNoViews: 0 },
                    TIMESERIES: { data: [] },
                    RANKING: { data: [] }
                };
                return new Response(JSON.stringify(emptyResponses[matchedEndpointKey] || {}), { status: 200, headers: { 'Content-Type': 'application/json' }});
            }
        }
        
        return pageContextOriginalFetch.apply(this, args);
    };

    window.fetch = injectedPagesCustomFetch;
    window.__REPLIFY_PAGES_FETCH_APPLIED__ = true;

    window.__REPLIFY_REVERT_PAGES_FETCH__ = function() {
        if (window.fetch === injectedPagesCustomFetch) {
            window.fetch = pageContextOriginalFetch;
            delete window.__REPLIFY_PAGES_FETCH_APPLIED__;
            delete window.__REPLIFY_REVERT_PAGES_FETCH__;
            return true;
        }
        return false;
    };
})();