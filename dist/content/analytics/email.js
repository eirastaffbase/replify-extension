// content/analytics/email.js
(function () {
    'use strict';

    const INJECTED_LOG_PREFIX = '[Replify InjectedEmailPatch]:';
    // console.log(INJECTED_LOG_PREFIX, 'Injected script (email.js) executed.');

    if (window.__REPLIFY_EMAIL_FETCH_APPLIED__) {
        // console.warn(INJECTED_LOG_PREFIX, 'Email fetch override already applied. Aborting.');
        return;
    }

    const pageContextOriginalFetch = window.fetch;
    if (!pageContextOriginalFetch) {
        console.error(INJECTED_LOG_PREFIX, 'CRITICAL: window.fetch is null/undefined in page context!');
        return;
    }
    // console.log(INJECTED_LOG_PREFIX, 'pageContextOriginalFetch captured by email injected script.');

    const rand = (min, max) => {
        min = Math.ceil(min);
        max = Math.floor(max);
        if (min > max) [min, max] = [max, min];
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };
    const randFloat = (min, max, decimals = 2) => parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
    
    function generateRandomDate(startDate, endDate) {
        return new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
    }

    // --- Patterns for Main Email Analytics Page ---
    const TARGET_EMAIL_API_URLS = {
        AGGREGATED_STATS: '/api/email-analytics/aggregated-stats',
        TIMESERIES: '/api/email-analytics/timeseries',
        OVERVIEW: '/api/email-analytics/overview'
    };

    // --- Pattern for Individual Email Performance Page ---
    // Matches /api/email-performance/{id}/{endpoint}
    const INDIVIDUAL_EMAIL_API_PATTERN = /^\/api\/email-performance\/([a-zA-Z0-9]+)\/(\w+)/;


    function getUrlParams(urlString) {
        const params = {};
        try {
            const url = new URL(urlString, window.location.origin);
            url.searchParams.forEach((value, key) => {
                params[key] = value;
            });
        } catch (e) { /* console.warn(INJECTED_LOG_PREFIX, "Could not parse URL for params:", urlString, e); */ }
        return params;
    }

    function calculateDateMetrics(sinceStr, untilStr) {
        const since = new Date(decodeURIComponent(sinceStr));
        const until = new Date(decodeURIComponent(untilStr));
        if (isNaN(since.getTime()) || isNaN(until.getTime()) || since > until) {
            const defaultUntil = new Date();
            const defaultSince = new Date(defaultUntil.getTime() - 30 * 24 * 60 * 60 * 1000);
            return { days: 30, weeks: 4, months: 1, error: true, sinceDate: defaultSince, untilDate: defaultUntil };
        }
        const dayMillis = 1000 * 60 * 60 * 24;
        const days = Math.max(1, Math.ceil((until - since) / dayMillis));
        const weeks = Math.max(1, Math.ceil(days / 7));
        const months = Math.max(1, Math.ceil(days / 30.44));
        return { days, weeks, months, sinceDate: since, untilDate: until, error: false };
    }

    // --- Main Fetch Interceptor ---
    const injectedEmailCustomFetch = async function(...args) {
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
            } else {
                return pageContextOriginalFetch.apply(this, args);
            }
        }
        
        // --- CHECK 1: Main Analytics Page ---
        let matchedEndpointKey = null;
        if (urlPath === TARGET_EMAIL_API_URLS.AGGREGATED_STATS) matchedEndpointKey = 'AGGREGATED_STATS';
        else if (urlPath === TARGET_EMAIL_API_URLS.TIMESERIES) matchedEndpointKey = 'TIMESERIES';
        else if (urlPath === TARGET_EMAIL_API_URLS.OVERVIEW) matchedEndpointKey = 'OVERVIEW';

        if (matchedEndpointKey) {
            // console.log(INJECTED_LOG_PREFIX + ` Intercepting MAIN PAGE ${matchedEndpointKey}: ${requestFullUrl}`);
            // This re-uses your existing logic for the main pages, which is left unchanged.
            // The full, unchanged logic for these cases is at the end of this file for completeness.
            return generateMainAnalyticsData(matchedEndpointKey, urlParams, args);
        }

        // --- CHECK 2: Individual Email Performance Page ---
        const individualMatch = urlPath.match(INDIVIDUAL_EMAIL_API_PATTERN);
        if (individualMatch) {
            const [, emailId, endpointName] = individualMatch;
            // console.log(INJECTED_LOG_PREFIX + ` Intercepting INDIVIDUAL EMAIL (${emailId}) -> ${endpointName}: ${requestFullUrl}`);
            
            // Generate a consistent set of stats for this specific emailId for this page view
            const baseStats = generateBaseStatsForEmail();

            let modifiedData = {};

            switch (endpointName) {
                case 'recipient-count':
                    modifiedData = {
                        totalRecipients: baseStats.totalRecipients,
                        targetAudience: baseStats.totalRecipients // Assume they are the same
                    };
                    break;
                
                case 'opens':
                     modifiedData = {
                        totalOpens: baseStats.totalOpens,
                        uniqueOpens: baseStats.uniqueOpens,
                        percentage: baseStats.openRate
                    };
                    break;

                case 'clicks':
                    modifiedData = {
                        totalClicks: baseStats.totalClicks,
                        uniqueClicks: baseStats.uniqueClicks,
                        percentage: baseStats.clickRate,
                        lastClickRecorded: generateRandomDate(new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), new Date()).toISOString()
                    };
                    break;

                case 'links':
                case 'top-clicked-links':
                    const linksData = { links: [] };
                    let remainingClicks = baseStats.totalClicks;
                    baseStats.links.forEach((link, index) => {
                        // Distribute clicks among links
                        const clicksForThisLink = (index === baseStats.links.length - 1) ? remainingClicks : Math.floor(remainingClicks * randFloat(0.2, 0.6));
                        remainingClicks -= clicksForThisLink;
                        linksData.links.push({
                            index: index,
                            name: link.name,
                            percentage: baseStats.totalRecipients > 0 ? Math.min(1, clicksForThisLink / baseStats.totalRecipients) : 0,
                            totalClicks: clicksForThisLink,
                            target: link.target,
                            locale: "en_US"
                        });
                    });
                     // Simple sort for top-clicked-links, assuming 'links' might not be sorted
                    linksData.links.sort((a,b) => b.totalClicks - a.totalClicks);
                    modifiedData = linksData;
                    break;
                
                case 'engagement-trend':
                    modifiedData = {
                        totalRecipients: baseStats.totalRecipients,
                        opens: { total: baseStats.uniqueOpens, previous: baseStats.uniqueOpens, dropOff: 0, percentage: baseStats.openRate },
                        clicks: { total: baseStats.uniqueClicks, previous: baseStats.uniqueClicks, dropOff: 0, percentage: baseStats.clickRate }
                    };
                    break;

                case 'total-activity-over-time':
                case 'unique-activity-over-time':
                     const { sinceDate, untilDate } = calculateDateMetrics(urlParams.since, urlParams.until);
                     const timeseries = { timeseries: [] };
                     let tempDate = new Date(sinceDate);
                     // Generate 24 hourly intervals for a day
                     for(let i=0; i<24; i++){
                         timeseries.timeseries.push({
                            opens: rand(0, 5), // Sporadic activity per hour
                            clicks: rand(0, 2),
                            interval: { hour: tempDate.getHours(), day: tempDate.getDate(), week:0, month: tempDate.getMonth()+1, year: tempDate.getFullYear()}
                         });
                         tempDate.setHours(tempDate.getHours() + 1);
                     }
                     // For unique, let's just show the final totals in the first few slots for effect
                     if(endpointName === 'unique-activity-over-time') {
                        timeseries.timeseries[0].opens = baseStats.uniqueOpens;
                        timeseries.timeseries[0].clicks = baseStats.uniqueClicks;
                     }
                     modifiedData = timeseries;
                     break;

                default:
                    console.warn(INJECTED_LOG_PREFIX, `Unhandled individual email endpoint: ${endpointName}`);
                    return pageContextOriginalFetch.apply(this, args); // Passthrough if unknown
            }
            
            return new Response(JSON.stringify(modifiedData), {
                status: 200, statusText: "OK", headers: {'Content-Type': 'application/json'}
            });
        }


        // If no patterns matched, proceed with the original fetch call
        return pageContextOriginalFetch.apply(this, args);
    };
    
    // Helper to generate a consistent set of stats for an individual email
    function generateBaseStatsForEmail() {
        const totalRecipients = rand(250, 1500);
        const uniqueOpens = Math.floor(totalRecipients * randFloat(0.40, 0.95));
        const uniqueClicks = Math.floor(uniqueOpens * randFloat(0.15, 0.40));
        
        const totalOpens = Math.floor(uniqueOpens * randFloat(1.1, 1.8));
        const totalClicks = Math.floor(uniqueClicks * randFloat(1.2, 2.5));
        
        const openRate = totalRecipients > 0 ? uniqueOpens / totalRecipients : 0;
        const clickRate = totalRecipients > 0 ? uniqueClicks / totalRecipients : 0;

        const links = [
            { name: "Explore the Connect App", target: "https://connect.staffbase.com/content/page/5f47682d7571b314481814bd" },
            { name: "Company All-Hands Recording", target: "https://www.staffbase.com" },
            { name: "IT Support Portal", target: "https://www.staffbase.com" },
            { name: "Sign up for Benefits", target: "https://www.staffbase.com" },
        ];

        return { totalRecipients, uniqueOpens, totalOpens, uniqueClicks, totalClicks, openRate, clickRate, links };
    }


    // This is your original, unmodified logic for the main analytics pages.
    // It's moved into its own function for clarity.
    async function generateMainAnalyticsData(matchedEndpointKey, urlParams, args) {
         try {
            const { days, weeks, months, sinceDate, untilDate } = calculateDateMetrics(urlParams.since, urlParams.until);
            const dailyRate = {
                uniqueSentEmails: randFloat(0.1, 0.5),
                avgRecipientsPerCampaign: rand(20, 150),
                openRate: randFloat(0.20, 0.50),
                clickToOpenRate: randFloat(0.05, 0.20),
                opensPerUniqueOpen: randFloat(1.1, 1.8),
                clicksPerUniqueClick: randFloat(1.1, 2.2)
            };
            
            const response = await pageContextOriginalFetch.apply(this, args);
            let originalJsonData = {};
            if (response.ok && response.headers.get("content-type")?.includes("application/json")) {
                originalJsonData = await response.clone().json();
            }

            let modifiedData = {};
            switch (matchedEndpointKey) {
                case 'AGGREGATED_STATS':
                    // Logic from previous response, generates fresh aggregated stats
                    let genUniqueSentEmails = Math.max(1, Math.round(dailyRate.uniqueSentEmails * days * randFloat(0.7, 1.3)));
                    let genRecipients = Math.max(genUniqueSentEmails, Math.round(genUniqueSentEmails * dailyRate.avgRecipientsPerCampaign * randFloat(0.7, 1.3)));
                    let genSentEmails = Math.max(genRecipients, Math.round(genRecipients * randFloat(1.0, 1.1))); 
                    let genUniqueOpens = Math.round(genRecipients * dailyRate.openRate * randFloat(0.8, 1.2));
                    genUniqueOpens = Math.min(genRecipients, Math.max(0, genUniqueOpens));
                    let genUniqueClicks = Math.round(genUniqueOpens * dailyRate.clickToOpenRate * randFloat(0.8, 1.2));
                    genUniqueClicks = Math.min(genUniqueOpens, Math.max(0, genUniqueClicks));
                    let genTotalOpens = Math.round(genUniqueOpens * dailyRate.opensPerUniqueOpen * randFloat(0.9, 1.1));
                    genTotalOpens = Math.max(genUniqueOpens, genTotalOpens);
                    let genTotalClicks = Math.round(genUniqueClicks * dailyRate.clicksPerUniqueClick * randFloat(0.9, 1.1));
                    genTotalClicks = Math.max(genUniqueClicks, genTotalClicks);
                    
                    if (days <= 7) { // Ensure some minimal data for very short periods
                        genUniqueSentEmails = Math.max(genUniqueSentEmails, rand(1,2));
                        genRecipients = Math.max(genRecipients, genUniqueSentEmails * rand(10,50));
                        genSentEmails = Math.max(genSentEmails, genRecipients);
                        genUniqueOpens = Math.max(genUniqueOpens, Math.floor(genRecipients * randFloat(0.15, 0.35)));
                        genUniqueOpens = Math.min(genUniqueOpens, genRecipients);
                        genUniqueClicks = Math.max(genUniqueClicks, Math.floor(genUniqueOpens * randFloat(0.08, 0.22)));
                        genUniqueClicks = Math.min(genUniqueClicks, genUniqueOpens);
                        genTotalOpens = Math.max(genTotalOpens, genUniqueOpens);
                        genTotalClicks = Math.max(genTotalClicks, genUniqueClicks);
                    }
                    modifiedData = {
                        uniqueSentEmails: genUniqueSentEmails, sentEmails: genSentEmails, recipients: genRecipients,
                        uniqueOpens: genUniqueOpens, uniqueClicks: genUniqueClicks, totalOpens: genTotalOpens, totalClicks: genTotalClicks
                    };
                    break;

                case 'TIMESERIES':
                    // Logic from previous response, generates fresh timeseries
                        modifiedData.timeseries = [];
                        const aggStatsForTimeSeries = {uniqueSentEmails:0, sentEmails:0, recipients:0, uniqueOpens:0, uniqueClicks:0, totalOpens:0, totalClicks:0};
                        aggStatsForTimeSeries.uniqueSentEmails = Math.max(1, Math.round(dailyRate.uniqueSentEmails * days * randFloat(0.7, 1.3)));
                        aggStatsForTimeSeries.recipients = Math.max(aggStatsForTimeSeries.uniqueSentEmails, Math.round(aggStatsForTimeSeries.uniqueSentEmails * dailyRate.avgRecipientsPerCampaign * randFloat(0.7, 1.3)));
                        aggStatsForTimeSeries.sentEmails = Math.max(aggStatsForTimeSeries.recipients, Math.round(aggStatsForTimeSeries.recipients * randFloat(1.0, 1.1)));
                        aggStatsForTimeSeries.uniqueOpens = Math.min(aggStatsForTimeSeries.recipients, Math.max(0,Math.round(aggStatsForTimeSeries.recipients * dailyRate.openRate * randFloat(0.8, 1.2))));
                        aggStatsForTimeSeries.uniqueClicks = Math.min(aggStatsForTimeSeries.uniqueOpens, Math.max(0,Math.round(aggStatsForTimeSeries.uniqueOpens * dailyRate.clickToOpenRate * randFloat(0.8, 1.2))));
                        aggStatsForTimeSeries.totalOpens = Math.max(aggStatsForTimeSeries.uniqueOpens, Math.round(aggStatsForTimeSeries.uniqueOpens * dailyRate.opensPerUniqueOpen * randFloat(0.9, 1.1)));
                        aggStatsForTimeSeries.totalClicks = Math.max(aggStatsForTimeSeries.uniqueClicks, Math.round(aggStatsForTimeSeries.uniqueClicks * dailyRate.clicksPerUniqueClick * randFloat(0.9, 1.1)));

                        let numIntervals = 0; const groupBy = urlParams.groupBy || 'day';
                        if (groupBy === 'month') numIntervals = months;
                        else if (groupBy === 'week') numIntervals = weeks;
                        else numIntervals = days;
                        numIntervals = Math.max(1, numIntervals);
                        let currentDate = new Date(sinceDate);

                        let remainingSent = aggStatsForTimeSeries.sentEmails;
                        let remainingOpens = aggStatsForTimeSeries.totalOpens;
                        let remainingClicks = aggStatsForTimeSeries.totalClicks;

                        for (let i = 0; i < numIntervals; i++) {
                            let intervalDateStr = currentDate.toISOString().split('T')[0] + "T00:00:00Z";
                            let sentForInterval = (i === numIntervals - 1) ? remainingSent : Math.max(0,Math.round(aggStatsForTimeSeries.sentEmails / numIntervals * randFloat(0.5, 1.5)));
                            remainingSent = Math.max(0, remainingSent - sentForInterval);
                            let opensForInterval = (i === numIntervals - 1) ? remainingOpens : Math.max(0,Math.round(aggStatsForTimeSeries.totalOpens / numIntervals * randFloat(0.5, 1.5)));
                            remainingOpens = Math.max(0, remainingOpens - opensForInterval);
                            let clicksForInterval = (i === numIntervals - 1) ? remainingClicks : Math.max(0,Math.round(aggStatsForTimeSeries.totalClicks / numIntervals * randFloat(0.5, 1.5)));
                            remainingClicks = Math.max(0, remainingClicks - clicksForInterval);
                             // Ensure clicks are not more than opens for the interval for basic plausibility
                            clicksForInterval = Math.min(clicksForInterval, opensForInterval);

                            modifiedData.timeseries.push({
                                date: intervalDateStr,
                                totalClicks: clicksForInterval, totalOpens: opensForInterval, totalSentEmails: sentForInterval
                            });
                            if (groupBy === 'month') currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
                            else if (groupBy === 'week') currentDate.setUTCDate(currentDate.getUTCDate() + 7);
                            else currentDate.setUTCDate(currentDate.getUTCDate() + 1);
                            if (currentDate > untilDate && i < numIntervals -1) break;
                        }
                        break;

                        case 'OVERVIEW':
                            modifiedData.series = [];
                            const existingEmails = (originalJsonData && Array.isArray(originalJsonData.series)) ? originalJsonData.series : [];
                            
                            if (existingEmails.length > 0) {
                                console.log(INJECTED_LOG_PREFIX, "Augmenting existing emails in OVERVIEW.");
                                existingEmails.forEach(email => {
                                    let newSent = Math.max(email.sentEmails || 0, rand(10, 50)); // Ensure some minimum sends or boost existing
                                    let newRecipients = Math.max(email.recipients || 0, newSent); // Recipients at least equal to sends for simplicity
                                    if (email.sentEmails > 0 && newSent < email.sentEmails) newSent = email.sentEmails; // Don't reduce sends if original was higher
                                    if (email.recipients > 0 && newRecipients < email.recipients) newRecipients = email.recipients;
    
    
                                    let newUniqueOpens = Math.round(newRecipients * dailyRate.openRate * randFloat(0.7, 1.2));
                                    newUniqueOpens = Math.min(newRecipients, Math.max(email.uniqueOpens || 0, newUniqueOpens));
                                    newUniqueOpens = Math.max(0, newUniqueOpens);
    
    
                                    let newUniqueClicks = Math.round(newUniqueOpens * dailyRate.clickToOpenRate * randFloat(0.7, 1.2));
                                    newUniqueClicks = Math.min(newUniqueOpens, Math.max(email.uniqueClicks || 0, newUniqueClicks));
                                    newUniqueClicks = Math.max(0, newUniqueClicks);
    
                                    let newTotalOpens = Math.round(newUniqueOpens * dailyRate.opensPerUniqueOpen * randFloat(0.9, 1.1));
                                    newTotalOpens = Math.max(newUniqueOpens, Math.max(email.totalOpens || 0, newTotalOpens));
    
                                    let newTotalClicks = Math.round(newUniqueClicks * dailyRate.clicksPerUniqueClick * randFloat(0.9, 1.1));
                                    newTotalClicks = Math.max(newUniqueClicks, Math.max(email.totalClicks || 0, newTotalClicks));
    
                                    modifiedData.series.push({
                                        ...email, // Keep original id, title, subject, published date
                                        sentEmails: newSent,
                                        recipients: newRecipients,
                                        uniqueOpens: newUniqueOpens,
                                        uniqueClicks: newUniqueClicks, // Augmented
                                        totalOpens: newTotalOpens,
                                        totalClicks: newTotalClicks   // Augmented
                                    });
                                });
                            } else {
                                console.log(INJECTED_LOG_PREFIX, "Original OVERVIEW empty or no series. Generating fake emails.");
                                let numEmailsInOverview = Math.max(1, Math.round(dailyRate.uniqueSentEmails * days * randFloat(0.5, 1.0)));
                                numEmailsInOverview = Math.min(numEmailsInOverview, rand(5,15)); // Generate a reasonable number
                                const emailTitles = ["Company Update", "Weekly Digest", "Project News", "IT Alert", "HR Update", "Monthly Roundup", "CEO Message", "Product Launch", "Event Invite", "Training Info"];
                                
                                for (let i = 0; i < numEmailsInOverview; i++) {
                                    const recipientsForThisEmail = Math.max(1, rand(Math.floor(dailyRate.avgRecipientsPerCampaign * 0.3), Math.floor(dailyRate.avgRecipientsPerCampaign * 1.2)));
                                    const sentForThisEmail = Math.max(recipientsForThisEmail, Math.round(recipientsForThisEmail * randFloat(1.0, 1.05)));
                                    const uniqueOpensForThisEmail = Math.min(recipientsForThisEmail, Math.round(recipientsForThisEmail * dailyRate.openRate * randFloat(0.7, 1.3)));
                                    const uniqueClicksForThisEmail = Math.min(uniqueOpensForThisEmail, Math.round(uniqueOpensForThisEmail * dailyRate.clickToOpenRate * randFloat(0.7, 1.3)));
                                    const totalOpensForThisEmail = Math.max(uniqueOpensForThisEmail, Math.round(uniqueOpensForThisEmail * dailyRate.opensPerUniqueOpen * randFloat(0.9,1.1)));
                                    const totalClicksForThisEmail = Math.max(uniqueClicksForThisEmail, Math.round(uniqueClicksForThisEmail * dailyRate.clicksPerUniqueClick * randFloat(0.9,1.1)));
    
                                    modifiedData.series.push({
                                        emailId: `fakeemailid_${i}_${Date.now()}_${rand(1000,9999)}`,
                                        emailTitle: emailTitles[rand(0, emailTitles.length - 1)] + (numEmailsInOverview > emailTitles.length ? ` #${i+1}` : ` (v${rand(1,3)})`),
                                        emailSubject: "Important Information Inside - Action Required",
                                        emailPublished: generateRandomDate(sinceDate, untilDate).toISOString(),
                                        sentEmails: sentForThisEmail,
                                        recipients: recipientsForThisEmail,
                                        uniqueOpens: uniqueOpensForThisEmail,
                                        uniqueClicks: uniqueClicksForThisEmail,
                                        totalOpens: totalOpensForThisEmail,
                                        totalClicks: totalClicksForThisEmail
                                    });
                                }
                            }
                            // Apply sorting if orderBy parameter is present
                            if (urlParams.orderBy && modifiedData.series && modifiedData.series.length > 0) {
                                const [field, direction] = urlParams.orderBy.split('_');
                                const sortField = field === 'opened' ? 'uniqueOpens' : (field === 'clicked' ? 'uniqueClicks' : field);
                                if (modifiedData.series[0].hasOwnProperty(sortField)) {
                                    modifiedData.series.sort((a, b) => {
                                        if (direction && direction.toUpperCase() === 'DESC') return b[sortField] - a[sortField];
                                        return a[sortField] - b[sortField];
                                    });
                                }
                            }
                            break;
                    }
                    
                    // console.log(INJECTED_LOG_PREFIX + ` Modified ${matchedEndpointKey} data:`, JSON.parse(JSON.stringify(modifiedData)));
                    return new Response(JSON.stringify(modifiedData), {
                    status: 200, statusText: "OK", headers: {'Content-Type': 'application/json'}
            });
        } catch (err) {
            console.error(INJECTED_LOG_PREFIX + ` Error during MAIN ANALYTICS data generation:`, err);
            // Fallback to empty valid structures on error
            if (matchedEndpointKey === 'TIMESERIES') return new Response(JSON.stringify({timeseries:[]}), {status: 200});
            if (matchedEndpointKey === 'OVERVIEW') return new Response(JSON.stringify({series:[]}), {status: 200});
            if (matchedEndpointKey === 'AGGREGATED_STATS') return new Response(JSON.stringify({uniqueSentEmails:0, sentEmails:0, recipients:0, uniqueOpens:0, uniqueClicks:0, totalOpens:0, totalClicks:0}), {status: 200});
            return pageContextOriginalFetch.apply(this, args); // Fallback to original fetch
        }
    }


    // --- Apply the fetch override ---
    window.fetch = injectedEmailCustomFetch;
    window.__REPLIFY_EMAIL_FETCH_APPLIED__ = true;
    // console.log(INJECTED_LOG_PREFIX + ' Email fetch override applied.');

    window.__REPLIFY_REVERT_EMAIL_FETCH__ = function() {
        if (window.fetch === injectedEmailCustomFetch) {
            window.fetch = pageContextOriginalFetch;
            delete window.__REPLIFY_EMAIL_FETCH_APPLIED__;
            delete window.__REPLIFY_REVERT_EMAIL_FETCH__;
            console.log(INJECTED_LOG_PREFIX + ' Email fetch restored by revert function.');
            return true;
        }
        return false;
    };
})();