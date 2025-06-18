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

    // --- Main page (existing) endpoints ---
    const TARGET_EMAIL_API_URLS = {
        AGGREGATED_STATS: '/api/email-analytics/aggregated-stats',
        TIMESERIES: '/api/email-analytics/timeseries',
        OVERVIEW: '/api/email-analytics/overview'
    };
    
    // --- Individual email page (new) endpoints ---
    const emailPerformanceRegex = /^\/api\/email-performance\/([a-zA-Z0-9]+)\/([\w-]+)/;
    const emailPerformanceCache = {}; // Cache for consistent data per emailID

    function getOrGenerateBaseStats(emailID) {
        if (!emailPerformanceCache[emailID]) {
            console.log(INJECTED_LOG_PREFIX, `First request for emailID ${emailID}. Generating base stats.`);
            const totalRecipients = rand(850, 3200);
            const uniqueOpens = Math.round(totalRecipients * randFloat(0.55, 0.85)); // 55-85% open rate
            const uniqueClicks = Math.round(uniqueOpens * randFloat(0.18, 0.45));   // 18-45% click-through rate (of openers)
            const totalOpens = Math.round(uniqueOpens * randFloat(1.1, 1.7));
            const totalClicks = Math.round(uniqueClicks * randFloat(1.2, 2.2));
            
            emailPerformanceCache[emailID] = {
                totalRecipients,
                targetAudience: totalRecipients + rand(0, 50), // Target audience can be slightly larger
                uniqueOpens,
                totalOpens,
                uniqueClicks,
                totalClicks,
                // Generate a random date in the last month
                lastClickRecorded: new Date(Date.now() - rand(3600000, 30 * 86400000)).toISOString()
            };
        }
        return emailPerformanceCache[emailID];
    }

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
    
    // Helper to get the week number for a date
    function getWeekNumber(d) {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
        return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    }
    


function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
}


function generateTimeSeriesData(urlParams, statsToDistribute, isCumulative = false) {
    const { since, until, groupBy = 'DAY' } = urlParams;
    let sinceDate = new Date(decodeURIComponent(since));
    const untilDate = new Date(decodeURIComponent(until));

    if (isNaN(sinceDate.getTime()) || isNaN(untilDate.getTime())) {
        return { timeseries: [] }; // Cannot generate without valid dates
    }

    const upperGroupBy = groupBy.toUpperCase();

    // 1. Generate the original "active" intervals based on the API request
    const activeIntervals = [];
    let tempCurrentDate = new Date(sinceDate);
    while (tempCurrentDate <= untilDate) {
        activeIntervals.push(new Date(tempCurrentDate));
        switch (upperGroupBy) {
            case 'HOUR': tempCurrentDate.setUTCHours(tempCurrentDate.getUTCHours() + 1); break;
            case 'WEEK': tempCurrentDate.setUTCDate(tempCurrentDate.getUTCDate() + 7); break;
            case 'DAY':
            default: tempCurrentDate.setUTCDate(tempCurrentDate.getUTCDate() + 1); break;
        }
    }

    // 2. Determine minimum points and create the final intervals array, padding if necessary
    let minPoints = 0;
    if (upperGroupBy === 'HOUR') minPoints = 24;
    else if (upperGroupBy === 'WEEK') minPoints = 4;
    else if (upperGroupBy === 'DAY') minPoints = 7;

    let finalIntervals = [...activeIntervals];
    const pointsToAdd = minPoints - activeIntervals.length;

    if (pointsToAdd > 0) {
        const paddedIntervals = [];
        let padDate = new Date(sinceDate);
        for (let i = 0; i < pointsToAdd; i++) {
            switch (upperGroupBy) {
                case 'HOUR': padDate.setUTCHours(padDate.getUTCHours() - 1); break;
                case 'WEEK': padDate.setUTCDate(padDate.getUTCDate() - 7); break;
                case 'DAY':
                default: padDate.setUTCDate(padDate.getUTCDate() - 1); break;
            }
            paddedIntervals.unshift(new Date(padDate));
        }
        finalIntervals = [...paddedIntervals, ...finalIntervals];
    }


    // 3. Distribute stats across the ENTIRE set of final intervals
    const numTotalIntervals = finalIntervals.length;
    let finalDistributedValues = [];

    if (numTotalIntervals > 0) {
        const weights = finalIntervals.map((_, i) => {
            const decayFactor = Math.pow(0.7, i) + 0.1;
            return Math.random() * decayFactor;
        });
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);

        finalDistributedValues = finalIntervals.map((_, i) => {
            if (totalWeight === 0) return { opens: 0, clicks: 0 };
            const share = weights[i] / totalWeight;
            const opens = Math.floor(statsToDistribute.opens * share);
            const clicks = Math.floor(statsToDistribute.clicks * share);
            return { opens, clicks: Math.min(opens, clicks) };
        });

        const sumOpens = finalDistributedValues.reduce((sum, v) => sum + v.opens, 0);
        const sumClicks = finalDistributedValues.reduce((sum, v) => sum + v.clicks, 0);

        const openRemainder = statsToDistribute.opens - sumOpens;
        const clickRemainder = statsToDistribute.clicks - sumClicks;

        if (finalDistributedValues.length > 0) {
            finalDistributedValues[0].opens += openRemainder;
            finalDistributedValues[0].clicks += clickRemainder;
            // Final safety checks
            finalDistributedValues[0].opens = Math.max(0, finalDistributedValues[0].opens);
            finalDistributedValues[0].clicks = Math.max(0, finalDistributedValues[0].clicks);
            finalDistributedValues[0].clicks = Math.min(finalDistributedValues[0].opens, finalDistributedValues[0].clicks);
        }
    }

    // 4. If cumulative, transform the final distributed values into a cumulative sum
    if (isCumulative && finalDistributedValues.length > 1) {
        for (let i = 1; i < finalDistributedValues.length; i++) {
            finalDistributedValues[i].opens += finalDistributedValues[i - 1].opens;
            finalDistributedValues[i].clicks += finalDistributedValues[i - 1].clicks;
        }
        if (finalDistributedValues.length > 0) {
            finalDistributedValues[finalDistributedValues.length - 1].opens = statsToDistribute.opens;
            finalDistributedValues[finalDistributedValues.length - 1].clicks = statsToDistribute.clicks;
        }
    }

    // 5. Build the final timeseries response object
    const timeseries = finalIntervals.map((intervalDate, i) => ({
        opens: finalDistributedValues[i]?.opens || 0,
        clicks: finalDistributedValues[i]?.clicks || 0,
        interval: {
            hour: intervalDate.getUTCHours(),
            day: intervalDate.getUTCDate(),
            week: getWeekNumber(intervalDate),
            month: intervalDate.getUTCMonth() + 1,
            year: intervalDate.getUTCFullYear()
        }
    }));

    return { timeseries };
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

        const performanceMatch = urlPath.match(emailPerformanceRegex);

        // --- Start Interception Logic ---
        if (matchedEndpointKey) {
            // --- EXISTING LOGIC FOR MAIN ANALYTICS PAGE ---
            // console.log(INJECTED_LOG_PREFIX + ` Intercepting ${matchedEndpointKey}: ${requestFullUrl.substring(0,150)}`);
            const { days, weeks, months, sinceDate, untilDate, error: dateError } = calculateDateMetrics(urlParams.since, urlParams.until);
            const dailyRate = {
                uniqueSentEmails: randFloat(0.1, 0.5),
                avgRecipientsPerCampaign: rand(20, 150), // Adjusted from 200
                openRate: randFloat(0.20, 0.50),      // Adjusted from 0.55
                clickToOpenRate: randFloat(0.05, 0.20), // Adjusted from 0.25
                opensPerUniqueOpen: randFloat(1.1, 1.8), // Adjusted from 2.0
                clicksPerUniqueClick: randFloat(1.1, 2.2) // Adjusted from 2.5
            };
            try {
                const response = await pageContextOriginalFetch.apply(this, args); // Get original response first
                let originalJsonData = {};
                let responseOk = response.ok;
                let responseStatus = response.status;
                let responseHeaders = response.headers;

                if (responseOk && response.headers.get("content-type")?.includes("application/json")) {
                    originalJsonData = await response.clone().json();
                } else if (!responseOk) {
                    // If original response was an error, we might still want to generate mock data if it's a known endpoint
                    console.warn(INJECTED_LOG_PREFIX, `Original request for ${matchedEndpointKey} failed with status ${responseStatus}. Will generate mock data.`);
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
                        // ... (full timeseries generation logic as provided before) ...
                        // (For brevity, I'm not repeating the full timeseries block here, assume it's the same as the last correct version)
                        // It should generate based on totals calculated for the period similar to AGGREGATED_STATS
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
                 console.error(INJECTED_LOG_PREFIX + ` Error during data generation for ${requestFullUrl}:`, err);
                 // Fallback to avoid breaking the page
                if (matchedEndpointKey === 'TIMESERIES') return new Response(JSON.stringify({timeseries:[]}), {status: 200, headers: {'Content-Type': 'application/json'}});
                if (matchedEndpointKey === 'OVERVIEW') return new Response(JSON.stringify({series:[]}), {status: 200, headers: {'Content-Type': 'application/json'}});
                if (matchedEndpointKey === 'AGGREGATED_STATS') return new Response(JSON.stringify({uniqueSentEmails:0, sentEmails:0, recipients:0, uniqueOpens:0, uniqueClicks:0, totalOpens:0, totalClicks:0}), {status: 200, headers: {'Content-Type': 'application/json'}});
                return pageContextOriginalFetch.apply(this, args);
            }
        } else if (performanceMatch) {
             // --- LOGIC FOR INDIVIDUAL EMAIL PAGE ---
            const emailID = performanceMatch[1];
            const metric = performanceMatch[2];
            console.log(INJECTED_LOG_PREFIX + `Intercepting Email Performance. Metric: ${metric}, EmailID: ${emailID}`);
            
            const baseStats = getOrGenerateBaseStats(emailID);
            let modifiedData = {};

            switch(metric) {
                case 'recipient-count':
                    modifiedData = { totalRecipients: baseStats.totalRecipients, targetAudience: baseStats.targetAudience };
                    break;
                
                case 'opens':
                     modifiedData = { totalOpens: baseStats.totalOpens, uniqueOpens: baseStats.uniqueOpens, percentage: baseStats.totalRecipients > 0 ? parseFloat((baseStats.uniqueOpens / baseStats.totalRecipients).toFixed(2)) : 0 };
                    break;

                case 'clicks':
                    modifiedData = { totalClicks: baseStats.totalClicks, uniqueClicks: baseStats.uniqueClicks, percentage: baseStats.totalRecipients > 0 ? parseFloat((baseStats.uniqueClicks / baseStats.totalRecipients).toFixed(2)) : 0, lastClickRecorded: baseStats.lastClickRecorded };
                    break;
                
                case 'engagement-trend':
                    modifiedData = {
                        totalRecipients: baseStats.totalRecipients,
                        opens: { total: baseStats.uniqueOpens, previous: Math.round(baseStats.uniqueOpens * randFloat(0.8, 1.2)), dropOff: rand(0,1), percentage: baseStats.totalRecipients > 0 ? parseFloat((baseStats.uniqueOpens / baseStats.totalRecipients).toFixed(2)) : 0 },
                        clicks: { total: baseStats.uniqueClicks, previous: Math.round(baseStats.uniqueClicks * randFloat(0.8, 1.2)), dropOff: rand(0,1), percentage: baseStats.uniqueOpens > 0 ? parseFloat((baseStats.uniqueClicks / baseStats.uniqueOpens).toFixed(2)) : 0 }
                    };
                    break;

                    case 'links':
                        // For links, we need the original response to know WHAT links to modify
                        try {
                            const originalResponse = await pageContextOriginalFetch.apply(this, args);
                            const originalJson = await originalResponse.clone().json();
                            const links = Array.isArray(originalJson.links) ? originalJson.links : [];
                            
                            if (links.length > 0) {
                                // Distribute the total clicks among the links
                                let remainingTotalClicks = baseStats.totalClicks;
                                let clicksDistribution = links.map(() => Math.random()); // Assign a random weight to each link
                                const totalWeight = clicksDistribution.reduce((sum, w) => sum + w, 0);
    
                                const modifiedLinks = links.map((link, index) => {
                                    let clicksForThisLink = 0;
                                    if (totalWeight > 0) {
                                        // Distribute clicks based on the random weight
                                        const share = clicksDistribution[index] / totalWeight;
                                        clicksForThisLink = Math.round(baseStats.totalClicks * share);
                                    }
    
                                    // A simple distribution fallback for the last item to ensure sum is correct
                                    if (index === links.length - 1) {
                                        clicksForThisLink = remainingTotalClicks;
                                    } else {
                                       clicksForThisLink = Math.min(remainingTotalClicks, clicksForThisLink);
                                       remainingTotalClicks -= clicksForThisLink;
                                    }
    
    
                                    return {
                                        ...link, // Keep original name, target, etc.
                                        totalClicks: clicksForThisLink,
                                        // The percentage is often total clicks on this link / total unique opens of the email
                                        percentage: baseStats.uniqueOpens > 0 ? parseFloat((clicksForThisLink / baseStats.uniqueOpens).toFixed(4)) : 0,
                                    };
                                });
                                modifiedData = { links: modifiedLinks };
                            } else {
                               modifiedData = { links: [] }; // No links to modify
                            }
                            
                        } catch (err) {
                            console.error(INJECTED_LOG_PREFIX + `Error fetching original or modifying links for ${emailID}:`, err);
                            modifiedData = { links: [] }; // Return empty on error
                        }
                        break;
                    
                case 'total-activity-over-time':
                    modifiedData = generateTimeSeriesData(urlParams, { opens: baseStats.totalOpens, clicks: baseStats.totalClicks }, false);
                    break;

                case 'unique-activity-over-time':
                    // Unique activity is cumulative, so we show the final total at each interval.
                    modifiedData = generateTimeSeriesData(urlParams, { opens: baseStats.uniqueOpens, clicks: baseStats.uniqueClicks }, true);
                    break;

                default:
                    // If the metric is not handled, pass through the original request
                    console.warn(INJECTED_LOG_PREFIX, `Passing through unhandled performance metric: ${metric}`);
                    return pageContextOriginalFetch.apply(this, args);
            }

            // Return the modified data for the performance endpoint
            return new Response(JSON.stringify(modifiedData), {
                status: 200, statusText: "OK", headers: {'Content-Type': 'application/json'}
            });
        }

        // If no endpoints match, perform the original fetch
        return pageContextOriginalFetch.apply(this, args);
    };

    window.fetch = injectedEmailCustomFetch;
    window.__REPLIFY_EMAIL_FETCH_APPLIED__ = true;
    console.log(INJECTED_LOG_PREFIX + ' Email fetch override applied with individual page logic.');

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