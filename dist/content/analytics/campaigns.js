// content/analytics/campaigns.js
(function () {
  const INJECTED_LOG_PREFIX = "[Replify InjectedCampaignsPatch]:";

  if (window.__REPLIFY_CAMPAIGNS_FETCH_APPLIED__) {
    return;
  }

  const pageContextOriginalFetch = window.fetch;
  if (!pageContextOriginalFetch) {
    console.error(
      INJECTED_LOG_PREFIX,
      "CRITICAL: window.fetch is null/undefined!"
    );
    return;
  }

  let injectedCampaignDataStore = {};

  const TARGET_URLS = {
    SPACES_SEARCH: "/api/spaces/search",
    RANKINGS: "/api/branch/analytics/campaigns/rankings",
    CAMPAIGN_STATS: "/api/branch/analytics/campaigns/stats",
    CAMPAIGN_INFO: "/api/campaigns/",
    ALIGNMENT_RESULTS_OVERALL: "/api/alignment-survey/results/overall",
    ALIGNMENT_RESULTS_PER_CONTENT: "/api/alignment-survey/results/per-content",
    ALIGNMENT_SURVEY_CONFIG: "/api/alignment-survey/surveys",
    ENGAGEMENT_GROUPS:
      "/api/branch/analytics/campaigns/engagement/user-group-ranking",
    VISIBILITY_USER_GROUP_RANKING:
      "/api/branch/analytics/campaigns/visibility/user-group-ranking",
    VISIBILITY_CONTENT_RANKING:
      "/api/branch/analytics/campaigns/visibility/content-ranking",
    SENTIMENT_TIMESERIES: "/api/community-insights/campaigns/",
    SENTIMENT_OVERALL: "/api/community-insights/campaigns/",
    VISIBILITY_TIMESERIES:
      "/api/branch/analytics/campaigns/visibility/timeseries",
    POST_STATS: "/api/branch/analytics/campaigns/posts/stats",
    ENGAGEMENT_TIMESERIES:
      "/api/branch/analytics/campaigns/engagement/timeseries",
    VISIBILITY_ACCESSORS:
      "/api/branch/analytics/campaigns/visibility/accessors",
    SENTIMENT_DATA: "/api/community-insights/campaigns/",
    CAMPAIGN_REFERENCES: "/api/campaigns/",
  };

  const rand = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };
  const randFloat = (min, max, decimals) =>
    parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
  const MAX_DESIRED_PCT = 88;
  const MIN_PCT_FLOOR_INPUTS = 5;

  const normalisePercentage = (inputValue, cap = MAX_DESIRED_PCT) => {
    let n = parseFloat(inputValue);
    if (isNaN(n) || n < 0) n = 0;
    if (n > 100) n = 100;
    let newPct;
    if (n >= 90) {
      newPct = rand(Math.min(cap - 30, 50), Math.min(cap - 5, 65));
    } else if (n >= 75) {
      newPct = rand(Math.min(cap - 35, 45), Math.min(cap - 10, 60));
    } else if (n >= 50) {
      newPct = rand(Math.min(cap - 40, 35), Math.min(cap - 15, 55));
    } else if (n >= 25) {
      newPct = rand(
        Math.min(cap - 45, MIN_PCT_FLOOR_INPUTS + 5),
        Math.min(cap - 20, 45)
      );
    } else {
      newPct = rand(
        MIN_PCT_FLOOR_INPUTS,
        Math.min(cap - 50, Math.max(MIN_PCT_FLOOR_INPUTS, n + rand(0, 10)))
      );
    }
    let finalPct = Math.round(Math.min(Math.max(0, newPct), cap - 1));
    return Math.max(MIN_PCT_FLOOR_INPUTS, finalPct);
  };
  const harmonisePercentagePair = (
    visPctInput,
    engPctInput,
    cap = MAX_DESIRED_PCT
  ) => {
    let visPct = parseFloat(visPctInput);
    let engPct = parseFloat(engPctInput);
    if (isNaN(visPct))
      visPct = rand(Math.max(MIN_PCT_FLOOR_INPUTS, cap - 25), cap - 10);
    if (isNaN(engPct))
      engPct = rand(Math.max(MIN_PCT_FLOOR_INPUTS, cap - 35), cap - 20);
    visPct = Math.round(Math.min(Math.max(0, visPct), cap));
    engPct = Math.round(Math.min(Math.max(0, engPct), cap));
    const MIN_VIS_LEAD = rand(4, 9);
    const MAX_ALLOWED_SIMILARITY_DIFF = rand(12, 22);
    if (visPct < engPct + MIN_VIS_LEAD) {
      visPct = Math.min(cap, engPct + MIN_VIS_LEAD);
    }
    if (engPct > visPct) {
      engPct = Math.max(0, visPct - MIN_VIS_LEAD);
    }
    if (visPct - engPct > MAX_ALLOWED_SIMILARITY_DIFF) {
      visPct =
        engPct +
        MAX_ALLOWED_SIMILARITY_DIFF -
        rand(0, Math.floor(MAX_ALLOWED_SIMILARITY_DIFF * 0.15));
    }
    visPct = Math.round(Math.min(Math.max(0, visPct), cap));
    engPct = Math.round(Math.min(Math.max(0, engPct), cap));
    if (visPct >= cap)
      visPct = cap - rand(1, Math.min(3, cap > 1 ? cap - 1 : 1));
    if (engPct >= cap)
      engPct = cap - rand(1, Math.min(3, cap > 1 ? cap - 1 : 1));
    visPct = Math.max(0, visPct);
    engPct = Math.max(0, engPct);
    if (engPct >= visPct && visPct > 0) {
      engPct = visPct - rand(1, 2);
      if (engPct < 0) engPct = 0;
    } else if (visPct <= 0) {
      visPct = 0;
      engPct = 0;
    }
    if (visPct >= 100) visPct = MAX_DESIRED_PCT - rand(2, 5);
    if (engPct >= 100) engPct = MAX_DESIRED_PCT - rand(2, 5);
    if (engPct > visPct) engPct = Math.max(0, visPct - 1);
    return [Math.max(0, visPct), Math.max(0, engPct)];
  };
  const generateAlignmentScore = () => {
    const r = Math.random();
    let score;
    if (r < 0.7) score = randFloat(4.09, 5.0, 2);
    else if (r < 0.9) score = randFloat(3.61, 4.01, 2);
    else score = randFloat(3.01, 3.55, 2);
    return parseFloat(Math.min(5.0, Math.max(3.0, score)).toFixed(2));
  };
  function generateAlignmentAnswers(avgScore, numParticipants) {
    const answers = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (numParticipants <= 0) return answers;
    const targetVote = Math.round(avgScore);
    for (let i = 0; i < numParticipants; i++) {
      let vote;
      const r = Math.random();
      if (r < 0.6)
        vote = rand(Math.max(1, targetVote - 1), Math.min(5, targetVote + 1));
      else if (r < 0.85) {
        if (avgScore > 3.5) vote = rand(Math.max(1, targetVote - 2), 5);
        else vote = rand(1, Math.min(5, targetVote + 2));
      } else vote = rand(1, 5);
      answers[String(vote)]++;
    }
    // Correct for any rounding issues to ensure total votes match participant count
    let currentTotal = Object.values(answers).reduce((sum, val) => sum + val, 0);
    if(currentTotal !== numParticipants) {
        answers[String(targetVote)] += (numParticipants - currentTotal);
    }
    return answers;
  }
  function extractCampaignIdFromUrl(url, paramName = "campaignId") {
    try {
      const urlObj = new URL(url, window.location.origin);
      let id = urlObj.searchParams.get(paramName);
      if (id) return id;
      const pathParts = urlObj.pathname.split("/");
      const campaignsIndex = pathParts.indexOf("campaigns");
      if (campaignsIndex !== -1 && pathParts.length > campaignsIndex + 1) {
        const potentialId = pathParts[campaignsIndex + 1];
        if (/^[a-f0-9]{24}$/i.test(potentialId)) {
          if (
            campaignsIndex + 2 >= pathParts.length ||
            [
              "comments",
              "stats",
              "rankings",
              "results",
              "surveys",
              "timeseries",
              "references",
              "accessors",
              "content-ranking",
            ].includes(pathParts[campaignsIndex + 2]) ||
            /^[a-f0-9]{24}$/i.test(pathParts[campaignsIndex + 2]) === false
          ) {
            return potentialId;
          }
        }
      }
    } catch (e) {
      /* silent fail */
    }
    return null;
  }

  const injectedCustomFetch = async function (...args) {
    const resource = args[0];
    let url = typeof resource === "string" ? resource : resource.url;
    let matchedEndpointType = null;
    let campaignId = null;

    if (typeof url === "string" && url.includes("/api/")) {
      if (url.includes(TARGET_URLS.SPACES_SEARCH)) {
        matchedEndpointType = "SPACES_SEARCH";
      } else
      if (url.includes(TARGET_URLS.VISIBILITY_CONTENT_RANKING)) {
        matchedEndpointType = "VISIBILITY_CONTENT_RANKING";
        campaignId = extractCampaignIdFromUrl(url);
      } else if (url.includes(TARGET_URLS.RANKINGS))
        matchedEndpointType = "RANKINGS";
      else if (url.includes(TARGET_URLS.ENGAGEMENT_TIMESERIES)) {
        matchedEndpointType = "ENGAGEMENT_TIMESERIES";
        campaignId = extractCampaignIdFromUrl(url);
      } else if (url.includes(TARGET_URLS.VISIBILITY_TIMESERIES)) {
        matchedEndpointType = "VISIBILITY_TIMESERIES";
        campaignId = extractCampaignIdFromUrl(url);
      } else if (url.includes(TARGET_URLS.CAMPAIGN_STATS)) {
        matchedEndpointType = "CAMPAIGN_STATS";
        campaignId = extractCampaignIdFromUrl(url);
      } else if (url.includes(TARGET_URLS.ALIGNMENT_RESULTS_PER_CONTENT)) {
        matchedEndpointType = "ALIGNMENT_RESULTS_PER_CONTENT";
        campaignId = extractCampaignIdFromUrl(url);
      } else if (url.includes(TARGET_URLS.ALIGNMENT_RESULTS_OVERALL)) {
        matchedEndpointType = "ALIGNMENT_RESULTS_OVERALL";
        campaignId = extractCampaignIdFromUrl(url);
      } else if (url.includes(TARGET_URLS.ALIGNMENT_SURVEY_CONFIG)) {
        matchedEndpointType = "ALIGNMENT_SURVEY_CONFIG";
      } else if (url.includes(TARGET_URLS.ENGAGEMENT_GROUPS)) {
        matchedEndpointType = "ENGAGEMENT_GROUPS";
        campaignId = extractCampaignIdFromUrl(url);
      } else if (url.includes(TARGET_URLS.VISIBILITY_USER_GROUP_RANKING)) {
        matchedEndpointType = "VISIBILITY_USER_GROUP_RANKING";
        campaignId = extractCampaignIdFromUrl(url);
      } else if (
        url.includes(TARGET_URLS.SENTIMENT_DATA) &&
        url.includes("/comments/sentiment-data")
      ) {
        matchedEndpointType = "SENTIMENT_DATA";
        campaignId = extractCampaignIdFromUrl(url);
      } else if (
        url.includes(TARGET_URLS.SENTIMENT_OVERALL) &&
        url.includes("/comments/sentiment-labels/overall")
      ) {
        matchedEndpointType = "SENTIMENT_OVERALL";
        campaignId = extractCampaignIdFromUrl(url);
      } else if (
        url.includes(TARGET_URLS.SENTIMENT_TIMESERIES) &&
        url.includes("/comments/sentiment-labels/time-series")
      ) {
        matchedEndpointType = "SENTIMENT_TIMESERIES";
        campaignId = extractCampaignIdFromUrl(url);
      } else if (url.includes(TARGET_URLS.POST_STATS)) {
        matchedEndpointType = "POST_STATS";
        campaignId = extractCampaignIdFromUrl(url);
      } else if (url.includes(TARGET_URLS.VISIBILITY_ACCESSORS)) {
        matchedEndpointType = "VISIBILITY_ACCESSORS";
        campaignId = extractCampaignIdFromUrl(url);
      } else if (
        url.includes(TARGET_URLS.CAMPAIGN_REFERENCES) &&
        url.includes("/references")
      ) {
        matchedEndpointType = "CAMPAIGN_REFERENCES";
        campaignId = extractCampaignIdFromUrl(url);
      } else if (url.includes(TARGET_URLS.CAMPAIGN_INFO)) {
        const potentialId = extractCampaignIdFromUrl(url);
        if (
          potentialId &&
          url.endsWith(TARGET_URLS.CAMPAIGN_INFO + potentialId)
        ) {
          matchedEndpointType = "CAMPAIGN_INFO";
          campaignId = potentialId;
        }
      }
    }

    if (matchedEndpointType) {
      try {
        const response = await pageContextOriginalFetch.apply(this, args);
        if (
          !response.ok ||
          !response.headers.get("content-type")?.includes("application/json")
        ) {
          return response;
        }
        const clonedResponse = response.clone();
        const data = await clonedResponse.json();

        switch (matchedEndpointType) {
            // highlight-start
            case "SPACES_SEARCH":
                // This endpoint should return spaces, not campaign rankings.
                // The provided data shows that this endpoint can return a small or large number of spaces.
                if (!data.entries || data.entries.length === 0) {
                    console.log(INJECTED_LOG_PREFIX, "Generating fake data for SPACES_SEARCH.");
                    const fakeEntries = [];
                    const spaceNames = ["All employees", "Marketing Germany", "Marketing US", "Product Team", "[LOCATION] Berlin", "Human Resources"];
                    const sections = url.includes("APP_INTRANET") ? ["APP_INTRANET"] : ["EMAIL"];
                    if (Math.random() > 0.5) sections.push(url.includes("APP_INTRANET") ? "EMAIL" : "APP_INTRANET");

                    spaceNames.forEach(name => {
                        fakeEntries.push({
                            data: {
                                id: `fakeSpaceId_${rand(1000,9999)}`,
                                name: name,
                                parentId: null,
                                childIds: [],
                                adminIDs: [`fakeAdminId_${rand(1000,9999)}`],
                                accessorIDs: [`fakeAccessorId_${rand(1000,9999)}`],
                                sections: sections
                            }
                        });
                    });
                    data.entries = fakeEntries;
                    data.total = fakeEntries.length;
                }
                break;
            // highlight-end
            case "CAMPAIGN_REFERENCES":
                if (campaignId && data.data && Array.isArray(data.data)) {
                  const allPostIds = data.data
                    .filter((ref) => ref.sourceType === "POST")
                    .map((ref) => ref.sourceId);
                  if (!injectedCampaignDataStore[campaignId])
                    injectedCampaignDataStore[campaignId] = {};
                  injectedCampaignDataStore[campaignId].allPostIds = allPostIds;
                }
                break;
    
              case "ALIGNMENT_RESULTS_PER_CONTENT":
                if (campaignId && data && Array.isArray(data.contents)) {
                  const storedCampData = injectedCampaignDataStore[campaignId];
                  const allPostIds = storedCampData?.allPostIds || [];
    
                  if (data.contents.length === 0 && allPostIds.length > 0) {
                    console.log(
                      INJECTED_LOG_PREFIX,
                      "Generating full alignment results for campaign " + campaignId
                    );
                    const overallCampaignScore =
                      storedCampData?.alignmentScore || generateAlignmentScore();
                    if (!injectedCampaignDataStore[campaignId].postSurveyAnswers)
                      injectedCampaignDataStore[campaignId].postSurveyAnswers = {};
    
                    allPostIds.forEach((postId) => {
                      const participantCount = rand(5, 15); // Adjusted to be more realistic per post
                      const postAvgScore = parseFloat(
                        Math.min(
                          5.0,
                          Math.max(
                            0.0,
                            overallCampaignScore + randFloat(-0.4, 0.4, 2)
                          )
                        ).toFixed(2)
                      );
                      data.contents.push({
                        contentId: postId,
                        contentType: "post",
                        surveyReferenceStatus: "enabled",
                        participantCount: participantCount,
                        answers: generateAlignmentAnswers(
                          postAvgScore,
                          participantCount
                        ),
                      });
                      injectedCampaignDataStore[campaignId].postSurveyAnswers[
                        postId
                      ] = participantCount;
                    });
                  }
                }
                break;
    
              case "POST_STATS":
                // highlight-start
                if (campaignId && data && Array.isArray(data.posts)) {
                    if (data.posts.length === 0 && injectedCampaignDataStore[campaignId]?.allPostIds?.length > 0) {
                        console.log(INJECTED_LOG_PREFIX, "POST_STATS is empty. Generating fake posts from stored references.");
                        const postIdsToGenerate = injectedCampaignDataStore[campaignId].allPostIds;
                        postIdsToGenerate.forEach(postId => {
                            data.posts.push({
                                postId: postId,
                                channelId: `fakeChannelId_${rand(100,999)}`,
                                postTitle: "A Dynamically Generated Post Title",
                                postPublishedAt: new Date(new Date() - rand(1, 30) * 24 * 60 * 60 * 1000).toISOString(),
                                visitors: 0, engagedUsers: 0, visits: 0, reactions: 0, comments: 0, shares: 0, surveyAnswers: 0,
                            });
                        });
                    }
                // highlight-end
                  const postSurveyAnswers =
                    injectedCampaignDataStore[campaignId]?.postSurveyAnswers || {};
                  data.posts.forEach((post) => {
                    post.surveyAnswers = postSurveyAnswers[post.postId] || 0;
                    const potential =
                      injectedCampaignDataStore[campaignId]?.potentialVisitors ||
                      rand(80, 100); // Use a realistic potential audience
                    let [normVisPercent, normEngPercent] = harmonisePercentagePair(
                      rand(5, 80), // Posts can have low visibility
                      rand(5, 75)
                    );
                    post.visitors = Math.min(
                      potential,
                      Math.round(potential * (normVisPercent / 100))
                    );
                    post.engagedUsers = Math.min(
                      post.visitors,
                      Math.round(post.visitors * (normEngPercent / 100))
                    );
                    // Based on reference: visits is often a multiple of visitors
                    post.visits = post.visitors * rand(2, 12) + rand (0, 10);
                    // Based on reference: reactions can be higher than engaged users
                    post.reactions = Math.round(post.engagedUsers * randFloat(0.8, 3.0));
                    // Based on reference: comments are a fraction of engaged users
                    post.comments = Math.round(post.engagedUsers * randFloat(0.1, 0.6));
                    // Based on reference: shares are rare
                    post.shares = Math.random() < 0.1 ? rand(0, 3) : 0;
                  });
                }
                break;
    
              case "ENGAGEMENT_TIMESERIES":
                case "VISIBILITY_TIMESERIES":
                  // highlight-start
                  // The reference data is CUMULATIVE. The numbers must only go up or stay the same.
                  const isCumulative = data.timeseries?.length > 1 && data.timeseries.slice(1).every((v, i) => (v.visitors || v.seenAtLeastOne) >= (data.timeseries[i].visitors || data.timeseries[i].seenAtLeastOne));
                  
                  if ((!data.timeseries || data.timeseries.length < 15) || !isCumulative) {
                    console.log(INJECTED_LOG_PREFIX, "Regenerating as a realistic CUMULATIVE timeseries for " + matchedEndpointType);
                    
                    const overallStats = injectedCampaignDataStore[campaignId] || {};
                    const totalVisitors = overallStats.visitors || rand(50, 80);
                    const totalEngaged = overallStats.engagedUsers || Math.round(totalVisitors * randFloat(0.6, 0.9));
                    const seenTwoTotal = Math.round(totalVisitors * randFloat(0.5, 0.8));
                    const seenThreeTotal = Math.round(seenTwoTotal * randFloat(0.4, 0.9));

                    const numPoints = 19; // Match the number of months in the reference data
                    const newSeries = [];
                    let date = new Date();
                    date.setMonth(date.getMonth() - numPoints + 1);
                    
                    let last = { visitors: 0, engagedUsers: 0, seenAtLeastOne: 0, seenAtLeastTwo: 0, seenAtLeastThree: 0 };

                    for (let i = 0; i < numPoints; i++) {
                      date.setMonth(date.getMonth() + 1);
                      const entry = { date: date.toISOString() };
                      const progress = (i + 1) / numPoints; // 0 to 1 scale
                      
                      // Use progress to make the growth cumulative and non-linear
                      const growthFactor = Math.pow(progress, 0.7);

                      if (matchedEndpointType === "VISIBILITY_TIMESERIES") {
                        const seenOne = Math.min(totalVisitors, last.seenAtLeastOne + rand(0, Math.ceil((totalVisitors - last.seenAtLeastOne) * 0.3)));
                        const seenTwo = Math.min(seenTwoTotal, last.seenAtLeastTwo + rand(0, Math.ceil((seenTwoTotal - last.seenAtLeastTwo) * 0.3)));
                        const seenThree = Math.min(seenThreeTotal, last.seenAtLeastThree + rand(0, Math.ceil((seenThreeTotal - last.seenAtLeastThree) * 0.3)));
                        Object.assign(last, { seenAtLeastOne: Math.round(totalVisitors * growthFactor), seenAtLeastTwo: Math.round(seenTwoTotal * growthFactor), seenAtLeastThree: Math.round(seenThreeTotal * growthFactor) });
                      } else { // "ENGAGEMENT_TIMESERIES"
                        Object.assign(last, { visitors: Math.round(totalVisitors * growthFactor), engagedUsers: Math.round(totalEngaged * growthFactor) });
                      }
                      
                      // Ensure values don't decrease
                      last.visitors = Math.max(newSeries[i-1]?.visitors || 0, last.visitors);
                      last.engagedUsers = Math.max(newSeries[i-1]?.engagedUsers || 0, last.engagedUsers);
                      last.seenAtLeastOne = Math.max(newSeries[i-1]?.seenAtLeastOne || 0, last.seenAtLeastOne);
                      last.seenAtLeastTwo = Math.max(newSeries[i-1]?.seenAtLeastTwo || 0, last.seenAtLeastTwo);
                      last.seenAtLeastThree = Math.max(newSeries[i-1]?.seenAtLeastThree || 0, last.seenAtLeastThree);

                      // Ensure engaged <= visitors, etc.
                      last.engagedUsers = Math.min(last.visitors, last.engagedUsers);
                      last.seenAtLeastTwo = Math.min(last.seenAtLeastOne, last.seenAtLeastTwo);
                      last.seenAtLeastThree = Math.min(last.seenAtLeastTwo, last.seenAtLeastThree);

                      newSeries.push({ ...entry, ...last });
                    }
                    data.timeseries = newSeries;
                    data.total = newSeries.length;
                  }
                  // highlight-end
                  break;
              case "VISIBILITY_ACCESSORS":
                if (campaignId && data) {
                    const stored = injectedCampaignDataStore[campaignId];
                    if (stored && stored.potentialVisitors) {
                        data.potentialVisitors = stored.potentialVisitors;
                    } else if (data.potentialVisitors === 0) {
                        data.potentialVisitors = rand(80, 90); // Fallback based on reference data
                    }
                }
                break;              
              case "VISIBILITY_CONTENT_RANKING":
                // highlight-start
                if (!data.rankingSeries || data.rankingSeries.length === 0) {
                    console.log(INJECTED_LOG_PREFIX, "Generating fake data for VISIBILITY_CONTENT_RANKING.");
                    data.rankingSeries = [];
                    // Reference can have very few items, even just one. Let's generate a few.
                    const numItems = rand(1, 5); 
                    for (let i = 0; i < numItems; i++) {
                         // Potential visitors for a single piece of content can be low.
                         const potential = rand(2, 85);
                         const visitors = rand(1, potential);
                         data.rankingSeries.push({
                             contentId: `fakeContentId_${rand(1000,9999)}`,
                             contentType: Math.random() > 0.5 ? 'POST' : 'EMAIL',
                             contentTitle: 'A Generated Content Title',
                             potentialVisitors: potential,
                             visitors: visitors,
                             rate: parseFloat((visitors / potential).toFixed(2))
                         });
                    }
                    data.total = data.rankingSeries.length;
                } else if (data.rankingSeries && Array.isArray(data.rankingSeries)) {
                // highlight-end
                  data.rankingSeries.forEach((item) => {
                    const potential =
                      item.potentialVisitors > 0
                        ? item.potentialVisitors
                        : rand(50, 250);
                    let [normVisPercent] = harmonisePercentagePair(
                      rand(5, 88),
                      rand(5, 80)
                    );
                    item.visitors = Math.min(
                      potential,
                      Math.round(potential * (normVisPercent / 100))
                    );
                    item.potentialVisitors = Math.max(item.visitors, potential);
                  });
                }
                break;    
          case "RANKINGS": 
          // highlight-start
          if (!data.ranking || data.ranking.length === 0) {
                console.log(INJECTED_LOG_PREFIX, "RANKINGS is empty. Generating fake data.");
                data.ranking = [];
                const campaignTitles = ["[Align] - Future & Sustainability", "Change Management", "Company Values", "Employer Branding & Community", "IT Security"];
                 for (let i = 0; i < campaignTitles.length; i++) {
                    const potential = rand(75, 90); // Based on reference data (e.g., 83, 88, 84)
                    const [normVisPercent, normEngPercent] = harmonisePercentagePair(rand(15, 40), rand(10, 25));
                    const visitors = Math.round((normVisPercent / 100) * potential);
                    const engagedUsers = Math.round((normEngPercent / 100) * potential);
                    const hasSurvey = Math.random() > 0.2; // Surveys are common in the reference
                    data.ranking.push({
                        campaignId: `fakeCampaignId_${rand(1000,9999)}`,
                        campaignTitle: campaignTitles[i],
                        campaignGoal: "A generated goal to keep employees informed and engaged about key company initiatives.",
                        visitors: visitors,
                        engagedUsers: Math.min(visitors, engagedUsers),
                        posts: rand(1, 20), // Range from reference data
                        emails: rand(0, 5), // Range from reference data
                        potentialVisitors: potential,
                        alignmentScore: hasSurvey ? generateAlignmentScore() : 0,
                        alignmentParticipantsCount: hasSurvey ? rand(6, 15) : 0, // Lower, more realistic participant count
                        hasAlignmentSurvey: hasSurvey,
                    });
                }
          }
          // highlight-end
          if (data.ranking && Array.isArray(data.ranking)) {
            data.ranking.forEach((item) => {
              const potential =
                item.potentialVisitors > 0
                  ? item.potentialVisitors
                  : Math.max(item.visitors, item.engagedUsers, 1);
              let [normVisPercent, normEngPercent] = harmonisePercentagePair(
                (item.visitors / potential) * 100,
                (item.engagedUsers / potential) * 100,
                MAX_DESIRED_PCT
              );
              item.visitors = Math.round((normVisPercent / 100) * potential);
              item.engagedUsers = Math.round(
                (normEngPercent / 100) * potential
              );
              if (potential > 0) {
                item.visitors = Math.min(item.visitors, potential);
              }
              item.engagedUsers = Math.min(item.engagedUsers, item.visitors);
              let newAlignmentScore = item.alignmentScore,
                newAlignmentParticipants = item.alignmentParticipantsCount;
              if (
                item.hasAlignmentSurvey &&
                (item.alignmentScore === 0 ||
                  item.alignmentParticipantsCount <= 5)
              ) {
                newAlignmentScore = generateAlignmentScore();
                newAlignmentParticipants = rand(6, 25);
              } else if (item.alignmentScore > 5) {
                newAlignmentScore = generateAlignmentScore();
                if (item.alignmentParticipantsCount <= 5)
                  newAlignmentParticipants = rand(6, 25);
              } else if (
                typeof item.alignmentScore === "number" &&
                item.alignmentScore > 0
              ) {
                newAlignmentScore = parseFloat(
                  item.alignmentScore.toFixed(2)
                );
                if (
                  item.hasAlignmentSurvey &&
                  item.alignmentParticipantsCount <= 5
                )
                  newAlignmentParticipants = rand(
                    6,
                    Math.max(6, item.alignmentParticipantsCount + rand(3, 10))
                  );
              }
              item.alignmentScore = newAlignmentScore;
              item.alignmentParticipantsCount = newAlignmentParticipants;
              injectedCampaignDataStore[item.campaignId] = {
                visitors: item.visitors,
                engagedUsers: item.engagedUsers,
                potentialVisitors: item.potentialVisitors,
                alignmentScore: item.alignmentScore,
                alignmentParticipantsCount: item.alignmentParticipantsCount,
                normVisPercent: normVisPercent,
                normEngPercent: normEngPercent,
                postSurveyAnswers: {},
              };
            });
          }
          break;
          case "CAMPAIGN_STATS":
              if (campaignId && data) {
                const potential =
                  data.potentialVisitors > 0
                    ? data.potentialVisitors
                    : Math.max(data.visitors, data.engagedUsers, 1);
                if (
                  injectedCampaignDataStore[campaignId] &&
                  injectedCampaignDataStore[campaignId].visitors !== undefined
                ) {
                  data.visitors = injectedCampaignDataStore[campaignId].visitors;
                  data.engagedUsers =
                    injectedCampaignDataStore[campaignId].engagedUsers;
                } else {
                  let originalVisPercent =
                    potential > 0 ? (data.visitors / potential) * 100 : 0;
                  let originalEngPercent =
                    potential > 0 ? (data.engagedUsers / potential) * 100 : 0;
  
                  let normVisPercent = normalisePercentage(
                    originalVisPercent,
                    MAX_DESIRED_PCT
                  );
                  let normEngPercent = normalisePercentage(
                    originalEngPercent,
                    MAX_DESIRED_PCT
                  );
                  [normVisPercent, normEngPercent] = harmonisePercentagePair(
                    normVisPercent,
                    normEngPercent,
                    MAX_DESIRED_PCT
                  );
  
                  data.visitors = Math.round((normVisPercent / 100) * potential);
                  data.engagedUsers = Math.round(
                    (normEngPercent / 100) * potential
                  );
  
                  if (potential > 0) {
                    data.visitors = Math.min(data.visitors, potential);
                  }
                  data.engagedUsers = Math.min(data.engagedUsers, data.visitors);
                  data.visitors = Math.max(0, data.visitors);
                  data.engagedUsers = Math.max(0, data.engagedUsers);
  
                  injectedCampaignDataStore[campaignId] = {
                    ...injectedCampaignDataStore[campaignId],
                    visitors: data.visitors,
                    engagedUsers: data.engagedUsers,
                    potentialVisitors: potential,
                    normVisPercent,
                    normEngPercent,
                  };
                }
              }
              break;
          case "ALIGNMENT_RESULTS_OVERALL":
          if (campaignId && data) {
            const stored = injectedCampaignDataStore[campaignId];
            let finalScore, finalParticipants;
            if (stored && typeof stored.alignmentScore === "number" && stored.alignmentScore > 0) {
              finalScore = stored.alignmentScore;
              finalParticipants =
                stored.alignmentParticipantsCount > 5
                  ? stored.alignmentParticipantsCount
                  : rand(6, 15);
            } else {
              finalScore = generateAlignmentScore();
              finalParticipants = rand(6, 15);
            }
            data.averageScore = finalScore;
            data.participantCount = finalParticipants;
            data.answers = generateAlignmentAnswers(
              finalScore,
              finalParticipants
            );
            injectedCampaignDataStore[campaignId] = {
              ...injectedCampaignDataStore[campaignId],
              alignmentScore: finalScore,
              alignmentParticipantsCount: finalParticipants,
            };
          }
          break;
        case "ALIGNMENT_RESULTS_PER_CONTENT":
          if (campaignId && data && Array.isArray(data.contents)) {
            const storedCampData = injectedCampaignDataStore[campaignId];
            const allPostsWithSurveyAnswers =
              storedCampData?.postSurveyAnswers || {};
            const existingContentIds = new Set(
              data.contents.map((c) => c.contentId)
            );
            for (const postId in allPostsWithSurveyAnswers) {
              if (
                allPostsWithSurveyAnswers[postId] > 0 &&
                !existingContentIds.has(postId)
              ) {
                data.contents.push({
                  contentId: postId,
                  contentType: "post",
                  surveyReferenceStatus: "enabled",
                  participantCount: 0, 
                  answers: null,
                });
              }
            }
            const overallCampaignScore =
              storedCampData?.alignmentScore || generateAlignmentScore();
            data.contents.forEach((content) => {
              const postId = content.contentId;
              const participantCount =
                allPostsWithSurveyAnswers[postId] ||
                content.participantCount ||
                0;

              content.participantCount = participantCount;
              content.surveyReferenceStatus = "enabled"; 

              if (participantCount > 0) {
                const postAvgScore = parseFloat(
                  Math.min(
                    5.0,
                    Math.max(
                      0.0,
                      overallCampaignScore + randFloat(-0.3, 0.3, 2)
                    )
                  ).toFixed(2)
                );
                content.answers = generateAlignmentAnswers(
                  postAvgScore,
                  content.participantCount
                );
              } else {
                content.answers = null;
              }
            });
          }
          break;
          // highlight-start
          case "ENGAGEMENT_GROUPS":
          case "VISIBILITY_USER_GROUP_RANKING":
              if (!data.ranking || data.ranking.length === 0) {
                   console.log(INJECTED_LOG_PREFIX, `Generating fake data for ${matchedEndpointType}.`);
                   data.ranking = [];
                   // Using group names from the reference data for realism
                   const groupNames = ["Approved Email Recipients", "Location_Berlin (conditional group)", "New Connectees", "Editors Access", "Marketplace", "Vielfalt und Integration"];
                   groupNames.forEach((name, i) => {
                       const potential = rand(5, 15); // Realistic potential visitors per group from reference
                       const visitors = rand(Math.floor(potential * 0.5), potential);
                       const engagers = rand(Math.floor(visitors * 0.4), visitors);
                       const group = {
                           groupId: `fakeGroupId_${rand(1000,9999)}`,
                           groupName: name,
                           potentialVisitors: potential,
                           visitors: visitors
                       };
                       if(matchedEndpointType === 'ENGAGEMENT_GROUPS') {
                           group.engagers = engagers;
                       }
                       data.ranking.push(group);
                   });
              }
              if (data.ranking && Array.isArray(data.ranking)) {
                 if (matchedEndpointType === 'ENGAGEMENT_GROUPS') {
                    data.ranking.forEach((group) => {
                      if (group.visitors > 0) {
                        let engPctOfVis = rand(30, Math.min(95, MAX_DESIRED_PCT - 2)); 
                        group.engagers = Math.round((engPctOfVis / 100) * group.visitors);
                        group.engagers = Math.min(group.engagers, group.visitors); 
                        if (group.engagers === group.visitors && group.visitors > 0) group.engagers = group.visitors - 1;
                        group.engagers = Math.max(0, group.engagers);
                      } else {
                        group.engagers = 0;
                      }
                    });
                 } else { // VISIBILITY_USER_GROUP_RANKING
                    data.ranking.forEach((group) => {
                      const potential = group.potentialVisitors > 0 ? group.potentialVisitors : group.visitors;
                      if (potential > 0) {
                        let visPct = normalisePercentage(rand(MIN_PCT_FLOOR_INPUTS, MAX_DESIRED_PCT), MAX_DESIRED_PCT);
                        group.visitors = Math.round((visPct / 100) * potential);
                        group.visitors = Math.min(group.visitors, potential);
                        if (group.visitors === potential && potential > 0) {
                          group.visitors = Math.max(0, potential - rand(1, Math.max(1, Math.floor(potential * 0.02)) + 1));
                        }
                        group.visitors = Math.max(0, group.visitors);
                      } else {
                        group.visitors = 0;
                      }
                      if (group.potentialVisitors === 0 && group.visitors > 0) {
                        group.potentialVisitors = group.visitors + rand(0, Math.floor(group.visitors * 0.2));
                      }
                    });
                 }
              }
              break;
          // highlight-end
              case "SENTIMENT_OVERALL":
              if (campaignId && data && data.data) {
                const stored = injectedCampaignDataStore[campaignId];
                // Based on reference: uniqueCommenterCount is a small number (e.g., 7)
                let baseCommenters = stored?.engagedUsers > 0
                    ? Math.floor(stored.engagedUsers * randFloat(0.1, 0.4))
                    : rand(2, 10);
                baseCommenters = Math.max(2, baseCommenters);
  
                data.data.uniqueCommenterCount = baseCommenters;
                // Based on reference: Positive > Neutral > Negative
                const totalLabels = rand(baseCommenters, Math.ceil(baseCommenters * 4)); // A commenter can leave multiple labels
                data.data.labelPositiveCount = Math.round(totalLabels * randFloat(0.7, 0.9));
                data.data.labelNegativeCount = Math.round(totalLabels * randFloat(0.0, 0.1));
                data.data.labelNeutralCount = Math.max(0, totalLabels - data.data.labelPositiveCount - data.data.labelNegativeCount);
              }
              break;
            case "SENTIMENT_TIMESERIES":
              if (data.data && Array.isArray(data.data)) {
                const overallEngaged =
                  injectedCampaignDataStore[campaignId]?.engagedUsers ||
                  rand(20, 100);
                // highlight-start
                // Based on reference, sentiment is sparse and not present every day/month.
                if ((!data.data || data.data.length <= 3) && campaignId && (injectedCampaignDataStore[campaignId]?.visitors > 0)) {
                  console.log(INJECTED_LOG_PREFIX, "Generating sparse, realistic sentiment timeseries.");
                  const numPoints = 19;
                  const newTimeSeries = [];
                  let startDate = new Date();
                  startDate.setMonth(startDate.getMonth() - numPoints + 1);

                  for (let i = 0; i < numPoints; i++) {
                    const currentDate = new Date(startDate);
                    currentDate.setMonth(startDate.getMonth() + i);
                    let pos = 0, neg = 0, neu = 0;
                    // Only generate sentiment for a few of the time points
                    if(Math.random() < 0.3) {
                        pos = rand(0, 12);
                        neg = rand(0, 2);
                        neu = rand(0, 3);
                    }
                    newTimeSeries.push({
                      date: currentDate.toISOString(),
                      labelPositiveCount: pos,
                      labelNegativeCount: neg,
                      labelNeutralCount: neu,
                    });
                  }
                  data.data = newTimeSeries.sort((a, b) => new Date(a.date) - new Date(b.date));
                }
                // highlight-end
              }
              break;
            // highlight-start
            case "SENTIMENT_DATA":
                 if(campaignId && (!data.data || data.data.length === 0)) {
                    console.log(INJECTED_LOG_PREFIX, "SENTIMENT_DATA is empty. Generating fake data.");
                    data.data = [];
                    const postIds = injectedCampaignDataStore[campaignId]?.allPostIds || [];
                     postIds.forEach(postId => {
                        // Most posts have no sentiment data.
                        if (Math.random() > 0.6) {
                             data.data.push({
                                 postId: postId,
                                 positiveCount: rand(0, 5),
                                 negativeCount: rand(0, 1), // Negative comments are rare
                                 neutralCount: rand(0, 2),
                             });
                        } else {
                            data.data.push({ postId: postId, positiveCount: 0, negativeCount: 0, neutralCount: 0 });
                        }
                     });
                 }
                break;
            // highlight-end
            case "CAMPAIGN_INFO":
          break;
      }
      return new Response(JSON.stringify(data), {
        status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });
        } catch (err) {
          if (err.name === "AbortError") {
          } else {
            console.error(
              INJECTED_LOG_PREFIX,
              "Error during interception for",
              url,
              `(${matchedEndpointType}):`,
              err
            );
          }
          return pageContextOriginalFetch.apply(this, args);
        }
      }
      return pageContextOriginalFetch.apply(this, args);
    };
  
    window.fetch = injectedCustomFetch;
    window.__REPLIFY_CAMPAIGNS_FETCH_APPLIED__ = true;
  
    window.__REPLIFY_REVERT_CAMPAIGNS_FETCH__ = function () {
      if (window.fetch === injectedCustomFetch) {
        window.fetch = pageContextOriginalFetch;
        delete window.__REPLIFY_CAMPAIGNS_FETCH_APPLIED__;
        delete window.__REPLIFY_REVERT_CAMPAIGNS_FETCH__;
        console.log(
          INJECTED_LOG_PREFIX,
          "Fetch restored to page original by revert function."
        );
        return true;
      }
      return false;
    };
  })();