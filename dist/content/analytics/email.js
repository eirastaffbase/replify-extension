// content/analytics/email.js
(function () {
    'use strict';

    const INJECTED_LOG_PREFIX = '[Replify InjectedEmailPatch]:';
    // console.log(INJECTED_LOG_PREFIX, 'Injected script (email.js) executed.'); // Uncomment for load debugging

    if (window.__REPLIFY_EMAIL_FETCH_APPLIED__) {
        // console.warn(INJECTED_LOG_PREFIX, 'Email fetch override already applied. Aborting.'); // Uncomment for debugging
        return;
    }

    const pageContextOriginalFetch = window.fetch;
    if (!pageContextOriginalFetch) {
        console.error(INJECTED_LOG_PREFIX, 'CRITICAL: window.fetch is null/undefined in page context!');
        return;
    }
    // console.log(INJECTED_LOG_PREFIX, 'pageContextOriginalFetch captured by email injected script.'); // Uncomment for debugging

    const rand = (min, max) => {
        min = Math.ceil(min);
        max = Math.floor(max);
        if (min > max) [min, max] = [max, min]; // Ensure min <= max
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };
    const randFloat = (min, max, decimals = 2) => parseFloat((Math.random() * (max - min) + min).toFixed(decimals));

    const TARGET_EMAIL_API_URLS = {
        AGGREGATED_STATS: '/api/email-analytics/aggregated-stats',
        TIMESERIES: '/api/email-analytics/timeseries',
        OVERVIEW: '/api/email-analytics/overview'
    };

    // Helper to parse dates and calculate range
    function getUrlParams(urlString) {
        const params = {};
        try {
            const url = new URL(urlString, window.location.origin);
            url.searchParams.forEach((value, key) => {
                params[key] = value;
            });
        } catch (e) {
            console.warn(INJECTED_LOG_PREFIX, "Could not parse URL for params:", urlString, e);
        }
        return params;
    }

    function calculateDateMetrics(sinceStr, untilStr) {
        const since = new Date(decodeURIComponent(sinceStr));
        const until = new Date(decodeURIComponent(untilStr));
        if (isNaN(since.getTime()) || isNaN(until.getTime()) || since > until) {
            return { days: 30, weeks: 4, months: 1, error: true, sinceDate: new Date(Date.now() - 30*24*60*60*1000), untilDate: new Date() }; // Default to 30 days if parse error
        }
        const dayMillis = 1000 * 60 * 60 * 24;
        const days = Math.max(1, Math.ceil((until - since) / dayMillis)); // Ensure at least 1 day
        const weeks = Math.max(1, Math.ceil(days / 7));
        const months = Math.max(1, Math.ceil(days / 30.44)); // Average days in month
        return { days, weeks, months, sinceDate: since, untilDate: until, error: false };
    }
    
    function generateRandomDate(startDate, endDate) {
        return new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
    }


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

        let matchedEndpointKey = null;
        if (urlPath === TARGET_EMAIL_API_URLS.AGGREGATED_STATS) matchedEndpointKey = 'AGGREGATED_STATS';
        else if (urlPath === TARGET_EMAIL_API_URLS.TIMESERIES) matchedEndpointKey = 'TIMESERIES';
        else if (urlPath === TARGET_EMAIL_API_URLS.OVERVIEW) matchedEndpointKey = 'OVERVIEW';


        if (matchedEndpointKey) {
            console.log(INJECTED_LOG_PREFIX + ` Intercepting ${matchedEndpointKey}: ${requestFullUrl.substring(0,150)}`);
            
            const { days, weeks, months, sinceDate, untilDate, error: dateError } = calculateDateMetrics(urlParams.since, urlParams.until);
            if (dateError) console.warn(INJECTED_LOG_PREFIX, "Error parsing date range, using default 30 days.");

            // Base daily rates derived from your "This Year" example (155 days)
            // {"uniqueSentEmails":24,"sentEmails":339,"recipients":116,"uniqueOpens":188,"uniqueClicks":41,"totalOpens":304,"totalClicks":126}
            // We'll define a baseline for a "good average day" and then scale.
            const dailyRate = {
                uniqueSentEmails: randFloat(0.1, 0.5), // Avg 0.1 to 0.5 unique email campaigns per day
                avgRecipientsPerCampaign: rand(20, 200),
                openRate: randFloat(0.20, 0.55),      // Unique open rate
                clickToOpenRate: randFloat(0.05, 0.25), // Unique click rate based on opens
                opensPerUniqueOpen: randFloat(1.2, 2.0),
                clicksPerUniqueClick: randFloat(1.1, 2.5)
            };

            try {
                // We will generate fresh data instead of modifying original, to ensure proportionality.
                let modifiedData = {};

                switch (matchedEndpointKey) {
                    case 'AGGREGATED_STATS':
                        let genUniqueSentEmails = Math.max(1, Math.round(dailyRate.uniqueSentEmails * days * randFloat(0.7, 1.3)));
                        let genRecipients = Math.max(genUniqueSentEmails, Math.round(genUniqueSentEmails * dailyRate.avgRecipientsPerCampaign * randFloat(0.7, 1.3)));
                        // sentEmails should be number of individual emails delivered to inboxes
                        let genSentEmails = Math.max(genRecipients, Math.round(genRecipients * randFloat(1.0, 1.1))); // e.g. slight overhead

                        let genUniqueOpens = Math.round(genRecipients * dailyRate.openRate * randFloat(0.8, 1.2));
                        genUniqueOpens = Math.min(genRecipients, Math.max(0, genUniqueOpens));

                        let genUniqueClicks = Math.round(genUniqueOpens * dailyRate.clickToOpenRate * randFloat(0.8, 1.2));
                        genUniqueClicks = Math.min(genUniqueOpens, Math.max(0, genUniqueClicks));

                        let genTotalOpens = Math.round(genUniqueOpens * dailyRate.opensPerUniqueOpen * randFloat(0.9, 1.1));
                        genTotalOpens = Math.max(genUniqueOpens, genTotalOpens);

                        let genTotalClicks = Math.round(genUniqueClicks * dailyRate.clicksPerUniqueClick * randFloat(0.9, 1.1));
                        genTotalClicks = Math.max(genUniqueClicks, genTotalClicks);
                        
                        modifiedData = {
                            uniqueSentEmails: genUniqueSentEmails,
                            sentEmails: genSentEmails,
                            recipients: genRecipients,
                            uniqueOpens: genUniqueOpens,
                            uniqueClicks: genUniqueClicks,
                            totalOpens: genTotalOpens,
                            totalClicks: genTotalClicks
                        };
                        break;

                    case 'TIMESERIES':
                        const groupBy = urlParams.groupBy || 'day'; // default to day if not specified
                        modifiedData.timeseries = [];
                        let currentDate = new Date(sinceDate);
                        const aggStats = {uniqueSentEmails:0, sentEmails:0, recipients:0, uniqueOpens:0, uniqueClicks:0, totalOpens:0, totalClicks:0};
                        
                        // Generate total aggregated stats for the period first, to distribute them
                        // This ensures timeseries roughly adds up to what aggregated stats would show for same period
                        aggStats.uniqueSentEmails = Math.max(1, Math.round(dailyRate.uniqueSentEmails * days * randFloat(0.7, 1.3)));
                        aggStats.recipients = Math.max(aggStats.uniqueSentEmails, Math.round(aggStats.uniqueSentEmails * dailyRate.avgRecipientsPerCampaign * randFloat(0.7, 1.3)));
                        aggStats.sentEmails = Math.max(aggStats.recipients, Math.round(aggStats.recipients * randFloat(1.0, 1.1)));
                        aggStats.uniqueOpens = Math.min(aggStats.recipients, Math.max(0,Math.round(aggStats.recipients * dailyRate.openRate * randFloat(0.8, 1.2))));
                        aggStats.uniqueClicks = Math.min(aggStats.uniqueOpens, Math.max(0,Math.round(aggStats.uniqueOpens * dailyRate.clickToOpenRate * randFloat(0.8, 1.2))));
                        aggStats.totalOpens = Math.max(aggStats.uniqueOpens, Math.round(aggStats.uniqueOpens * dailyRate.opensPerUniqueOpen * randFloat(0.9, 1.1)));
                        aggStats.totalClicks = Math.max(aggStats.uniqueClicks, Math.round(aggStats.uniqueClicks * dailyRate.clicksPerUniqueClick * randFloat(0.9, 1.1)));

                        let numIntervals = 0;
                        if (groupBy === 'month') numIntervals = months;
                        else if (groupBy === 'week') numIntervals = weeks;
                        else numIntervals = days; // Default to days
                        numIntervals = Math.max(1, numIntervals);

                        for (let i = 0; i < numIntervals; i++) {
                            let intervalDateStr = currentDate.toISOString().split('T')[0] + "T00:00:00Z";
                            
                            // Distribute totals somewhat unevenly across intervals
                            let sentForInterval = (i === numIntervals - 1) ? aggStats.sentEmails : Math.max(0,Math.round(aggStats.sentEmails / numIntervals * randFloat(0.5, 1.5)));
                            aggStats.sentEmails -= sentForInterval;

                            let opensForInterval = (i === numIntervals - 1) ? aggStats.totalOpens : Math.max(0,Math.round(aggStats.totalOpens / numIntervals * randFloat(0.5, 1.5)));
                            aggStats.totalOpens -= opensForInterval;

                            let clicksForInterval = (i === numIntervals - 1) ? aggStats.totalClicks : Math.max(0,Math.round(aggStats.totalClicks / numIntervals * randFloat(0.5, 1.5)));
                            aggStats.totalClicks -= clicksForInterval;

                            modifiedData.timeseries.push({
                                date: intervalDateStr,
                                totalClicks: Math.max(0,clicksForInterval),
                                totalOpens: Math.max(0,opensForInterval),
                                totalSentEmails: Math.max(0,sentForInterval)
                            });

                            if (groupBy === 'month') currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
                            else if (groupBy === 'week') currentDate.setUTCDate(currentDate.getUTCDate() + 7);
                            else currentDate.setUTCDate(currentDate.getUTCDate() + 1); // Day

                            if (currentDate > untilDate && i < numIntervals -1) { // Stop if we've passed the untilDate
                                console.warn(INJECTED_LOG_PREFIX, "Timeseries generation exceeded 'until' date, might have too many intervals for groupBy:", groupBy);
                                break;
                            }
                        }
                         // Ensure last interval doesn't have negative values if totals were exhausted
                        if (modifiedData.timeseries.length > 0) {
                            const lastEntry = modifiedData.timeseries[modifiedData.timeseries.length - 1];
                            if (aggStats.sentEmails > 0) lastEntry.totalSentEmails += aggStats.sentEmails;
                            if (aggStats.totalOpens > 0) lastEntry.totalOpens += aggStats.totalOpens;
                            if (aggStats.totalClicks > 0) lastEntry.totalClicks += aggStats.totalClicks;
                            lastEntry.totalSentEmails = Math.max(0, lastEntry.totalSentEmails);
                            lastEntry.totalOpens = Math.max(0, lastEntry.totalOpens);
                            lastEntry.totalClicks = Math.max(0, lastEntry.totalClicks);
                        }

                        break;

                    case 'OVERVIEW':
                        modifiedData.series = [];
                        // Number of unique emails to show in overview, proportional to period length
                        let numEmailsInOverview = Math.max(1, Math.round(dailyRate.uniqueSentEmails * days * randFloat(0.7, 1.3)));
                        numEmailsInOverview = Math.min(numEmailsInOverview, 25); // Cap at 25 for overview display

                        const emailTitles = ["Company Update", "Weekly Digest", "Project Phoenix News", "IT Maintenance Alert", "HR Benefits Update", "Monthly Roundup", "CEO Message", "New Product Launch", "Event Invitation", "Training Schedule"];
                        
                        for (let i = 0; i < numEmailsInOverview; i++) {
                            const recipientsForThisEmail = Math.max(1, rand(Math.floor(dailyRate.avgRecipientsPerCampaign * 0.5), Math.floor(dailyRate.avgRecipientsPerCampaign * 1.5)));
                            const sentForThisEmail = Math.max(recipientsForThisEmail, Math.round(recipientsForThisEmail * randFloat(1.0, 1.05))); // Sent slightly more or equal to recipients

                            const uniqueOpensForThisEmail = Math.min(recipientsForThisEmail, Math.round(recipientsForThisEmail * dailyRate.openRate * randFloat(0.7, 1.3)));
                            const uniqueClicksForThisEmail = Math.min(uniqueOpensForThisEmail, Math.round(uniqueOpensForThisEmail * dailyRate.clickToOpenRate * randFloat(0.7, 1.3)));
                            const totalOpensForThisEmail = Math.max(uniqueOpensForThisEmail, Math.round(uniqueOpensForThisEmail * dailyRate.opensPerUniqueOpen * randFloat(0.9,1.1)));
                            const totalClicksForThisEmail = Math.max(uniqueClicksForThisEmail, Math.round(uniqueClicksForThisEmail * dailyRate.clicksPerUniqueClick * randFloat(0.9,1.1)));

                            modifiedData.series.push({
                                emailId: `fakeemailid_${i}_${Date.now()}_${rand(1000,9999)}`,
                                emailTitle: emailTitles[rand(0, emailTitles.length - 1)] + (numEmailsInOverview > emailTitles.length ? ` #${i+1}` : ''),
                                emailSubject: "Important Information Inside", // Generic subject
                                emailPublished: generateRandomDate(sinceDate, untilDate).toISOString(),
                                sentEmails: sentForThisEmail,
                                recipients: recipientsForThisEmail, // For simplicity, recipients = sent for a specific email campaign item
                                uniqueOpens: uniqueOpensForThisEmail,
                                uniqueClicks: uniqueClicksForThisEmail,
                                totalOpens: totalOpensForThisEmail,
                                totalClicks: totalClicksForThisEmail
                            });
                        }
                        // Sort if orderBy is present (example, you might need more robust parsing)
                        if (urlParams.orderBy) {
                            const [field, direction] = urlParams.orderBy.split('_'); //e.g. opened_DESC
                            if (field && direction && modifiedData.series[0] && modifiedData.series[0].hasOwnProperty(field === 'opened' ? 'uniqueOpens' : field)) {
                                const sortField = field === 'opened' ? 'uniqueOpens' : field;
                                modifiedData.series.sort((a, b) => {
                                    if (direction.toUpperCase() === 'DESC') return b[sortField] - a[sortField];
                                    return a[sortField] - b[sortField];
                                });
                            }
                        }
                        break;
                }
                
                // console.log(INJECTED_LOG_PREFIX + ` Modified ${matchedEndpointKey} data:`, JSON.parse(JSON.stringify(modifiedData)));
                return new Response(JSON.stringify(modifiedData), {
                    status: 200, // Ensure a 200 OK status
                    statusText: "OK",
                    headers: {'Content-Type': 'application/json'}
                });

            } catch (err) {
                console.error(INJECTED_LOG_PREFIX + ` Error during data generation for ${requestFullUrl}:`, err);
                // Return an empty valid structure or original error for debugging
                if (matchedEndpointKey === 'TIMESERIES') return new Response(JSON.stringify({timeseries:[]}), {status: 200, headers: {'Content-Type': 'application/json'}});
                if (matchedEndpointKey === 'OVERVIEW') return new Response(JSON.stringify({series:[]}), {status: 200, headers: {'Content-Type': 'application/json'}});
                if (matchedEndpointKey === 'AGGREGATED_STATS') return new Response(JSON.stringify({uniqueSentEmails:0, sentEmails:0, recipients:0, uniqueOpens:0, uniqueClicks:0, totalOpens:0, totalClicks:0}), {status: 200, headers: {'Content-Type': 'application/json'}});
                return pageContextOriginalFetch.apply(this, args); // Fallback to original fetch if error in our logic
            }
        }
        return pageContextOriginalFetch.apply(this, args);
    };

    window.fetch = injectedEmailCustomFetch;
    window.__REPLIFY_EMAIL_FETCH_APPLIED__ = true;
    console.log(INJECTED_LOG_PREFIX + ' Email fetch override applied.');

    window.__REPLIFY_REVERT_EMAIL_FETCH__ = function() {
        if (window.fetch === injectedEmailCustomFetch) {
            window.fetch = pageContextOriginalFetch;
            delete window.__REPLIFY_EMAIL_FETCH_APPLIED__;
            delete window.__REPLIFY_REVERT_EMAIL_FETCH__;
            console.log(INJECTED_LOG_PREFIX + ' Email fetch restored to page original by revert function.');
            return true;
        }
        return false;
    };
})();