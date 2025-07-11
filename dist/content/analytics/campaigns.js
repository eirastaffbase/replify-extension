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

  // --- TARGET_URLS and other variables remain the same ---
  const TARGET_URLS = {
    RANKINGS: "/api/branch/analytics/campaigns/rankings",
    CAMPAIGN_STATS: "/api/branch/analytics/campaigns/stats",
    CAMPAIGN_INFO: "/api/campaigns/",
    ALIGNMENT_RESULTS_OVERALL: "/api/alignment-survey/results/overall",
    ALIGNMENT_RESULTS_PER_CONTENT: "/api/alignment-survey/results/per-content",
    ALIGNMENT_TIMESERIES: "/api/alignment-survey/results/time-series",
    ALIGNMENT_SURVEY_CONFIG: "/api/alignment-survey/surveys",
    ENGAGEMENT_GROUPS:
      "/api/branch/analytics/campaigns/engagement/user-group-ranking",
    VISIBILITY_USER_GROUP_RANKING:
      "/api/branch/analytics/campaigns/visibility/user-group-ranking",
    SENTIMENT_TIMESERIES: "/api/community-insights/campaigns/",
    SENTIMENT_OVERALL: "/api/community-insights/campaigns/",
    VISIBILITY_TIMESERIES:
      "/api/branch/analytics/campaigns/visibility/timeseries",
    ENGAGEMENT_TIMESERIES:
      "/api/branch/analytics/campaigns/engagement/timeseries",
    POST_STATS: "/api/branch/analytics/campaigns/posts/stats",
  };
  
  const MOCK_GROUP_NAMES = [
      "Approved Email Recipients", "Company Values", "Marketplace", "Pet Central",
      "Events and Social", "Thank You", "Leadership Team", "New York Office",
      "Remote Workers", "Project Phoenix Team",
  ];

  // --- All helper functions (rand, normalisePercentage, etc.) remain the same ---
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
  const harmonisePercentagePair = ( visPctInput, engPctInput, cap = MAX_DESIRED_PCT ) => {
    let visPct = parseFloat(visPctInput);
    let engPct = parseFloat(engPctInput);
    if (isNaN(visPct)) visPct = rand(Math.max(MIN_PCT_FLOOR_INPUTS, cap - 25), cap - 10);
    if (isNaN(engPct)) engPct = rand(Math.max(MIN_PCT_FLOOR_INPUTS, cap - 35), cap - 20);
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
      visPct = engPct + MAX_ALLOWED_SIMILARITY_DIFF - rand(0, Math.floor(MAX_ALLOWED_SIMILARITY_DIFF * 0.15));
    }
    visPct = Math.round(Math.min(Math.max(0, visPct), cap));
    engPct = Math.round(Math.min(Math.max(0, engPct), cap));
    if (visPct >= cap) visPct = cap - rand(1, Math.min(3, cap > 1 ? cap - 1 : 1));
    if (engPct >= cap) engPct = cap - rand(1, Math.min(3, cap > 1 ? cap - 1 : 1));
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
      if (r < 0.6) vote = rand(Math.max(1, targetVote - 1), Math.min(5, targetVote + 1));
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
            ["comments", "stats", "rankings", "results", "surveys", "timeseries"].includes(pathParts[campaignsIndex + 2]) ||
            /^[a-f0-9]{24}$/i.test(pathParts[campaignsIndex + 2]) === false
          ) {
            return potentialId;
          }
        }
      }
    } catch (e) {
      console.warn(INJECTED_LOG_PREFIX + " Error parsing URL " + url + " for campaignId: " + e.message);
    }
    return null;
  }

// START: DOM MANIPULATION FOR ALIGNMENT CHART
const forceRenderAlignmentChart = () => {
  const INJECTED_LOG_PREFIX = "[Replify InjectedCampaignsPatch]:";

  // This function generates the entire SVG chart dynamically
  const generateDynamicChartHTML = (targetAverage = 4.2, containerWidth) => {
      // 1. Generate Dynamic Data
      const dataPoints = [];
      const numPoints = 12;
      let lastDate = new Date();
      lastDate.setDate(lastDate.getDate() - numPoints * 5);
      let lastScore = targetAverage + (Math.random() - 0.5) * 0.5;

      for (let i = 0; i < numPoints; i++) {
          lastDate.setDate(lastDate.getDate() + Math.floor(Math.random() * 5) + 3);
          lastScore += (Math.random() - 0.5) * 0.35;
          lastScore += (targetAverage - lastScore) * 0.1;
          lastScore = Math.max(3.2, Math.min(4.9, lastScore));
          dataPoints.push({
              date: new Date(lastDate),
              score: parseFloat(lastScore.toFixed(2)),
          });
      }

      // 2. Define SVG and Chart Dimensions (Now uses the container's width)
      const svgWidth = containerWidth;
      const svgHeight = 378;
      const margin = { top: 12, right: 66, bottom: 42, left: 42 };
      const innerWidth = svgWidth - margin.left - margin.right;
      const innerHeight = svgHeight - margin.top - margin.bottom;

      if (innerWidth <= 0) return ''; // Don't render if there's no space

      // 3. Create Scales
      const xScale = (date) => {
          const minTime = dataPoints[0].date.getTime();
          const maxTime = dataPoints[dataPoints.length - 1].date.getTime();
          return margin.left + ((date.getTime() - minTime) / (maxTime - minTime)) * innerWidth;
      };
      const yScale = (score) => {
          return margin.top + innerHeight - ((score - 1) / 4) * innerHeight;
      };

      // 4. Generate SVG elements as strings
      const yAxisTicks = [1, 2, 3, 4, 5].map(val =>
          `<g class="visx-group visx-axis-tick"><svg x="0.25em" y="0.25em" font-size="12px" style="overflow: visible;"><text x="8" y="${yScale(val)}" font-family="Inter" font-size="12px" fill="var(--sb-color-grey-700)" text-anchor="start"><tspan x="8" dy="0em">${val}</tspan></text></svg></g>`
      ).join('');

      const gridLines = [1, 2, 3, 4, 5].map(val =>
          `<line class="visx-line" x1="${margin.left}" y1="${yScale(val)}" x2="${innerWidth + margin.left}" y2="${yScale(val)}" fill="transparent" shape-rendering="crispEdges" stroke="#eaf0f6" stroke-width="1"></line>`
      ).join('');

      const dateTicks = dataPoints.map((d, i) => {
          if (i % 2 !== 0 && i < dataPoints.length - 1) return '';
          const x = xScale(d.date);
          const dateString = d.date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
          return `<g class="visx-group visx-axis-tick"><line class="visx-line" x1="${x}" y1="${margin.top + innerHeight}" x2="${x}" y2="${margin.top + innerHeight + 8}" fill="transparent" shape-rendering="crispEdges" stroke="var(--sb-color-grey-100)" stroke-width="1"></line><svg x="0" y="0.25em" font-size="12px" style="overflow: visible;"><text x="${x}" y="${margin.top + innerHeight + 18}" font-family="Inter" font-size="12px" fill="var(--sb-color-grey-700)" text-anchor="middle"><tspan dy="0em">${dateString}</tspan></text></svg></g>`;
      }).join('');

      const curve = (p, i, a) => {
          const tension = 0.2;
          const [x0, y0] = i > 0 ? [xScale(a[i - 1].date), yScale(a[i - 1].score)] : p;
          const [x1, y1] = p;
          const [x2, y2] = i < a.length - 1 ? [xScale(a[i + 1].date), yScale(a[i + 1].score)] : p;
          const [x3, y3] = i < a.length - 2 ? [xScale(a[i + 2].date), yScale(a[i + 2].score)] : [x2, y2];
          const l = (p1, p2) => Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));
          const d01 = l([x0, y0], [x1, y1]) || 1;
          const d12 = l([x1, y1], [x2, y2]) || 1;
          const d23 = l([x2, y2], [x3, y3]) || 1;
          const fa = tension * d12 / (d01 + d12);
          const fb = tension * d12 / (d12 + d23);
          const p1x = x1 + fa * (x2 - x0);
          const p1y = y1 + fa * (y2 - y0);
          const p2x = x2 - fb * (x3 - x1);
          const p2y = y2 - fb * (y3 - y1);
          return `C ${p1x},${p1y} ${p2x},${p2y} ${x2},${y2}`;
      };

      const scaledPoints = dataPoints.map(d => [xScale(d.date), yScale(d.score)]);
      const pathData = scaledPoints.reduce((acc, p, i, a) => acc + (i > 0 ? curve(p, i, dataPoints) : `M ${p[0]} ${p[1]}`), '');
      const path = `<path class="visx-linepath" d="${pathData}" fill="transparent" stroke-linecap="round" stroke="#0F3948" stroke-width="2"></path>`;

      const circles = dataPoints.map(d =>
          `<circle cx="${xScale(d.date)}" cy="${yScale(d.score)}" r="2.5" fill="#0F3948" stroke="#FFF" stroke-width="1"></circle>`
      ).join('');

      const hoverRects = dataPoints.map((d, i) => {
          const x = i > 0 ? xScale(dataPoints[i - 1].date) + (xScale(d.date) - xScale(dataPoints[i - 1].date)) / 2 : margin.left;
          const width = i > 0 ? (xScale(d.date) - xScale(dataPoints[i - 1].date)) / 2 + (i < dataPoints.length - 1 ? (xScale(dataPoints[i + 1].date) - xScale(d.date)) / 2 : 0) : (xScale(dataPoints[1].date) - xScale(d.date)) / 2;
          return `<rect y="${margin.top}" height="${innerHeight}" x="${x}" opacity="0" width="${width}" tabindex="0"></rect>`
      }).join('');

      // 5. Assemble the final HTML
      return `<div class="lg:flex-[0.67] bg-neutral-surface border border-neutral-weak h-[476px] flex flex-col min-w-0 rounded-8">
          <div class="group flex flex-col flex-1 gap-24 py-24 h-full">
              <div class="flex gap-8 items-center px-[42px]">
                  <h2 class="text-title-lg">Alignment Average Over Time</h2>
              </div>
              <div class="flex-1 min-h-0 min-w-0">
                  <div style="width: 100%; height: 100%;">
                      <div class="relative">
                          <svg height="${svgHeight}" width="${svgWidth}">
                              <g>
                                  ${gridLines}
                                  ${dateTicks}
                                  <g transform="translate(${innerWidth + margin.left}, 0)">${yAxisTicks}</g>
                                  ${path}
                                  ${circles}
                                  ${hoverRects}
                              </g>
                          </svg>
                      </div>
                  </div>
              </div>
          </div>
      </div>`;
  };

  const emptyStateText = "Publish the first alignment survey in this campaign.";

  const startObserver = () => {
      let checkCounter = 0;
      const checkInterval = setInterval(() => {
          const allParagraphs = document.querySelectorAll('p');
          const targetElement = Array.from(allParagraphs).find(p => p.textContent.trim() === emptyStateText);
          checkCounter++;

          if (targetElement) {
              console.log(INJECTED_LOG_PREFIX, "✅ Found target text on check #" + checkCounter);
              clearInterval(checkInterval);

              const chartContainer = targetElement.closest('.rounded-8');
              if (chartContainer) {
                  const campaignId = extractCampaignIdFromUrl(window.location.href);
                  const campaignData = campaignId ? injectedCampaignDataStore[campaignId] : null;
                  const alignmentScore = campaignData?.alignmentScore || 4.2;
                  
                  // Measure the container before generating the chart
                  const containerWidth = chartContainer.getBoundingClientRect().width;

                  console.log(INJECTED_LOG_PREFIX, `✅ Generating chart with width ${containerWidth}px and target average: ${alignmentScore}`);
                  const dynamicHTML = generateDynamicChartHTML(alignmentScore, containerWidth);
                  chartContainer.outerHTML = dynamicHTML;
              }
          } else if (checkCounter > 20) {
              console.log(INJECTED_LOG_PREFIX, "❌ Stopped checking after 20s. Empty chart not found on this page.");
              clearInterval(checkInterval);
          }
      }, 1000);
  };

  // This observer handles the SPA navigation
  let lastUrl = location.href;
  new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
          lastUrl = url;
          // Check if we are on a specific campaign page
          if (/analytics\/campaigns\/[a-f0-9]{24}/.test(url)) {
              console.log(INJECTED_LOG_PREFIX, "URL changed to a campaign page. Starting chart observer.");
              startObserver(); // Start looking for the empty chart
          }
      }
  }).observe(document, { subtree: true, childList: true });

  // Initial check for the first page load
  if (/analytics\/campaigns\/[a-f0-9]{24}/.test(location.href)) {
      console.log(INJECTED_LOG_PREFIX, "Initial load is a campaign page. Starting chart observer.");
      startObserver();
  }
};
// END: DOM MANIPULATION FOR ALIGNMENT CHART
  const injectedCustomFetch = async function (...args) {
    const resource = args[0];
    let url = typeof resource === "string" ? resource : resource.url;
    
    let matchedEndpointType = null;
    let campaignId = null;

    if (typeof url === "string") {
      if (
        url.startsWith(window.location.origin) ||
        url.startsWith("https://app.staffbase.com") ||
        url.includes("/api/")
      ) {
        if (url.includes(TARGET_URLS.RANKINGS))
          matchedEndpointType = "RANKINGS";
        else if (url.includes(TARGET_URLS.CAMPAIGN_STATS)) {
          matchedEndpointType = "CAMPAIGN_STATS";
          campaignId = extractCampaignIdFromUrl(url);
        } else if (url.includes(TARGET_URLS.ALIGNMENT_TIMESERIES)) {
          matchedEndpointType = "ALIGNMENT_TIMESERIES";
          campaignId = extractCampaignIdFromUrl(url);
        } else if (url.includes(TARGET_URLS.ALIGNMENT_RESULTS_PER_CONTENT)) {
          matchedEndpointType = "ALIGNMENT_RESULTS_PER_CONTENT";
          campaignId = extractCampaignIdFromUrl(url);
        } else if (url.includes(TARGET_URLS.ALIGNMENT_RESULTS_OVERALL)) {
          matchedEndpointType = "ALIGNMENT_RESULTS_OVERALL";
          campaignId = extractCampaignIdFromUrl(url);
        } else if (url.includes(TARGET_URLS.ENGAGEMENT_GROUPS)) {
          matchedEndpointType = "ENGAGEMENT_GROUPS";
          campaignId = extractCampaignIdFromUrl(url);
        } else if (url.includes(TARGET_URLS.VISIBILITY_USER_GROUP_RANKING)) {
          matchedEndpointType = "VISIBILITY_USER_GROUP_RANKING";
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
        } else if (url.includes(TARGET_URLS.VISIBILITY_TIMESERIES)) {
          matchedEndpointType = "VISIBILITY_TIMESERIES";
          campaignId = extractCampaignIdFromUrl(url);
        } else if (url.includes(TARGET_URLS.ENGAGEMENT_TIMESERIES)) {
          matchedEndpointType = "ENGAGEMENT_TIMESERIES";
          campaignId = extractCampaignIdFromUrl(url);
        } else if (url.includes(TARGET_URLS.POST_STATS)) {
          matchedEndpointType = "POST_STATS";
          campaignId = extractCampaignIdFromUrl(url);
        } else if (
          url.includes(TARGET_URLS.CAMPAIGN_INFO) &&
          !Object.values(TARGET_URLS).some(
            (v) =>
              v !== TARGET_URLS.CAMPAIGN_INFO &&
              url.includes(v) &&
              v.length > TARGET_URLS.CAMPAIGN_INFO.length
          )
        ) {
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
          // --- All 'case' blocks remain the same ---
          case "RANKINGS":
            if (data.ranking && Array.isArray(data.ranking)) {
              data.ranking.forEach((item) => {
                const potential = item.potentialVisitors > 0 ? item.potentialVisitors : Math.max(item.visitors, item.engagedUsers, 1);
                let originalVisPercent = potential > 0 ? (item.visitors / potential) * 100 : 0;
                let originalEngPercent = potential > 0 ? (item.engagedUsers / potential) * 100 : 0;
                let normVisPercent = normalisePercentage( originalVisPercent, MAX_DESIRED_PCT );
                let normEngPercent = normalisePercentage( originalEngPercent, MAX_DESIRED_PCT );
                [normVisPercent, normEngPercent] = harmonisePercentagePair( normVisPercent, normEngPercent, MAX_DESIRED_PCT );
                item.visitors = Math.round((normVisPercent / 100) * potential);
                item.engagedUsers = Math.round( (normEngPercent / 100) * potential );
                if (potential > 0) {
                  item.visitors = Math.min(item.visitors, potential);
                }
                item.engagedUsers = Math.min(item.engagedUsers, item.visitors);
                item.visitors = Math.max(0, item.visitors);
                item.engagedUsers = Math.max(0, item.engagedUsers);
                let newAlignmentScore = item.alignmentScore;
                let newAlignmentParticipants = item.alignmentParticipantsCount;
                if ( item.hasAlignmentSurvey && (item.alignmentScore === 0 || item.alignmentParticipantsCount <= 5) ) {
                  newAlignmentScore = generateAlignmentScore();
                  newAlignmentParticipants = rand(6, 25);
                } else if (item.alignmentScore > 5) {
                  newAlignmentScore = generateAlignmentScore();
                  if (item.alignmentParticipantsCount <= 5) newAlignmentParticipants = rand(6, 25);
                } else if ( typeof item.alignmentScore === "number" && item.alignmentScore > 0 ) {
                  newAlignmentScore = parseFloat( item.alignmentScore.toFixed(2) );
                  if ( item.hasAlignmentSurvey && item.alignmentParticipantsCount <= 5 ) newAlignmentParticipants = rand( 6, Math.max(6, item.alignmentParticipantsCount + rand(3, 10)) );
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
              const potential = data.potentialVisitors > 0 ? data.potentialVisitors : Math.max(data.visitors, data.engagedUsers, 1);
              if ( injectedCampaignDataStore[campaignId] && injectedCampaignDataStore[campaignId].visitors !== undefined ) {
                data.visitors = injectedCampaignDataStore[campaignId].visitors;
                data.engagedUsers = injectedCampaignDataStore[campaignId].engagedUsers;
              } else {
                let originalVisPercent = potential > 0 ? (data.visitors / potential) * 100 : 0;
                let originalEngPercent = potential > 0 ? (data.engagedUsers / potential) * 100 : 0;
                let normVisPercent = normalisePercentage( originalVisPercent, MAX_DESIRED_PCT );
                let normEngPercent = normalisePercentage( originalEngPercent, MAX_DESIRED_PCT );
                [normVisPercent, normEngPercent] = harmonisePercentagePair( normVisPercent, normEngPercent, MAX_DESIRED_PCT );
                data.visitors = Math.round((normVisPercent / 100) * potential);
                data.engagedUsers = Math.round( (normEngPercent / 100) * potential );
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
              data.posts.forEach((post) => {
                let postPotential = Math.max( 1, Math.min( post.visitors, campData.potentialVisitors > 0 ? Math.ceil( (campData.potentialVisitors / (data.posts.length || 1)) * randFloat(0.5, 1.5) ) : rand(10, 50) ) );
                let postVisPercent = rand( MIN_PCT_FLOOR_INPUTS, MAX_DESIRED_PCT - rand(5, 15) );
                let postEngPercent = rand( MIN_PCT_FLOOR_INPUTS - 5, Math.max( MIN_PCT_FLOOR_INPUTS - 5, postVisPercent - rand(5, 10) ) );
                [postVisPercent, postEngPercent] = harmonisePercentagePair( postVisPercent, postEngPercent, MAX_DESIRED_PCT );
                post.visitors = Math.round( (postVisPercent / 100) * postPotential );
                post.engagedUsers = Math.round( (postEngPercent / 100) * postPotential );
                post.visitors = Math.min(post.visitors, postPotential);
                if (post.visitors === postPotential && postPotential > 0) post.visitors = Math.max(0, postPotential - 1);
                post.engagedUsers = Math.min(post.engagedUsers, post.visitors);
                post.visitors = Math.max(0, post.visitors);
                post.engagedUsers = Math.max(0, post.engagedUsers);
                post.visits = post.visitors + rand(0, Math.floor(post.visitors * 1.5));
                post.reactions = rand(0, Math.floor(post.engagedUsers * 0.5));
                post.comments = rand(0, Math.floor(post.engagedUsers * 0.25));
                post.shares = rand(0, Math.floor(post.engagedUsers * 0.1));
                let postGetsSurveyActivity = false;
                if ( typeof campData.alignmentScore === "number" && campData.alignmentScore > 0 ) {
                  if (Math.random() < 0.65) postGetsSurveyActivity = true;
                } else {
                  if (Math.random() < 0.1) postGetsSurveyActivity = true;
                }
                if (postGetsSurveyActivity) {
                  post.surveyAnswers = rand(1, 10);
                  post.surveyAnswers = Math.min( post.surveyAnswers, Math.max(post.engagedUsers, 1) );
                  post.surveyAnswers = Math.max(0, post.surveyAnswers);
                } else {
                  post.surveyAnswers = 0;
                }
                if (!injectedCampaignDataStore[campaignId]) injectedCampaignDataStore[campaignId] = { postSurveyAnswers: {}, };
                if (!injectedCampaignDataStore[campaignId].postSurveyAnswers) injectedCampaignDataStore[campaignId].postSurveyAnswers = {};
                injectedCampaignDataStore[campaignId].postSurveyAnswers[ post.postId ] = post.surveyAnswers;
              });
            }
            break;
          case "ALIGNMENT_TIMESERIES":
            console.log(INJECTED_LOG_PREFIX, "Intercepted ALIGNMENT_TIMESERIES. Data will be generated if empty.");
            if (
              !data.timeseries ||
              !Array.isArray(data.timeseries) ||
              data.timeseries.length === 0
            ) {
              const numPoints = rand(8, 15);
              const newTimeSeries = [];
              let currentScore = randFloat(3.8, 4.8, 2);
              const today = new Date();
              const startDate = new Date(
                new Date().setDate(today.getDate() - numPoints * 5)
              );

              for (let i = 0; i < numPoints; i++) {
                const currentDate = new Date(startDate);
                currentDate.setDate(startDate.getDate() + i * rand(4, 8));
                currentScore += randFloat(-0.3, 0.3, 2);
                currentScore = Math.max(3.0, Math.min(5.0, currentScore));
                newTimeSeries.push({
                  date: currentDate.toISOString().split("T")[0] + "T00:00:00.000Z",
                  averageScore: parseFloat(currentScore.toFixed(2)),
                  participantCount: rand(5, 50),
                });
              }
              data.timeseries = newTimeSeries.sort(
                (a, b) => new Date(a.date) - new Date(b.date)
              );
            }
            break;
          case "ALIGNMENT_RESULTS_OVERALL":
            if (campaignId && data) {
              const stored = injectedCampaignDataStore[campaignId];
              let finalScore, finalParticipants;
              if (stored && typeof stored.alignmentScore === "number") {
                finalScore = stored.alignmentScore;
                finalParticipants = stored.alignmentParticipantsCount > 5 ? stored.alignmentParticipantsCount : rand(6, 25);
              } else {
                finalScore = generateAlignmentScore();
                finalParticipants = rand(6, 25);
              }
              data.averageScore = finalScore;
              data.participantCount = finalParticipants;
              data.answers = generateAlignmentAnswers( finalScore, finalParticipants );
              injectedCampaignDataStore[campaignId] = {
                ...injectedCampaignDataStore[campaignId],
                alignmentScore: finalScore,
                alignmentParticipantsCount: finalParticipants,
              };
            }
            break;
          case "ALIGNMENT_RESULTS_PER_CONTENT":
            if (campaignId && data && Array.isArray(data.contents)) {
              const storedCampAlign = injectedCampaignDataStore[campaignId];
              const overallCampaignScore = storedCampAlign?.alignmentScore || generateAlignmentScore();
              let overallCampaignParticipants = storedCampAlign?.alignmentParticipantsCount;
              if ( !overallCampaignParticipants || overallCampaignParticipants <= 5 ) {
                overallCampaignParticipants = rand(6, 25);
                if (storedCampAlign) injectedCampaignDataStore[ campaignId ].alignmentParticipantsCount = overallCampaignParticipants;
              }
              data.contents.forEach((content) => {
                if (content.surveyReferenceStatus === "enabled") {
                  const postId = content.contentId;
                  content.participantCount = injectedCampaignDataStore[campaignId]?.postSurveyAnswers?.[ postId ] || rand(1, 5);
                  if (content.participantCount > 0) {
                    const postAvgScore = parseFloat( Math.min( 5.0, Math.max( 0.0, overallCampaignScore + randFloat(-0.4, 0.4, 2) ) ).toFixed(2) );
                    content.answers = generateAlignmentAnswers( postAvgScore, content.participantCount );
                  } else {
                    content.answers = null;
                  }
                } else {
                  content.participantCount = 0;
                  content.answers = null;
                }
              });
            }
            break;
        case "ENGAGEMENT_GROUPS":
            if (!data.ranking || !Array.isArray(data.ranking) || data.ranking.length === 0) {
                const storedGroups = injectedCampaignDataStore[campaignId]?.userGroups;
                if (storedGroups && storedGroups.length > 0) {
                    data.ranking = storedGroups.map(group => ({
                        groupId: group.groupId,
                        groupName: group.groupName,
                        visitors: 0, 
                        engagers: 0,
                    }));
                } else {
                    data.ranking = [];
                    const numGroups = rand(5, 7);
                    const usedNames = new Set();
                    while (data.ranking.length < numGroups && usedNames.size < MOCK_GROUP_NAMES.length) {
                        const nameIndex = rand(0, MOCK_GROUP_NAMES.length - 1);
                        const name = MOCK_GROUP_NAMES[nameIndex];
                        if (!usedNames.has(name)) {
                            usedNames.add(name);
                            data.ranking.push({
                                groupId: `mock-group-eng-${Date.now()}-${data.ranking.length}`,
                                groupName: name,
                                visitors: 0,
                                engagers: 0,
                            });
                        }
                    }
                }
            }
            const hasVisitors = data.ranking.some(group => group.visitors > 0);
            if (!hasVisitors) {
                const campaignVisitors = injectedCampaignDataStore[campaignId]?.visitors || rand(100, 500);
                data.ranking.forEach(group => {
                    group.visitors = rand(Math.floor(campaignVisitors * 0.1), Math.floor(campaignVisitors * 0.4));
                });
            }
            data.ranking.forEach((group) => {
                if (group.visitors > 0) {
                    let engPctOfVis = rand(30, Math.min(95, MAX_DESIRED_PCT - 2));
                    group.engagers = Math.round( (engPctOfVis / 100) * group.visitors );
                    group.engagers = Math.min(group.engagers, group.visitors);
                    if (group.engagers === group.visitors && group.visitors > 0)
                        group.engagers = group.visitors - 1;
                    group.engagers = Math.max(0, group.engagers);
                } else {
                    group.engagers = 0;
                }
            });
            const hasEngagers = data.ranking.some(group => group.engagers > 0);
            if(!hasEngagers && data.ranking.length > 0) {
                const groupToFix = data.ranking[0];
                if (groupToFix.visitors === 0) groupToFix.visitors = rand(10, 50);
                groupToFix.engagers = rand(1, groupToFix.visitors);
            }
            break;
        case "VISIBILITY_USER_GROUP_RANKING":
            if (!data.ranking || !Array.isArray(data.ranking) || data.ranking.length === 0) {
              data.ranking = [];
              const numGroups = rand(5, 8);
              const usedNames = new Set();
              while ( data.ranking.length < numGroups && usedNames.size < MOCK_GROUP_NAMES.length ) {
                const nameIndex = rand(0, MOCK_GROUP_NAMES.length - 1);
                const name = MOCK_GROUP_NAMES[nameIndex];
                if (!usedNames.has(name)) {
                  usedNames.add(name);
                  const potential = rand(50, 500);
                  data.ranking.push({
                    groupId: `mock-group-vis-${Date.now()}-${data.ranking.length}`,
                    groupName: name,
                    visitors: 0, 
                    potentialVisitors: potential,
                  });
                }
              }
            }
            if (data.ranking && Array.isArray(data.ranking)) {
              data.ranking.forEach((group) => {
                const potential = group.potentialVisitors > 0 ? group.potentialVisitors : group.visitors;
                if (potential > 0) {
                  let visPct = normalisePercentage( rand(MIN_PCT_FLOOR_INPUTS, MAX_DESIRED_PCT), MAX_DESIRED_PCT );
                  group.visitors = Math.round((visPct / 100) * potential);
                  group.visitors = Math.min(group.visitors, potential);
                  if (group.visitors === potential && potential > 0) {
                    group.visitors = Math.max( 0, potential - rand(1, Math.max(1, Math.floor(potential * 0.02)) + 1) );
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
            if(campaignId) {
                if (!injectedCampaignDataStore[campaignId]) {
                    injectedCampaignDataStore[campaignId] = {};
                }
                injectedCampaignDataStore[campaignId].userGroups = data.ranking;
            }
            break;
          case "SENTIMENT_OVERALL":
            if (campaignId && data && data.data) {
              const stored = injectedCampaignDataStore[campaignId];
              let baseCommenters = stored?.engagedUsers > 0 ? Math.floor(stored.engagedUsers * randFloat(0.05, 0.2)) : rand(5, 20);
              baseCommenters = Math.max(5, baseCommenters);
              data.data.uniqueCommenterCount = baseCommenters;
              data.data.labelPositiveCount = rand( Math.floor(baseCommenters * 0.2), baseCommenters );
              data.data.labelNegativeCount = rand( 0, Math.floor(baseCommenters * 0.3) );
              data.data.labelNeutralCount = rand( 0, Math.floor(baseCommenters * 0.4) );
              const sumLabels = data.data.labelPositiveCount + data.data.labelNegativeCount + data.data.labelNeutralCount;
              if (sumLabels === 0 && data.data.uniqueCommenterCount > 0)
                data.data.labelPositiveCount = data.data.uniqueCommenterCount;
              else if (sumLabels > data.data.uniqueCommenterCount) {
                data.data.labelPositiveCount = Math.floor( (data.data.labelPositiveCount * data.data.uniqueCommenterCount) / sumLabels );
                data.data.labelNegativeCount = Math.floor( (data.data.labelNegativeCount * data.data.uniqueCommenterCount) / sumLabels );
                data.data.labelNeutralCount = Math.max( 0, data.data.uniqueCommenterCount - data.data.labelPositiveCount - data.data.labelNegativeCount );
              }
            }
            break;
          case "SENTIMENT_TIMESERIES":
            if (data.data && Array.isArray(data.data)) {
              const overallEngaged = injectedCampaignDataStore[campaignId]?.engagedUsers || rand(20, 100);
              if ( data.data.length <= 3 && campaignId && (injectedCampaignDataStore[campaignId]?.visitors > 0 || data.data.some((d) => d.labelPositiveCount > 0)) ) {
                const numDaysToGenerate = rand(15, 30);
                const newTimeSeries = [];
                let startDate = new Date();
                if (data.data.length > 0 && data.data[0].date) {
                  startDate = new Date(data.data[0].date);
                  startDate.setDate( startDate.getDate() - Math.floor(numDaysToGenerate / 2) );
                } else {
                  startDate.setDate( startDate.getDate() - numDaysToGenerate + 1 );
                }
                for (let i = 0; i < numDaysToGenerate; i++) {
                  const currentDate = new Date(startDate);
                  currentDate.setDate(startDate.getDate() + i);
                  const dailyMaxComments = Math.max( 1, Math.ceil( (overallEngaged / numDaysToGenerate) * randFloat(0.1, 0.4) ) );
                  const totalSentimentsToday = rand(0, dailyMaxComments);
                  let pos = rand(0, totalSentimentsToday);
                  let neg = rand(0, Math.max(0, totalSentimentsToday - pos));
                  let neu = Math.max(0, totalSentimentsToday - pos - neg);
                  newTimeSeries.push({
                    date: currentDate.toISOString().split("T")[0] + "T00:00:00Z",
                    labelPositiveCount: pos,
                    labelNegativeCount: neg,
                    labelNeutralCount: neu,
                  });
                }
                data.data = newTimeSeries.sort( (a, b) => new Date(a.date) - new Date(b.date) );
              } else {
                data.data.forEach((dp) => {
                  const dailyMax = Math.max( 1, Math.ceil((overallEngaged / data.data.length) * 0.4) );
                  dp.labelPositiveCount = rand( 0, Math.max(dp.labelPositiveCount, rand(0, dailyMax)) );
                  dp.labelNegativeCount = rand( 0, Math.max( dp.labelNegativeCount, rand(0, Math.floor(dailyMax * 0.5)) ) );
                  dp.labelNeutralCount = rand( 0, Math.max( dp.labelNeutralCount, rand(0, Math.floor(dailyMax * 0.5)) ) );
                });
              }
            }
            break;
            case "VISIBILITY_TIMESERIES":
              if ( !data.timeseries || !Array.isArray(data.timeseries) || data.timeseries.length < 5 ) {
                const numPointsToGenerate = rand(15, 25);
                const newTimeSeries = [];
                const today = new Date();
                const startDate = new Date( today.setDate(today.getDate() - numPointsToGenerate) );
                for (let i = 0; i < numPointsToGenerate; i++) {
                  const currentDate = new Date(startDate);
                  currentDate.setDate(startDate.getDate() + i);
                  newTimeSeries.push({
                    date: currentDate.toISOString().split("T")[0] + "T00:00:00Z",
                    seenAtLeastOne: 0,
                    seenAtLeastTwo: 0,
                    seenAtLeastThree: 0,
                  });
                }
                data.timeseries = newTimeSeries;
              }
              const highVisibilityTarget = rand(50, 150);
              const dailyIncreases = data.timeseries.map(() => {
                const dailyIncreasePotential = rand( Math.floor(highVisibilityTarget * 0.01), Math.floor(highVisibilityTarget * 0.08) );
                const increaseOne = rand(1, dailyIncreasePotential);
                const increaseTwo = rand( 1, Math.floor(increaseOne * randFloat(0.4, 0.9)) );
                const increaseThree = rand( 0, Math.floor(increaseTwo * randFloat(0.3, 0.9)) );
                return { increaseOne, increaseTwo, increaseThree };
              });
  
              const totalIncreaseOne = dailyIncreases.reduce((sum, item) => sum + item.increaseOne, 0);
              if (totalIncreaseOne > 37) {
                  const ratio = 37 / totalIncreaseOne;
                  dailyIncreases.forEach(item => {
                      item.increaseOne = Math.floor(item.increaseOne * ratio);
                      item.increaseTwo = Math.floor(item.increaseTwo * ratio);
                      item.increaseThree = Math.floor(item.increaseThree * ratio);
                  });
              }
  
              let cumulativeOne = 0, cumulativeTwo = 0, cumulativeThree = 0;
              data.timeseries.forEach((ts, index) => {
                const daily = dailyIncreases[index];
                cumulativeOne += daily.increaseOne;
                cumulativeTwo += daily.increaseTwo;
                cumulativeThree += daily.increaseThree;
                cumulativeTwo = Math.min(cumulativeOne, cumulativeTwo);
                cumulativeThree = Math.min(cumulativeTwo, cumulativeThree);
                ts.seenAtLeastOne = cumulativeOne;
                ts.seenAtLeastTwo = cumulativeTwo;
                ts.seenAtLeastThree = cumulativeThree;
              });
              if (data.timeseries.length > 0) {
                const lastEntry = data.timeseries[data.timeseries.length - 1];
                if (lastEntry.seenAtLeastThree < 5) {
                  lastEntry.seenAtLeastThree = 5;
                }
                const minForSeenTwo = Math.max(3, lastEntry.seenAtLeastThree);
                if (lastEntry.seenAtLeastTwo < minForSeenTwo) {
                  lastEntry.seenAtLeastTwo = minForSeenTwo;
                }
                if (lastEntry.seenAtLeastOne < lastEntry.seenAtLeastTwo) {
                  lastEntry.seenAtLeastOne = lastEntry.seenAtLeastTwo;
                }
              }
  
              break;
          case "ENGAGEMENT_TIMESERIES":
            if ( !data.timeseries || !Array.isArray(data.timeseries) || data.timeseries.length < 5 ) {
              const numPointsToGenerate = rand(15, 25);
              const newTimeSeries = [];
              const today = new Date();
              const startDate = new Date( new Date().setDate(today.getDate() - numPointsToGenerate) );
              for (let i = 0; i < numPointsToGenerate; i++) {
                const currentDate = new Date(startDate);
                currentDate.setDate(startDate.getDate() + i);
                newTimeSeries.push({
                  date: currentDate.toISOString().split("T")[0] + "T00:00:00Z",
                  visitors: 0,
                  engagedUsers: 0,
                });
              }
              data.timeseries = newTimeSeries;
            }
            const overallVisitors = rand(50, 250);
            let hasActualData = false;
            data.timeseries.forEach((ts) => {
              const periodVisitors = rand( Math.floor(overallVisitors * 0.05), Math.floor(overallVisitors * 0.3) );
              const periodEngaged = rand( Math.floor(periodVisitors * 0.4), Math.floor(periodVisitors * 0.95) );
              ts.visitors = periodVisitors;
              ts.engagedUsers = Math.min(periodVisitors, periodEngaged);
              if (ts.visitors > 0) {
                hasActualData = true;
              }
            });
            if (!hasActualData && data.timeseries.length > 0) {
              const randomIndex = rand(0, data.timeseries.length - 1);
              data.timeseries[randomIndex].visitors = rand(5, 20);
              data.timeseries[randomIndex].engagedUsers = rand( 1, data.timeseries[randomIndex].visitors );
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
        console.error(
          INJECTED_LOG_PREFIX,
          "Error during interception for",
          url,
          "(" + matchedEndpointType + "):",
          err
        );
        return pageContextOriginalFetch.apply(this, args);
      }
    }
    return pageContextOriginalFetch.apply(this, args);
  };

  window.fetch = injectedCustomFetch;
  window.__REPLIFY_CAMPAIGNS_FETCH_APPLIED__ = true;
  
  // **NEW: Call the function to start the observer as soon as the script runs**
  forceRenderAlignmentChart();

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