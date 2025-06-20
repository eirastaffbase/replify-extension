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
      "/api/branch/analytics/campaigns/visibility/content-ranking", // New
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

  // --- Helper functions (normalisePercentage, harmonisePercentagePair, etc.) are unchanged ---
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
            case "CAMPAIGN_REFERENCES":
                if (campaignId && data.data && Array.isArray(data.data)) {
                  // This is our reliable source of all posts. Store them.
                  const allPostIds = data.data
                    .filter((ref) => ref.sourceType === "POST")
                    .map((ref) => ref.sourceId);
                  if (!injectedCampaignDataStore[campaignId])
                    injectedCampaignDataStore[campaignId] = {};
                  injectedCampaignDataStore[campaignId].allPostIds = allPostIds;
                }
                break;
    
              case "ALIGNMENT_RESULTS_PER_CONTENT":
                // **NEW STRATEGY**: If the response is empty or sparse, we create a full one.
                if (campaignId && data && Array.isArray(data.contents)) {
                  const storedCampData = injectedCampaignDataStore[campaignId];
                  const allPostIds = storedCampData?.allPostIds || [];
    
                  // If the original response is empty but we know there are posts, generate from scratch.
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
                      const participantCount = rand(5, 35);
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
                      // Store this so POST_STATS can be consistent
                      injectedCampaignDataStore[campaignId].postSurveyAnswers[
                        postId
                      ] = participantCount;
                    });
                  }
                }
                break;
    
              case "POST_STATS":
                // This now becomes a "consumer" of the data we generated, ensuring consistency.
                if (campaignId && data && Array.isArray(data.posts)) {
                  const postSurveyAnswers =
                    injectedCampaignDataStore[campaignId]?.postSurveyAnswers || {};
                  data.posts.forEach((post) => {
                    post.surveyAnswers = postSurveyAnswers[post.postId] || 0;
                    // Other stats randomization can remain
                    const potential =
                      injectedCampaignDataStore[campaignId]?.potentialVisitors ||
                      post.visitors + rand(5, 50);
                    let [normVisPercent, normEngPercent] = harmonisePercentagePair(
                      rand(5, 88),
                      rand(5, 80)
                    );
                    post.visitors = Math.min(
                      potential,
                      Math.round(potential * (normVisPercent / 100))
                    );
                    post.engagedUsers = Math.min(
                      post.visitors,
                      Math.round(post.visitors * (normEngPercent / 100))
                    );
                  });
                }
                break;
    
              case "ENGAGEMENT_TIMESERIES":
              case "VISIBILITY_TIMESERIES":
                // **NEW STRATEGY**: If data is flat or short, regenerate a full, dynamic timeseries.
                const isFlat =
                  data.timeseries?.length > 1 &&
                  data.timeseries.every(
                    (v) => v.visitors === data.timeseries[0].visitors
                  );
                if ((data.timeseries && data.timeseries.length < 15) || isFlat) {
                  console.log(
                    INJECTED_LOG_PREFIX,
                    "Regenerating flat/short timeseries for " + matchedEndpointType
                  );
                  const overallStats = injectedCampaignDataStore[campaignId];
                  const totalVisitors = overallStats?.visitors || rand(250, 800);
                  const totalEngaged =
                    overallStats?.engagedUsers ||
                    Math.round(totalVisitors * randFloat(0.4, 0.8));
    
                  const numPoints = 30; // Generate 30 days of data
                  const newSeries = [];
                  let date = new Date();
                  date.setDate(date.getDate() - numPoints);
    
                  // Create weights with a decay
                  const weights = Array.from(
                    { length: numPoints },
                    (_, i) => Math.pow(0.85, i) + 0.1
                  );
                  const totalWeight = weights.reduce((s, w) => s + w, 0);
    
                  let distributedVisitors = weights.map((w) =>
                    Math.floor(totalVisitors * (w / totalWeight))
                  );
                  let distributedEngaged = weights.map((w) =>
                    Math.floor(totalEngaged * (w / totalWeight))
                  );
    
                  let visitorSum = distributedVisitors.reduce((s, v) => s + v, 0);
                  let engagedSum = distributedEngaged.reduce((s, v) => s + v, 0);
                  if (distributedVisitors.length > 0)
                    distributedVisitors[0] += totalVisitors - visitorSum;
                  if (distributedEngaged.length > 0)
                    distributedEngaged[0] += totalEngaged - engagedSum;
    
                  for (let i = 0; i < numPoints; i++) {
                    date.setDate(date.getDate() + 1);
                    const entry = {
                      date: date.toISOString().split("T")[0] + "T00:00:00Z",
                    };
                    if (matchedEndpointType === "VISIBILITY_TIMESERIES") {
                      const seenOne = distributedVisitors[i] || 0;
                      const seenTwo = Math.round(seenOne * randFloat(0.2, 0.7));
                      const seenThree = Math.round(seenTwo * randFloat(0.1, 0.6));
                      Object.assign(entry, {
                        seenAtLeastOne: seenOne,
                        seenAtLeastTwo: seenTwo,
                        seenAtLeastThree: seenThree,
                      });
                    } else {
                      const visitors = distributedVisitors[i] || 0;
                      const engaged = Math.min(
                        visitors,
                        distributedEngaged[i] || 0
                      );
                      Object.assign(entry, {
                        visitors: visitors,
                        engagedUsers: engaged,
                      });
                    }
                    newSeries.push(entry);
                  }
                  data.timeseries = newSeries;
                  data.total = newSeries.length;
                }
                break;
    
              case "VISIBILITY_CONTENT_RANKING":
                if (data.rankingSeries && Array.isArray(data.rankingSeries)) {
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
          case "ENGAGEMENT_TIMESERIES":
            case "VISIBILITY_TIMESERIES":
              // This padding logic is for the other graphs (Visibility/Engagement over time)
          if (data.timeseries && Array.isArray(data.timeseries)) {
            const urlObj = new URL(url, window.location.origin);
            const groupBy = urlObj.searchParams.get("groupBy") || "day";
            let minPoints = groupBy.toLowerCase() === "week" ? 8 : 15;
            const pointsToAdd = minPoints - data.timeseries.length;
            if (pointsToAdd > 0) {
              const newPaddedSeries = [];
              let padDate =
                data.timeseries.length > 0
                  ? new Date(data.timeseries[0].date)
                  : new Date();
              for (let i = 0; i < pointsToAdd; i++) {
                if (groupBy.toLowerCase() === "week")
                  padDate.setUTCDate(padDate.getUTCDate() - 7);
                else padDate.setUTCDate(padDate.getUTCDate() - 1);
                const emptyDataPoint = {
                  date: padDate.toISOString().split("T")[0] + "T00:00:00Z",
                };
                if (matchedEndpointType === "VISIBILITY_TIMESERIES") {
                  Object.assign(emptyDataPoint, {
                    seenAtLeastOne: 0,
                    seenAtLeastTwo: 0,
                    seenAtLeastThree: 0,
                  });
                } else {
                  Object.assign(emptyDataPoint, {
                    visitors: 0,
                    engagedUsers: 0,
                  });
                }
                newPaddedSeries.unshift(emptyDataPoint);
              }
              data.timeseries = [...newPaddedSeries, ...data.timeseries];
              data.total = data.timeseries.length;
            }
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
                  // Check if already processed by RANKINGS
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

        case "POST_STATS":
          if (campaignId && data && Array.isArray(data.posts)) {
            const campData = injectedCampaignDataStore[campaignId] || {};
            if (!injectedCampaignDataStore[campaignId])
              injectedCampaignDataStore[campaignId] = {};
            if (!injectedCampaignDataStore[campaignId].postSurveyAnswers)
              injectedCampaignDataStore[campaignId].postSurveyAnswers = {};

            data.posts.forEach((post) => {
              // --- Logic to generate visitor/engager counts is unchanged ---
              let postPotential = Math.max(
                1,
                campData.potentialVisitors > 0
                  ? Math.ceil(
                      (campData.potentialVisitors /
                        (data.posts.length || 1)) *
                        randFloat(0.5, 1.5)
                    )
                    : rand(10, 50)
                  );
  
                  let postVisPercent = rand(
                    MIN_PCT_FLOOR_INPUTS,
                    MAX_DESIRED_PCT - rand(5, 15)
                  );
                  let postEngPercent = rand(
                    MIN_PCT_FLOOR_INPUTS - 5,
                    Math.max(
                      MIN_PCT_FLOOR_INPUTS - 5,
                      postVisPercent - rand(5, 10)
                    )
                  );
                  [postVisPercent, postEngPercent] = harmonisePercentagePair(
                    postVisPercent,
                    postEngPercent,
                    MAX_DESIRED_PCT
                  );
              post.visitors = Math.round(
                (postVisPercent / 100) * postPotential
              );
              post.engagedUsers = Math.round(
                (postEngPercent / 100) * postPotential
              );
              post.visitors = Math.min(post.visitors, postPotential);
              if (post.visitors === postPotential && postPotential > 0)
                post.visitors = Math.max(0, postPotential - 1);
              post.engagedUsers = Math.min(post.engagedUsers, post.visitors);

              // **MODIFIED**: Increase the chance of a post getting survey answers.
              let postGetsSurveyActivity = false;
              if (
                typeof campData.alignmentScore === "number" &&
                campData.alignmentScore > 3.0
              ) {
                // If campaign has a survey, give most posts some answers.
                if (Math.random() < 0.85) postGetsSurveyActivity = true;
              }

              if (postGetsSurveyActivity) {
                post.surveyAnswers = rand(1, Math.max(1, post.engagedUsers)); // Answers can't exceed engaged users
              } else {
                post.surveyAnswers = 0;
              }
              // Store the result for this post so we can use it in the per-content endpoint.
              injectedCampaignDataStore[campaignId].postSurveyAnswers[
                post.postId
              ] = post.surveyAnswers;
            });
          }
          break;

          case "ALIGNMENT_RESULTS_OVERALL": // ...  uses injectedCampaignDataStore ...
          if (campaignId && data) {
            const stored = injectedCampaignDataStore[campaignId];
            let finalScore, finalParticipants;
            if (stored && typeof stored.alignmentScore === "number") {
              finalScore = stored.alignmentScore;
              finalParticipants =
                stored.alignmentParticipantsCount > 5
                  ? stored.alignmentParticipantsCount
                  : rand(6, 25);
            } else {
              finalScore = generateAlignmentScore();
              finalParticipants = rand(6, 25);
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

            // **MODIFIED**: Add entries for any post that has survey answers but isn't in the original API response.
            // This is the key to padding the graph.
            for (const postId in allPostsWithSurveyAnswers) {
              if (
                allPostsWithSurveyAnswers[postId] > 0 &&
                !existingContentIds.has(postId)
              ) {
                data.contents.push({
                  contentId: postId,
                  contentType: "post",
                  surveyReferenceStatus: "enabled",
                  participantCount: 0, // Will be updated below
                  answers: null,
                });
              }
            }

            const overallCampaignScore =
              storedCampData?.alignmentScore || generateAlignmentScore();

            // Now, iterate over the (potentially longer) contents array and fill in the details.
            data.contents.forEach((content) => {
              const postId = content.contentId;
              // Use the stored survey answer count from the POST_STATS call.
              const participantCount =
                allPostsWithSurveyAnswers[postId] ||
                content.participantCount ||
                0;

              content.participantCount = participantCount;
              content.surveyReferenceStatus = "enabled"; // Ensure it's enabled if we're adding data

              if (participantCount > 0) {
                // Generate a plausible score for this post, slightly varied from the campaign's overall score
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
          case "ENGAGEMENT_GROUPS":
              if (data.ranking && Array.isArray(data.ranking)) {
                data.ranking.forEach((group) => {
                  let groupPotential = group.visitors; // This is actually "visitors" for the group, not total potential for group
                  if (group.visitors > 0) {
                    // Use group.visitors as the base for engagers for this endpoint
                    let engPctOfVis = rand(30, Math.min(95, MAX_DESIRED_PCT - 2)); // Generate engagers as % of actual visitors for the group
                    group.engagers = Math.round(
                      (engPctOfVis / 100) * group.visitors
                    );
                    group.engagers = Math.min(group.engagers, group.visitors); // Cap at visitors
                    if (group.engagers === group.visitors && group.visitors > 0)
                      group.engagers = group.visitors - 1;
                    group.engagers = Math.max(0, group.engagers);
                  } else {
                    group.engagers = 0;
                  }
                });
              }
              break;
              case "VISIBILITY_USER_GROUP_RANKING": // ...
          if (data.ranking && Array.isArray(data.ranking)) {
                data.ranking.forEach((group) => {
                  const potential =
                    group.potentialVisitors > 0
                      ? group.potentialVisitors
                      : group.visitors;
                  if (potential > 0) {
                    // **FIXED**: Using the correct variable name here
                    let visPct = normalisePercentage(
                      rand(MIN_PCT_FLOOR_INPUTS, MAX_DESIRED_PCT),
                      MAX_DESIRED_PCT
                    );
                    group.visitors = Math.round((visPct / 100) * potential);
                    group.visitors = Math.min(group.visitors, potential);
                    if (group.visitors === potential && potential > 0) {
                      group.visitors = Math.max(
                        0,
                        potential -
                          rand(1, Math.max(1, Math.floor(potential * 0.02)) + 1)
                      );
                    }
                    group.visitors = Math.max(0, group.visitors);
                  } else {
                    group.visitors = 0;
                  }
              if (group.potentialVisitors === 0 && group.visitors > 0) {
                    group.potentialVisitors =
                      group.visitors + rand(0, Math.floor(group.visitors * 0.2));
                  }
                });
              }
              break;
  
              
              case "SENTIMENT_OVERALL": // ...  uses injectedCampaignDataStore ...
              if (campaignId && data && data.data) {
                const stored = injectedCampaignDataStore[campaignId];
                let baseCommenters =
                  stored?.engagedUsers > 0
                    ? Math.floor(stored.engagedUsers * randFloat(0.05, 0.2))
                    : rand(5, 20);
                baseCommenters = Math.max(5, baseCommenters);
  
                data.data.uniqueCommenterCount = baseCommenters;
                data.data.labelPositiveCount = rand(
                  Math.floor(baseCommenters * 0.2),
                  baseCommenters
                );
                data.data.labelNegativeCount = rand(
                  0,
                  Math.floor(baseCommenters * 0.3)
                );
                data.data.labelNeutralCount = rand(
                  0,
                  Math.floor(baseCommenters * 0.4)
                );
                const sumLabels =
                  data.data.labelPositiveCount +
                  data.data.labelNegativeCount +
                  data.data.labelNeutralCount;
                if (sumLabels === 0 && data.data.uniqueCommenterCount > 0)
                  data.data.labelPositiveCount = data.data.uniqueCommenterCount;
                else if (sumLabels > data.data.uniqueCommenterCount) {
                  data.data.labelPositiveCount = Math.floor(
                    (data.data.labelPositiveCount *
                      data.data.uniqueCommenterCount) /
                      sumLabels
                  );
                  data.data.labelNegativeCount = Math.floor(
                    (data.data.labelNegativeCount *
                      data.data.uniqueCommenterCount) /
                      sumLabels
                  );
                  data.data.labelNeutralCount = Math.max(
                    0,
                    data.data.uniqueCommenterCount -
                      data.data.labelPositiveCount -
                      data.data.labelNegativeCount
                  );
                }
              }
              break;
            case "SENTIMENT_TIMESERIES": // ...  uses injectedCampaignDataStore ...
              if (data.data && Array.isArray(data.data)) {
                const overallEngaged =
                  injectedCampaignDataStore[campaignId]?.engagedUsers ||
                  rand(20, 100);
                if (
                  data.data.length <= 3 &&
                  campaignId &&
                  (injectedCampaignDataStore[campaignId]?.visitors > 0 ||
                    data.data.some((d) => d.labelPositiveCount > 0))
                ) {
                  const numDaysToGenerate = rand(15, 30);
                  const newTimeSeries = [];
                  let startDate = new Date();
                  if (data.data.length > 0 && data.data[0].date) {
                    startDate = new Date(data.data[0].date);
                    startDate.setDate(
                      startDate.getDate() - Math.floor(numDaysToGenerate / 2)
                    );
                  } else {
                    startDate.setDate(
                      startDate.getDate() - numDaysToGenerate + 1
                    );
                  }
                  for (let i = 0; i < numDaysToGenerate; i++) {
                    const currentDate = new Date(startDate);
                    currentDate.setDate(startDate.getDate() + i);
                    const dailyMaxComments = Math.max(
                      1,
                      Math.ceil(
                        (overallEngaged / numDaysToGenerate) *
                          randFloat(0.02, 0.1)
                      )
                    );
                    const totalSentimentsToday = rand(0, dailyMaxComments);
                    let pos = rand(0, totalSentimentsToday);
                    let neg = rand(0, Math.max(0, totalSentimentsToday - pos));
                    let neu = Math.max(0, totalSentimentsToday - pos - neg);
                    newTimeSeries.push({
                      date:
                        currentDate.toISOString().split("T")[0] + "T00:00:00Z",
                      labelPositiveCount: pos,
                      labelNegativeCount: neg,
                      labelNeutralCount: neu,
                    });
                  }
                  data.data = newTimeSeries.sort(
                    (a, b) => new Date(a.date) - new Date(b.date)
                  );
                } else {
                  data.data.forEach((dp) => {
                    const dailyMax = Math.max(
                      1,
                      Math.ceil((overallEngaged / data.data.length) * 0.1)
                    );
                    dp.labelPositiveCount = rand(
                      0,
                      Math.max(dp.labelPositiveCount, rand(0, dailyMax))
                    );
                    dp.labelNegativeCount = rand(
                      0,
                      Math.max(
                        dp.labelNegativeCount,
                        rand(0, Math.floor(dailyMax * 0.5))
                      )
                    );
                    dp.labelNeutralCount = rand(
                      0,
                      Math.max(
                        dp.labelNeutralCount,
                        rand(0, Math.floor(dailyMax * 0.5))
                      )
                    );
                  });
                }
              }
              break;
            case "VISIBILITY_TIMESERIES": // ...  uses injectedCampaignDataStore ...
              if (data.timeseries && Array.isArray(data.timeseries)) {
                let overallMaxSeen =
                  injectedCampaignDataStore[campaignId]?.visitors || 0;
                if (overallMaxSeen === 0 && data.timeseries.length > 0)
                  overallMaxSeen = Math.max(
                    ...data.timeseries.map((ts) => ts.seenAtLeastOne),
                    40
                  );
                else if (overallMaxSeen === 0) overallMaxSeen = rand(40, 200); // Default if no other data
  
                data.timeseries.forEach((ts) => {
                  const dayMaxPotential = rand(
                    Math.floor(overallMaxSeen * 0.05),
                    Math.floor(overallMaxSeen * 0.3)
                  ); // Smaller daily fraction
                  ts.seenAtLeastOne = rand(
                    Math.floor(dayMaxPotential * 0.1),
                    dayMaxPotential
                  );
                  ts.seenAtLeastTwo = rand(
                    0,
                    Math.floor(ts.seenAtLeastOne * randFloat(0.1, 0.6))
                  );
                  ts.seenAtLeastThree = rand(
                    0,
                    Math.floor(ts.seenAtLeastTwo * randFloat(0.05, 0.5))
                  );
                });
              }
              break;
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
            // This is expected when requests are cancelled by the browser/framework. We can ignore it.
          } else {
            // Log any other, more serious errors.
            console.error(
              INJECTED_LOG_PREFIX,
              "Error during interception for",
              url,
              `(${matchedEndpointType}):`,
              err
            );
          }
          // In case of any error, it's safest to return the result of the original fetch call
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
  