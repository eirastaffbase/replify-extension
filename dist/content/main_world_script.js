// content/main_world_script.js
(function() {
    const INJECTED_LOG_PREFIX = '[Replify InjectedCampaignsPatch]:';
    console.log(INJECTED_LOG_PREFIX, 'Injected script (main_world_script.js) executed.');

    // Prevent double-injection/override
    if (window.__REPLIFY_CAMPAIGNS_FETCH_APPLIED__) {
        console.warn(INJECTED_LOG_PREFIX, 'Fetch override already applied by this injected script. Aborting redundant execution.');
        return;
    }

    const pageContextOriginalFetch = window.fetch;
    if (!pageContextOriginalFetch) {
        console.error(INJECTED_LOG_PREFIX, 'CRITICAL: window.fetch is null/undefined in page context at injection time!');
        return;
    }
    console.log(INJECTED_LOG_PREFIX, 'pageContextOriginalFetch captured by injected script.');

    let injectedCampaignDataStore = {};

    const TARGET_URLS = {
        RANKINGS: '/api/branch/analytics/campaigns/rankings',
        CAMPAIGN_STATS: '/api/branch/analytics/campaigns/stats',
        CAMPAIGN_INFO: '/api/campaigns/',
        ALIGNMENT_RESULTS_OVERALL: '/api/alignment-survey/results/overall',
        ALIGNMENT_RESULTS_PER_CONTENT: '/api/alignment-survey/results/per-content',
        ALIGNMENT_SURVEY_CONFIG: '/api/alignment-survey/surveys',
        ENGAGEMENT_GROUPS: '/api/branch/analytics/campaigns/engagement/user-group-ranking',
        VISIBILITY_USER_GROUP_RANKING: '/api/branch/analytics/campaigns/visibility/user-group-ranking',
        SENTIMENT_TIMESERIES: '/api/community-insights/campaigns/',
        SENTIMENT_OVERALL: '/api/community-insights/campaigns/',
        VISIBILITY_TIMESERIES: '/api/branch/analytics/campaigns/visibility/timeseries',
        POST_STATS: '/api/branch/analytics/campaigns/posts/stats'
    };

    // --- All your helper functions (rand, normalisePercentage, etc.) go here ---
    const rand = (min, max) => { min = Math.ceil(min); max = Math.floor(max); return Math.floor(Math.random() * (max - min + 1)) + min; };
    const randFloat = (min, max, decimals) => parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
    const MAX_REALISTIC_PCT = 97;

    const normalisePercentage = (pctValue) => {
        let n = Number(pctValue);
        if (isNaN(n)) return pctValue;
        if (n >= 100) n = rand(30, 85);
        else if (n >= 90 && Math.random() < 0.60) n = rand(Math.max(30, n - rand(5, 15)), Math.min(n - 1, MAX_REALISTIC_PCT - 1));
        else if (n >= 80 && n < 90 && Math.random() < 0.25) n = rand(Math.max(30, n - rand(3, 10)), Math.min(n - 1, MAX_REALISTIC_PCT -1));
        return Math.min(n, MAX_REALISTIC_PCT);
    };
    const generateAlignmentScore = () => {
        const r = Math.random(); let score;
        if (r < 0.70) score = randFloat(4.09, 5.00, 2);
        else if (r < 0.90) score = randFloat(3.61, 4.01, 2);
        else score = randFloat(3.01, 3.55, 2);
        return parseFloat(Math.min(5.0, Math.max(3.0, score)).toFixed(2));
    };
    const harmonisePercentagePair = (visPct, engPct) => {
        if (typeof visPct !== 'number' || typeof engPct !== 'number') return [visPct, engPct];
        let newVisPct = Math.min(visPct, MAX_REALISTIC_PCT); let newEngPct = Math.min(engPct, MAX_REALISTIC_PCT);
        if (newVisPct <= newEngPct + rand(0, 3) && Math.random() < 0.90) newVisPct = Math.min(MAX_REALISTIC_PCT, newEngPct + rand(5, 15));
        if (newVisPct < newEngPct) newVisPct = Math.min(MAX_REALISTIC_PCT, newEngPct + rand(2, 7));
        newVisPct = Math.min(newVisPct, MAX_REALISTIC_PCT);
        const MAX_ALLOWED_DIFF = rand(15, 30); const currentDiff = Math.abs(newVisPct - newEngPct);
        if (currentDiff > MAX_ALLOWED_DIFF) { const reductionNeeded = currentDiff - MAX_ALLOWED_DIFF; if (newVisPct > newEngPct) newEngPct += reductionNeeded; else newVisPct += reductionNeeded; }
        newVisPct = Math.min(MAX_REALISTIC_PCT, Math.max(0, newVisPct)); newEngPct = Math.min(MAX_REALISTIC_PCT, Math.max(0, newEngPct));
        if (newEngPct >= newVisPct) newEngPct = Math.max(0, newVisPct - rand(1, Math.max(1,Math.floor(newVisPct*0.1))));
        if (newVisPct === 0) newEngPct = 0; if (newVisPct === newEngPct && newVisPct > 0) newEngPct = Math.max(0, newVisPct - 1);
        return [newVisPct, newEngPct];
    };
    function generateAlignmentAnswers(avgScore, numParticipants) {
        const answers = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
        if (numParticipants <= 0) return answers;
        const targetVote = Math.round(avgScore);
        for (let i = 0; i < numParticipants; i++) {
            let vote; const r = Math.random();
            if (r < 0.6) vote = rand(Math.max(1, targetVote - 1), Math.min(5, targetVote + 1));
            else if (r < 0.85) { if (avgScore > 3.5) vote = rand(Math.max(1, targetVote -2), 5); else vote = rand(1, Math.min(5, targetVote + 2)); }
            else vote = rand(1, 5);
            answers[String(vote)]++;
        }
        return answers;
    }
    function extractCampaignIdFromUrl(url, paramName = 'campaignId') {
        try {
            const urlObj = new URL(url, window.location.origin); let id = urlObj.searchParams.get(paramName); if (id) return id;
            const pathParts = urlObj.pathname.split('/'); const campaignsIndex = pathParts.indexOf('campaigns');
            if (campaignsIndex !== -1 && pathParts.length > campaignsIndex + 1) {
                const potentialId = pathParts[campaignsIndex + 1];
                if (/^[a-f0-9]{24}$/i.test(potentialId)) { 
                    if ((campaignsIndex + 2 >= pathParts.length) ||
                        ['comments', 'stats', 'rankings', 'results', 'surveys', 'timeseries'].includes(pathParts[campaignsIndex + 2]) ||
                        /^[a-f0-9]{24}$/i.test(pathParts[campaignsIndex + 2]) === false ) {
                        return potentialId;
                    }
                }
            }
        } catch (e) { console.warn(INJECTED_LOG_PREFIX + ' Error parsing URL ' + url + ' for campaignId: ' + e.message); }
        return null;
    }
    // --- End of Injected Helper Functions ---

    const injectedCustomFetch = async function(...args) {
        const resource = args[0];
        let url = typeof resource === 'string' ? resource : resource.url;
        console.log(INJECTED_LOG_PREFIX, 'injectedCustomFetch processing URL:', url);

        let matchedEndpointType = null;
        let campaignId = null;

        if (typeof url === 'string') {
             if (url.startsWith(window.location.origin) || url.startsWith("https://app.staffbase.com") || url.includes("/api/")) { // Added /api/ as a general check
                if (url.includes(TARGET_URLS.RANKINGS)) matchedEndpointType = 'RANKINGS';
                else if (url.includes(TARGET_URLS.CAMPAIGN_STATS)) { matchedEndpointType = 'CAMPAIGN_STATS'; campaignId = extractCampaignIdFromUrl(url); }
                else if (url.includes(TARGET_URLS.ALIGNMENT_RESULTS_PER_CONTENT)) { matchedEndpointType = 'ALIGNMENT_RESULTS_PER_CONTENT'; campaignId = extractCampaignIdFromUrl(url); }
                else if (url.includes(TARGET_URLS.ALIGNMENT_RESULTS_OVERALL)) { matchedEndpointType = 'ALIGNMENT_RESULTS_OVERALL'; campaignId = extractCampaignIdFromUrl(url); }
                else if (url.includes(TARGET_URLS.ENGAGEMENT_GROUPS)) { matchedEndpointType = 'ENGAGEMENT_GROUPS'; campaignId = extractCampaignIdFromUrl(url); }
                else if (url.includes(TARGET_URLS.VISIBILITY_USER_GROUP_RANKING)) { matchedEndpointType = 'VISIBILITY_USER_GROUP_RANKING'; campaignId = extractCampaignIdFromUrl(url); }
                else if (url.includes(TARGET_URLS.SENTIMENT_OVERALL) && url.includes('/comments/sentiment-labels/overall')) { matchedEndpointType = 'SENTIMENT_OVERALL'; campaignId = extractCampaignIdFromUrl(url); }
                else if (url.includes(TARGET_URLS.SENTIMENT_TIMESERIES) && url.includes('/comments/sentiment-labels/time-series')) { matchedEndpointType = 'SENTIMENT_TIMESERIES'; campaignId = extractCampaignIdFromUrl(url); }
                else if (url.includes(TARGET_URLS.VISIBILITY_TIMESERIES)) { matchedEndpointType = 'VISIBILITY_TIMESERIES'; campaignId = extractCampaignIdFromUrl(url); }
                else if (url.includes(TARGET_URLS.POST_STATS)) { matchedEndpointType = 'POST_STATS'; campaignId = extractCampaignIdFromUrl(url); }
                else if (url.includes(TARGET_URLS.CAMPAIGN_INFO) && !Object.values(TARGET_URLS).some(v => v !== TARGET_URLS.CAMPAIGN_INFO && url.includes(v) && v.length > TARGET_URLS.CAMPAIGN_INFO.length) ) {
                    const potentialId = extractCampaignIdFromUrl(url);
                    if (potentialId && url.endsWith(TARGET_URLS.CAMPAIGN_INFO + potentialId)) { matchedEndpointType = 'CAMPAIGN_INFO'; campaignId = potentialId; }
                }
            }
        }

        if (matchedEndpointType) {
            console.log(INJECTED_LOG_PREFIX, 'INTERCEPTING', matchedEndpointType, 'for campaign', campaignId || 'N/A', '. URL:', url.substring(0,150));
            try {
                const response = await pageContextOriginalFetch.apply(this, args);
                if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
                    return response;
                }
                const clonedResponse = response.clone();
                const data = await clonedResponse.json();
                
                // --- Your full switch statement for data modification ---
                // (Make sure this is complete and uses injectedCampaignDataStore)
                switch (matchedEndpointType) {
                    case 'RANKINGS':
                        if (data.ranking && Array.isArray(data.ranking)) {
                            data.ranking.forEach(item => {
                                const currentCampaignId = item.campaignId;
                                const potential = item.potentialVisitors > 0 ? item.potentialVisitors : (Math.max(item.visitors, item.engagedUsers, 1));
                                let visPercent = (item.visitors / potential) * 100;
                                let engPercent = (item.engagedUsers / potential) * 100;
                                let normVisPercent = normalisePercentage(visPercent);
                                let normEngPercent = normalisePercentage(engPercent);
                                if (normEngPercent > normVisPercent && normVisPercent < 80) normEngPercent = rand(Math.max(10, normVisPercent - 20), normVisPercent);
                                [normVisPercent, normEngPercent] = harmonisePercentagePair(normVisPercent, normEngPercent);
                                item.visitors = Math.round((normVisPercent / 100) * potential);
                                item.engagedUsers = Math.round((normEngPercent / 100) * potential);
                                if (potential > 0) { item.visitors = Math.min(item.visitors, potential); if (item.visitors === potential) item.visitors = Math.max(0, potential - rand(1, Math.max(1, Math.floor(potential * 0.03)) + 1 )); }
                                item.engagedUsers = Math.min(item.engagedUsers, item.visitors); item.visitors = Math.max(0, item.visitors); item.engagedUsers = Math.max(0, item.engagedUsers);

                                let newAlignmentScore = item.alignmentScore; let newAlignmentParticipants = item.alignmentParticipantsCount;
                                if (item.hasAlignmentSurvey && (item.alignmentScore === 0 || item.alignmentParticipantsCount <= 5)) {
                                    newAlignmentScore = generateAlignmentScore(); newAlignmentParticipants = rand(6, 25);
                                } else if (item.alignmentScore > 5) {
                                    newAlignmentScore = generateAlignmentScore(); if(item.alignmentParticipantsCount <= 5) newAlignmentParticipants = rand(6,25);
                                } else if (typeof item.alignmentScore === 'number' && item.alignmentScore > 0) {
                                        newAlignmentScore = parseFloat(item.alignmentScore.toFixed(2));
                                        if(item.hasAlignmentSurvey && item.alignmentParticipantsCount <= 5) newAlignmentParticipants = rand(6, Math.max(6, item.alignmentParticipantsCount + rand(3,10)));
                                }
                                item.alignmentScore = newAlignmentScore; item.alignmentParticipantsCount = newAlignmentParticipants;
                                injectedCampaignDataStore[currentCampaignId] = {
                                    visitors: item.visitors, engagedUsers: item.engagedUsers, potentialVisitors: item.potentialVisitors,
                                    alignmentScore: item.alignmentScore, alignmentParticipantsCount: item.alignmentParticipantsCount,
                                    normVisPercent: normVisPercent, normEngPercent: normEngPercent, postSurveyAnswers: {}
                                };
                            });
                        }
                        break;
                    case 'CAMPAIGN_STATS':
                        if (campaignId && data) {
                            const stored = injectedCampaignDataStore[campaignId]; const potential = data.potentialVisitors > 0 ? data.potentialVisitors : (Math.max(data.visitors, data.engagedUsers, 1));
                            if (stored) { data.visitors = stored.visitors; data.engagedUsers = stored.engagedUsers; }
                            else {
                                let visPercent = (data.visitors / potential) * 100; let engPercent = (data.engagedUsers / potential) * 100;
                                let normVisPercent = normalisePercentage(visPercent); let normEngPercent = normalisePercentage(engPercent);
                                if (normEngPercent > normVisPercent && normVisPercent < 80) normEngPercent = rand(Math.max(10, normVisPercent - 20), normVisPercent);
                                [normVisPercent, normEngPercent] = harmonisePercentagePair(normVisPercent, normEngPercent);
                                data.visitors = Math.round((normVisPercent / 100) * potential); data.engagedUsers = Math.round((normEngPercent / 100) * potential);
                                if (potential > 0) { data.visitors = Math.min(data.visitors, potential); if (data.visitors === potential) data.visitors = Math.max(0, potential - rand(1, Math.max(1, Math.floor(potential * 0.03)) + 1 )); }
                                data.engagedUsers = Math.min(data.engagedUsers, data.visitors); data.visitors = Math.max(0, data.visitors); data.engagedUsers = Math.max(0, data.engagedUsers);
                                injectedCampaignDataStore[campaignId] = { ...injectedCampaignDataStore[campaignId], visitors: data.visitors, engagedUsers: data.engagedUsers, potentialVisitors: potential, normVisPercent, normEngPercent };
                            }
                        }
                        break;
                    case 'ALIGNMENT_RESULTS_OVERALL':
                        if (campaignId && data) {
                            const stored = injectedCampaignDataStore[campaignId]; let finalScore, finalParticipants;
                            if (stored && typeof stored.alignmentScore === 'number') {
                                finalScore = stored.alignmentScore; finalParticipants = stored.alignmentParticipantsCount > 5 ? stored.alignmentParticipantsCount : rand(6,25);
                            } else { finalScore = generateAlignmentScore(); finalParticipants = rand(6, 25); }
                            data.averageScore = finalScore; data.participantCount = finalParticipants; data.answers = generateAlignmentAnswers(finalScore, finalParticipants);
                            injectedCampaignDataStore[campaignId] = { ...injectedCampaignDataStore[campaignId], alignmentScore: finalScore, alignmentParticipantsCount: finalParticipants };
                        }
                        break;
                    case 'ALIGNMENT_RESULTS_PER_CONTENT':
                        if (campaignId && data && Array.isArray(data.contents)) {
                            const storedCampAlign = injectedCampaignDataStore[campaignId];
                            const overallCampaignScore = storedCampAlign?.alignmentScore || generateAlignmentScore();
                            let overallCampaignParticipants = storedCampAlign?.alignmentParticipantsCount;
                            if (!overallCampaignParticipants || overallCampaignParticipants <= 5) {
                                overallCampaignParticipants = rand(6,25);
                                if(storedCampAlign) injectedCampaignDataStore[campaignId].alignmentParticipantsCount = overallCampaignParticipants;
                            }

                            data.contents.forEach(content => {
                                if (content.surveyReferenceStatus === "enabled") {
                                    const postId = content.contentId;
                                    content.participantCount = injectedCampaignDataStore[campaignId]?.postSurveyAnswers?.[postId] || rand(1,5);

                                    if (content.participantCount > 0) {
                                        const postAvgScore = parseFloat(Math.min(5.0, Math.max(0.0, overallCampaignScore + randFloat(-0.4, 0.4, 2))).toFixed(2));
                                        content.answers = generateAlignmentAnswers(postAvgScore, content.participantCount);
                                    } else { content.answers = null; }
                                } else { content.participantCount = 0; content.answers = null; }
                            });
                        }
                        break;
                    case 'ENGAGEMENT_GROUPS':
                        if (data.ranking && Array.isArray(data.ranking)) {
                            data.ranking.forEach(group => {
                                let groupPotential = group.visitors;
                                if (groupPotential > 0) {
                                    let engPctOfVis = rand(30, 95);
                                    group.engagers = Math.round((engPctOfVis / 100) * group.visitors);
                                    group.engagers = Math.min(group.engagers, group.visitors - (group.visitors > 0 ? 1 : 0));
                                    group.engagers = Math.max(0, group.engagers);
                                } else { group.engagers = 0; }
                            });
                        }
                        break;
                    case 'VISIBILITY_USER_GROUP_RANKING':
                        if (data.ranking && Array.isArray(data.ranking)) {
                            data.ranking.forEach(group => {
                                const potential = group.potentialVisitors > 0 ? group.potentialVisitors : group.visitors;
                                if (potential > 0) {
                                    let visPct = normalisePercentage(rand(20,100));
                                    group.visitors = Math.round((visPct/100) * potential);
                                    group.visitors = Math.min(group.visitors, potential);
                                    if (group.visitors === potential && potential > 0) {
                                        group.visitors = Math.max(0, potential - rand(1, Math.max(1, Math.floor(potential*0.02))+1));
                                    }
                                    group.visitors = Math.max(0, group.visitors);
                                } else { group.visitors = 0;}
                                if (group.potentialVisitors === 0 && group.visitors > 0) {
                                    group.potentialVisitors = group.visitors + rand(0, Math.floor(group.visitors * 0.2));
                                }
                            });
                        }
                        break;
                    case 'SENTIMENT_OVERALL':
                        if (campaignId && data && data.data) {
                            const stored = injectedCampaignDataStore[campaignId];
                            let baseCommenters = stored?.engagedUsers > 0 ? Math.floor(stored.engagedUsers * randFloat(0.05, 0.2)) : rand(5, 20);
                            baseCommenters = Math.max(5, baseCommenters);

                            data.data.uniqueCommenterCount = baseCommenters;
                            data.data.labelPositiveCount = rand(Math.floor(baseCommenters * 0.2), baseCommenters);
                            data.data.labelNegativeCount = rand(0, Math.floor(baseCommenters * 0.3));
                            data.data.labelNeutralCount = rand(0, Math.floor(baseCommenters * 0.4));
                            const sumLabels = data.data.labelPositiveCount + data.data.labelNegativeCount + data.data.labelNeutralCount;
                            if (sumLabels === 0 && data.data.uniqueCommenterCount > 0) data.data.labelPositiveCount = data.data.uniqueCommenterCount;
                            else if (sumLabels > data.data.uniqueCommenterCount) {
                                data.data.labelPositiveCount = Math.floor(data.data.labelPositiveCount * data.data.uniqueCommenterCount / sumLabels);
                                data.data.labelNegativeCount = Math.floor(data.data.labelNegativeCount * data.data.uniqueCommenterCount / sumLabels);
                                data.data.labelNeutralCount = Math.max(0, data.data.uniqueCommenterCount - data.data.labelPositiveCount - data.data.labelNegativeCount);
                            }
                        }
                        break;
                    case 'SENTIMENT_TIMESERIES':
                        if (data.data && Array.isArray(data.data)) {
                            const overallEngaged = injectedCampaignDataStore[campaignId]?.engagedUsers || rand(20,100);
                            if (data.data.length <= 3 && campaignId && (injectedCampaignDataStore[campaignId]?.visitors > 0 || data.data.some(d => d.labelPositiveCount > 0))) {
                                const numDaysToGenerate = rand(15, 30);
                                const newTimeSeries = []; let startDate = new Date();
                                if (data.data.length > 0 && data.data[0].date) { startDate = new Date(data.data[0].date); startDate.setDate(startDate.getDate() - Math.floor(numDaysToGenerate / 2));}
                                else { startDate.setDate(startDate.getDate() - numDaysToGenerate + 1); }
                                for (let i = 0; i < numDaysToGenerate; i++) {
                                    const currentDate = new Date(startDate); currentDate.setDate(startDate.getDate() + i);
                                    const dailyMaxComments = Math.max(1, Math.ceil(overallEngaged / numDaysToGenerate * randFloat(0.02, 0.1)));
                                    const totalSentimentsToday = rand(0, dailyMaxComments);
                                    let pos = rand(0, totalSentimentsToday); let neg = rand(0, Math.max(0,totalSentimentsToday - pos)); let neu = Math.max(0, totalSentimentsToday - pos - neg);
                                    newTimeSeries.push({ date: currentDate.toISOString().split('T')[0] + "T00:00:00Z", labelPositiveCount: pos, labelNegativeCount: neg, labelNeutralCount: neu });
                                }
                                data.data = newTimeSeries.sort((a,b) => new Date(a.date) - new Date(b.date));
                            } else {
                                data.data.forEach(dp => {
                                    const dailyMax = Math.max(1, Math.ceil(overallEngaged / data.data.length * 0.1));
                                    dp.labelPositiveCount = rand(0, Math.max(dp.labelPositiveCount, rand(0,dailyMax)) );
                                    dp.labelNegativeCount = rand(0, Math.max(dp.labelNegativeCount, rand(0,Math.floor(dailyMax*0.5))));
                                    dp.labelNeutralCount = rand(0, Math.max(dp.labelNeutralCount, rand(0,Math.floor(dailyMax*0.5))));
                                });
                            }
                        }
                        break;
                    case 'VISIBILITY_TIMESERIES':
                        if (data.timeseries && Array.isArray(data.timeseries)) {
                            let overallMaxSeen = injectedCampaignDataStore[campaignId]?.visitors || 0;
                            if(overallMaxSeen === 0 && data.timeseries.length > 0) overallMaxSeen = Math.max(...data.timeseries.map(ts => ts.seenAtLeastOne), 40);
                            data.timeseries.forEach(ts => {
                                const dayMaxPotential = rand(Math.floor(overallMaxSeen * 0.3), overallMaxSeen);
                                ts.seenAtLeastOne = rand(Math.floor(dayMaxPotential * 0.1), dayMaxPotential);
                                ts.seenAtLeastTwo = rand(0, Math.floor(ts.seenAtLeastOne * randFloat(0.1, 0.6)));
                                ts.seenAtLeastThree = rand(0, Math.floor(ts.seenAtLeastTwo * randFloat(0.05, 0.5)));
                            });
                        }
                        break;
                    case 'POST_STATS':
                        if (campaignId && data && Array.isArray(data.posts)) {
                            const campData = injectedCampaignDataStore[campaignId] || {};
                            const campOverallPotential = campData.potentialVisitors || 0;
                            const campOverallVisitors = campData.visitors || 0;
                            const campOverallAlignScore = campData.alignmentScore;
                            const numPosts = data.posts.length || 1;

                            if (!injectedCampaignDataStore[campaignId]) injectedCampaignDataStore[campaignId] = {};
                            if (!injectedCampaignDataStore[campaignId].postSurveyAnswers) injectedCampaignDataStore[campaignId].postSurveyAnswers = {};

                            data.posts.forEach(post => {
                                let postPotential = Math.max(1, Math.min(post.visitors, campOverallPotential > 0 ? Math.ceil(campOverallPotential / numPosts * randFloat(0.5, 1.5)) : rand(10,50) ));
                                if (campOverallVisitors > 0) postPotential = Math.min(postPotential, Math.ceil(campOverallVisitors * randFloat(0.3, 0.8)));
                                let postVisPercent = normalisePercentage(rand(20, 80)); let postEngPercent = normalisePercentage(rand(10, postVisPercent));
                                [postVisPercent, postEngPercent] = harmonisePercentagePair(postVisPercent, postEngPercent);
                                post.visitors = Math.round((postVisPercent / 100) * postPotential); post.engagedUsers = Math.round((postEngPercent / 100) * postPotential);
                                post.visitors = Math.min(post.visitors, postPotential); if (post.visitors === postPotential && postPotential > 0) post.visitors = Math.max(0, postPotential -1);
                                post.engagedUsers = Math.min(post.engagedUsers, post.visitors);
                                post.visitors = Math.max(0, post.visitors); post.engagedUsers = Math.max(0, post.engagedUsers);

                                post.visits = post.visitors + rand(0, Math.floor(post.visitors * 1.5));
                                post.reactions = rand(0, Math.floor(post.engagedUsers * 0.5));
                                post.comments = rand(0, Math.floor(post.engagedUsers * 0.25));
                                post.shares = rand(0, Math.floor(post.engagedUsers * 0.1));

                                let postGetsSurveyActivity = false;
                                if (typeof campOverallAlignScore === 'number' && campOverallAlignScore > 0) { if (Math.random() < 0.65) postGetsSurveyActivity = true; }
                                else { if (Math.random() < 0.10) postGetsSurveyActivity = true; }

                                if (postGetsSurveyActivity) {
                                    post.surveyAnswers = rand(1, 10);
                                    post.surveyAnswers = Math.min(post.surveyAnswers, Math.max(post.engagedUsers, 1));
                                    post.surveyAnswers = Math.max(0, post.surveyAnswers);
                                } else { post.surveyAnswers = 0; }
                                injectedCampaignDataStore[campaignId].postSurveyAnswers[post.postId] = post.surveyAnswers;
                            });
                        }
                        break;
                    case 'CAMPAIGN_INFO':
                        console.log(INJECTED_LOG_PREFIX + " Passing CAMPAIGN_INFO for " + campaignId + ". No mods.");
                        break;
                }
                // --- End of switch ---
                return new Response(JSON.stringify(data), { status: response.status, statusText: response.statusText, headers: response.headers });
            } catch (err) {
                console.error(INJECTED_LOG_PREFIX, 'Error during interception for', url, '(' + matchedEndpointType + '):', err);
                return pageContextOriginalFetch.apply(this, args);
            }
        }
        return pageContextOriginalFetch.apply(this, args);
    };

    window.fetch = injectedCustomFetch;
    window.__REPLIFY_CAMPAIGNS_FETCH_APPLIED__ = true;
    console.log(INJECTED_LOG_PREFIX, 'window.fetch successfully overridden by injected script.');

    window.__REPLIFY_REVERT_CAMPAIGNS_FETCH__ = function() {
        if (window.fetch === injectedCustomFetch) {
            window.fetch = pageContextOriginalFetch;
            delete window.__REPLIFY_CAMPAIGNS_FETCH_APPLIED__;
            delete window.__REPLIFY_REVERT_CAMPAIGNS_FETCH__;
            console.log(INJECTED_LOG_PREFIX, 'Fetch restored to page original by revert function.');
            return true;
        }
        console.warn(INJECTED_LOG_PREFIX, 'Revert called, but fetch was not the injected one or already reverted.');
        return false;
    };
})();