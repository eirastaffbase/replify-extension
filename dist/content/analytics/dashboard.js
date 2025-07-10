(function () {
    "use strict";
  
    const INJECTED_LOG_PREFIX = "[Replify InjectedDashboardPatch]:";
  
    if (window.__REPLIFY_DASHBOARD_FETCH_APPLIED__) {
      return;
    }
  
    const pageContextOriginalFetch = window.fetch;
    if (!pageContextOriginalFetch) {
      console.error(
        INJECTED_LOG_PREFIX,
        "CRITICAL: window.fetch is null/undefined in page context!"
      );
      return;
    }
  
    const dashboardCache = {
      posts: null,
      comments: null,
      users: null,
    };
  
    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  
    function getUrlParams(urlString) {
      const params = {};
      try {
        const url = new URL(urlString, window.location.origin);
        url.searchParams.forEach((value, key) => (params[key] = value));
      } catch (e) {
        /* Ignore */
      }
      return params;
    }
  
    // --- Data Generation ---
  
    function generateFakeUsers() {
      if (dashboardCache.users) return dashboardCache.users;
      dashboardCache.users = [
        {
          id: "user_1",
          firstName: "Alex",
          lastName: "Chen",
          position: "Lead Developer",
          department: "Technology",
          avatar: "https://i.pravatar.cc/150?u=user_1",
        },
        {
          id: "user_2",
          firstName: "Brenda",
          lastName: "Smith",
          position: "Marketing Manager",
          department: "Marketing",
          avatar: "https://i.pravatar.cc/150?u=user_2",
        },
        {
          id: "user_3",
          firstName: "Charles",
          lastName: "Davis",
          position: "HR Business Partner",
          department: "Human Resources",
          avatar: "https://i.pravatar.cc/150?u=user_3",
        },
        {
          id: "user_4",
          firstName: "Diana",
          lastName: "Miller",
          position: "Sales Director",
          department: "Sales",
          avatar: "https://i.pravatar.cc/150?u=user_4",
        },
      ];
      return dashboardCache.users;
    }
  
    function generateFakePosts(count = 5) {
      if (dashboardCache.posts) return dashboardCache.posts;
      const users = generateFakeUsers();
      const posts = [];
      const titles = [
        "Q3 All-Hands Meeting Review",
        "New Employee Expense Policy Deployed",
        "Charity Drive Exceeds Goals!",
        "Weekend System Maintenance: Reminder",
        "Welcome New Summer Interns!",
      ];
      for (let i = 0; i < count; i++) {
        const author = users[rand(0, users.length - 1)];
        const postDate = new Date(
          Date.now() - i * 48 * 3600 * 1000 - rand(0, 24 * 3600 * 1000)
        );
        const postId = `gen_post_${i}_${Date.now()}`;
        const channelId = `gen_channel_${i}`;
  
        posts.push({
          id: postId,
          branchID: "gen_branch_1",
          channelID: channelId,
          authorID: author.id,
          contents: {
            en_US: {
              title: titles[i] || `Generated Post Title ${i + 1}`,
              teaser: `This is a short teaser for our latest news article about "${
                titles[i]
              }".`,
              content: `<p>This is the full content for "<strong>${
                titles[i]
              }</strong>".</p><p>Here you would find more details, paragraphs, and maybe some lists or other rich text elements to make the post more engaging for all employees.</p>`,
              image: {
                wide_first: {
                  url: `https://picsum.photos/seed/${postId}/800/450`,
                },
              },
            },
          },
          author: {
            ...author,
            entityType: "user",
            avatar: { thumb: { url: author.avatar } },
          },
          channel: {
            id: channelId,
            pluginID: "news",
            config: { localization: { en_US: { title: "Company News" } } },
          },
          published: postDate.toISOString(),
          updated: new Date(
            postDate.getTime() + rand(1000, 60000)
          ).toISOString(),
          entityType: "post",
          highlighted: i === 0,
          commentingAllowed: true,
          likingAllowed: true,
          sharingAllowed: true,
          acknowledgingEnabled: false,
          links: {
            detail_view: { href: `/openlink/content/news/article/${postId}` },
          },
          rights: ["DELETE", "MODIFY"],
        });
      }
      dashboardCache.posts = posts;
      return posts;
    }
  
    function generateFakeComments(count = 5) {
      if (dashboardCache.comments) return dashboardCache.comments;
      const users = generateFakeUsers();
      const posts = dashboardCache.posts || generateFakePosts();
      if (!posts || posts.length === 0) return [];
      const comments = [];
      const commentTexts = [
        "Thanks for sharing this!",
        "This is great news!",
        "Finally! Been waiting for this.",
        "Awesome work, team!",
        "Who should I contact for more details?",
      ];
      for (let i = 0; i < count; i++) {
        const author = users[rand(0, users.length - 1)];
        const post = posts[rand(0, posts.length - 1)];
        const createdDate = new Date(
          Date.now() - rand(3600 * 1000, 7 * 24 * 3600 * 1000)
        ); // 1 hour to 7 days ago
        comments.push({
          id: `gen_comment_${i}_${Date.now()}`,
          installationID: post.channelID,
          parentID: post.id,
          parentType: "post",
          author, // Embed full author object
          authorID: author.id,
          published: true,
          status: "PUBLISHED",
          text: `<p>${commentTexts[i]}</p>`,
          reportsCount: 0,
          rootID: post.id,
          entityType: "comment",
          created: createdDate.toISOString(),
          updated: new Date(
            createdDate.getTime() + rand(1000, 60000)
          ).toISOString(),
          links: {},
          rights: ["DELETE", "MODIFY"],
        });
      }
      dashboardCache.comments = comments.sort(
        (a, b) => new Date(b.created) - new Date(a.created)
      );
      return dashboardCache.comments;
    }
  
    function generatePageRankings() {
      /* ... unchanged ... */ return {
        entities: {
          contents: {
            page_1: { id: "page_1", title: "Home", link: "/content/page/page_1" },
            page_2: {
              id: "page_2",
              title: "Directory",
              link: "/content/page/page_2",
            },
          },
        },
        ranking: [
          {
            group: { contentId: "page_1", contentType: "page" },
            registeredVisitors: rand(50, 150),
            registeredVisits: rand(150, 500),
            unregisteredVisitors: 0,
            unregisteredVisits: 0,
          },
          {
            group: { contentId: "page_2", contentType: "page" },
            registeredVisitors: rand(40, 100),
            registeredVisits: rand(100, 300),
            unregisteredVisitors: 0,
            unregisteredVisits: 0,
          },
        ],
        contentType: { page: { id: "page", icon: "n", title: "Pages" } },
      };
    }
    function generatePostRankings() {
      /* ... unchanged ... */ const p =
        dashboardCache.posts || generateFakePosts();
      if (!p || p.length === 0)
        return { entities: { contents: {} }, ranking: [] };
      const e = {};
      p.forEach((t) => {
        e[t.id] = {
          id: t.id,
          title: t.contents.en_US.title,
          link: `/content/news/article/${t.id}`,
        };
      });
      const n = p
        .map((t) => ({
          group: { contentId: t.id, contentType: "post" },
          registeredVisitors: rand(5, 75),
          registeredVisits: rand(10, 200),
          unregisteredVisitors: 0,
          unregisteredVisits: 0,
        }))
        .sort((t, o) => o.registeredVisitors - t.registeredVisitors)
        .slice(0, 5);
      return {
        entities: { contents: e },
        ranking: n,
        contentType: { post: { id: "post", icon: "n", title: "Posts" } },
      };
    }
    function generateCustomPostRankings() {
      const p = dashboardCache.posts || generateFakePosts();
      if (!p || p.length === 0) return { ranking: [] };
      const r = p.slice(0, 4).map((t) => ({
        id: t.id,
        visitors: rand(5, 75),
        potentialVisitors: rand(250, 300),
      }));
      return { ranking: r };
    }
  
    // NEW: Generates fake view/comment/like counts for a post.
    function generateFakePostStats(postId) {
      const commentsForPost = (dashboardCache.comments || []).filter(
        (c) => c.parentID === postId
      ).length;
      const visitors = rand(25, 150);
      const visits = visitors + rand(20, 100);
  
      return {
        registeredVisitors: visitors,
        registeredVisits: visits,
        newPosts: 1,
        comments: commentsForPost > 0 ? commentsForPost : rand(0, 15),
        likes: rand(10, 80),
        shares: 0,
      };
    }
  
    // --- DOM Manipulation for Empty Reach Tab ---
  
    function populateEmptyReachTab() {
      const reachTabPanel = document.querySelector("#panel-id-0");
      // Ensure panel and its list exist before proceeding
      if (!reachTabPanel) return;
  
      const postList = reachTabPanel.querySelector("ul");
      // Check if the list is truly empty
      if (!postList || postList.children.length > 0) {
        return;
      }
  
      console.log(
        INJECTED_LOG_PREFIX,
        "Reach tab is empty. Populating with custom ranking data."
      );
  
      // Use cached posts or generate them if cache is empty
      const posts = dashboardCache.posts || generateFakePosts();
      const rankings = generateCustomPostRankings().ranking;
  
      if (!posts.length || !rankings.length) {
        console.log(INJECTED_LOG_PREFIX, "No post or ranking data available.");
        return;
      }
  
      // Combine post details with their ranking stats
      const combinedData = rankings
        .map((rank) => {
          const post = posts.find((p) => p.id === rank.id);
          if (!post) return null;
          return {
            ...post,
            visitors: rank.visitors,
            potentialVisitors: rank.potentialVisitors,
            percentage: Math.round(
              (rank.visitors / rank.potentialVisitors) * 100
            ),
          };
        })
        .filter(Boolean); // Remove nulls for posts not found
  
      let newContent = "";
      combinedData.forEach((item) => {
        const imageUrl =
          item.contents?.en_US?.image?.wide_first?.url.replace(
            "800/450",
            "240/135"
          ) ||
          "https://app.staffbase.com/api/media/secure/external/v2/image/upload/g_faces:center,c_fill,w_240,h_135/684b04bcc712a807851af13a.jpg";
        const postUrl = item.links?.detail_view?.href || "#";
        const title = item.contents?.en_US?.title || "Untitled Post";
  
        newContent += `
            <li class="flex min-w-0 items-center leading-18">
              <section class="flex min-w-0 flex-1 items-center">
                <div class="me-12 size-[48px] rounded-6 bg-cover bg-center bg-no-repeat" style="background-image: url('${imageUrl}');"></div>
                <div class="flex min-w-0 flex-1 flex-col">
                  <header class="mb-4 truncate text-body-sm text-neutral-strong">
                    <span tabindex="0" data-state="closed">
                      <a class="font-medium text-neutral-strong hover:underline" href="${postUrl}" target="_blank" rel="noreferrer">${title}</a>
                    </span>
                  </header>
                  <ul class="flex text-12 leading-16 text-neutral-medium">
                    <li class="ms-12 flex items-center first-of-type:m-0 [&amp;_svg]:text-icon-neutral-medium">
                      <svg aria-hidden="true" viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" class="ds-icon ds-icon-user-group me-4 shrink-0"><path d="M13.75,7.75a6.194,6.194,0,0,1-.663,2.789.5.5,0,0,0,.1.579A4.7,4.7,0,0,0,16.5,12.5a4.75,4.75,0,0,0,0-9.5,4.7,4.7,0,0,0-3.318,1.382.5.5,0,0,0-.1.579A6.194,6.194,0,0,1,13.75,7.75Z"></path><path d="M16.5,13a7.4,7.4,0,0,0-2.377.393.5.5,0,0,0-.2.823A8.957,8.957,0,0,1,16.5,20.5a.5.5,0,0,0,.5.5h6.5a.5.5,0,0,0,.5-.5A7.508,7.508,0,0,0,16.5,13Z"></path><circle cx="7.5" cy="7.75" r="4.75"></circle><path d="M15,20.5a7.5,7.5,0,0,0-15,0,.5.5,0,0,0,.5.5h14A.5.5,0,0,0,15,20.5Z"></path></svg>
                      <span>${item.visitors} Visitors</span>
                    </li>
                    <li class="ms-12 flex items-center first-of-type:m-0 [&amp;_svg]:text-icon-neutral-medium">
                     <svg aria-hidden="true" viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" class="ds-icon ds-icon-user-group me-4 shrink-0"><path d="M13.75,7.75a6.194,6.194,0,0,1-.663,2.789.5.5,0,0,0,.1.579A4.7,4.7,0,0,0,16.5,12.5a4.75,4.75,0,0,0,0-9.5,4.7,4.7,0,0,0-3.318,1.382.5.5,0,0,0-.1.579A6.194,6.194,0,0,1,13.75,7.75Z"></path><path d="M16.5,13a7.4,7.4,0,0,0-2.377.393.5.5,0,0,0-.2.823A8.957,8.957,0,0,1,16.5,20.5a.5.5,0,0,0,.5.5h6.5a.5.5,0,0,0,.5-.5A7.508,7.508,0,0,0,16.5,13Z"></path><circle cx="7.5" cy="7.75" r="4.75"></circle><path d="M15,20.5a7.5,7.5,0,0,0-15,0,.5.5,0,0,0,.5.5h14A.5.5,0,0,0,15,20.5Z"></path></svg>
                      <span>${item.potentialVisitors} Potential Reach</span>
                    </li>
                  </ul>
                </div>
                <div class="group ms-12 flex flex-col items-center [&amp;_div]:bg-[linear-gradient(to_right,_var(--sb-color-sbBlue-400)_var(--progress),_var(--sb-color-grey-100)_0)]" tabindex="0" data-state="closed" style="--progress: ${item.percentage}%;">
                  <span class="mb-8 text-12 font-medium leading-16 text-[#75777b] group-hover:text-[#0078b8]">${item.percentage}%</span>
                  <div class="h-[8px] w-[80px] overflow-hidden rounded-[2px] group-hover:bg-[linear-gradient(to_right,_var(--sb-color-sbBlue-500)_var(--progress),_var(--sb-color-grey-100)_0)]"></div>
                </div>
              </section>
            </li>
          `;
      });
  
      postList.innerHTML = newContent;
    }
  
    // --- API Interception ---
    const TARGET_API_URLS = {
      POSTS: "/api/posts",
      COMMENTS: "/api/comments",
      POST_DETAIL: /^\/api\/posts\/(gen_post_[a-zA-Z0-9_]+)$/,
      POST_STATS: /^\/api\/branch\/analytics\/posts\/stats/, // NEW
      USER_STATUS: "/api/branch/analytics/users/status",
      USERS_COUNT_BY_STATUS: /^\/api\/branch\/analytics\/users\/countByStatus/,
      RANKINGS: /^\/api\/branch\/analytics\/contents\/rankings/,
      CUSTOM_POST_RANKINGS: /^\/api\/branch\/analytics\/posts\/rankings\/custom/,
    };
  
    const injectedDashboardCustomFetch = async function (...args) {
      const resource = args[0];
      const requestFullUrl =
        typeof resource === "string" ? resource : resource.url;
      let urlPath = "";
  
      try {
        urlPath = new URL(requestFullUrl, window.location.origin).pathname;
      } catch (e) {
        urlPath = requestFullUrl.startsWith("/")
          ? requestFullUrl.split("?")[0]
          : "";
      }
  
      try {
        const postDetailMatch = urlPath.match(TARGET_API_URLS.POST_DETAIL);
        if (postDetailMatch) {
          const postId = postDetailMatch[1];
          console.log(
            INJECTED_LOG_PREFIX,
            `Intercepting DETAIL for generated post: ${postId}`
          );
          const posts = dashboardCache.posts || generateFakePosts();
          const post = posts.find((p) => p.id === postId);
          if (post) {
            return new Response(JSON.stringify(post), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }
          return new Response(
            JSON.stringify({
              message: `Generated post ${postId} not found in cache.`,
            }),
            { status: 404, headers: { "Content-Type": "application/json" } }
          );
        }
  
        if (urlPath.endsWith(TARGET_API_URLS.POSTS)) {
          const originalResponse = await pageContextOriginalFetch.apply(
            this,
            args
          );
          if (originalResponse.ok) {
            const data = await originalResponse.clone().json();
            if (data && data.total > 0) {
              const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
              const hasRecentPosts = data.data.some(
                (post) => new Date(post.published) > sevenDaysAgo
              );
  
              if (!hasRecentPosts) {
                console.log(
                  INJECTED_LOG_PREFIX,
                  "No recent posts found. Modifying dates of latest posts."
                );
                const modifiedPosts = data.data.slice(0, 5);
                modifiedPosts.forEach((post, i) => {
                  const newDate = new Date(
                    Date.now() - i * 24 * 3600 * 1000 - rand(0, 12 * 3600 * 1000)
                  );
                  post.published = newDate.toISOString();
                  post.created = newDate.toISOString();
                  post.updated = newDate.toISOString();
                });
                dashboardCache.posts = modifiedPosts;
                return new Response(
                  JSON.stringify({
                    ...data,
                    data: modifiedPosts,
                    total: modifiedPosts.length,
                  }),
                  { status: 200, headers: { "Content-Type": "application/json" } }
                );
              }
              dashboardCache.posts = data.data;
              return originalResponse;
            }
          }
          console.log(
            INJECTED_LOG_PREFIX,
            "No real posts found. Generating fake posts."
          );
          const fakePosts = generateFakePosts();
          return new Response(
            JSON.stringify({
              total: fakePosts.length,
              data: fakePosts,
              links: {},
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
  
        if (urlPath.endsWith(TARGET_API_URLS.COMMENTS)) {
          const originalResponse = await pageContextOriginalFetch.apply(
            this,
            args
          );
          if (originalResponse.ok) {
            const data = await originalResponse.clone().json();
            if (data && data.total > 0) {
              const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
              const hasRecentComments = data.data.some(
                (comment) => new Date(comment.created) > sevenDaysAgo
              );
              let commentsToReturn = data.data;
  
              if (!hasRecentComments) {
                console.log(
                  INJECTED_LOG_PREFIX,
                  "No recent comments found. Modifying dates of latest comments."
                );
                commentsToReturn = data.data.slice(0, 5);
                commentsToReturn.forEach((comment, i) => {
                  const newDate = new Date(
                    Date.now() -
                      rand(3600 * 1000, i * 6 * 3600 * 1000 + 3600 * 1000)
                  );
                  comment.created = newDate.toISOString();
                  comment.updated = newDate.toISOString();
                });
              }
  
              const users = generateFakeUsers();
              commentsToReturn.forEach((comment) => {
                comment.author =
                  users.find((u) => u.id.endsWith(comment.authorID.slice(-1))) ||
                  users[0];
              });
  
              dashboardCache.comments = commentsToReturn;
              return new Response(
                JSON.stringify({
                  ...data,
                  data: commentsToReturn,
                  total: commentsToReturn.length,
                }),
                { status: 200, headers: { "Content-Type": "application/json" } }
              );
            }
          }
          console.log(
            INJECTED_LOG_PREFIX,
            "No real comments found. Generating fake comments."
          );
          const fakeComments = generateFakeComments();
          return new Response(
            JSON.stringify({
              total: fakeComments.length,
              data: fakeComments,
              links: {},
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
  
        // NEW: Intercepts requests for post stats and returns fake data.
        if (TARGET_API_URLS.POST_STATS.test(urlPath)) {
          console.log(INJECTED_LOG_PREFIX, "Intercepting POST STATS");
          const urlParams = getUrlParams(requestFullUrl);
          const filter = decodeURIComponent(urlParams.filter || "");
          const postIdMatch = filter.match(/postId eq "([^"]+)"/);
  
          if (postIdMatch && postIdMatch[1]) {
            const postId = postIdMatch[1];
            const fakeData = generateFakePostStats(postId);
            return new Response(JSON.stringify(fakeData), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }
        }
  
        if (TARGET_API_URLS.CUSTOM_POST_RANKINGS.test(urlPath)) {
          console.log(INJECTED_LOG_PREFIX, "Intercepting CUSTOM POST RANKINGS");
          const fakeData = generateCustomPostRankings();
          return new Response(JSON.stringify(fakeData), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
  
        if (TARGET_API_URLS.RANKINGS.test(urlPath)) {
          const urlParams = getUrlParams(requestFullUrl);
          const filter = decodeURIComponent(urlParams.filter || "");
          if (filter.includes("contentType%20eq%20%22post%22")) {
            const fakeData = generatePostRankings();
            return new Response(JSON.stringify(fakeData), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }
          if (filter.includes("contentType%20eq%20%22page%22")) {
            const fakeData = generatePageRankings();
            return new Response(JSON.stringify(fakeData), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }
        }
  
        if (urlPath.endsWith(TARGET_API_URLS.USER_STATUS)) {
          return new Response(
            JSON.stringify({ activated: rand(240, 260), pending: rand(1, 5) }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
  
        if (TARGET_API_URLS.USERS_COUNT_BY_STATUS.test(urlPath)) {
          return new Response(JSON.stringify({ count: rand(2, 10) }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
      } catch (err) {
        console.warn(
          INJECTED_LOG_PREFIX,
          "Could not intercept, falling back. Reason:",
          err.message
        );
      }
  
      return pageContextOriginalFetch.apply(this, args);
    };
  
    // --- DOM Observer to Populate Empty Tabs ---
    const observerTarget = document.getElementById("tab-topposts");
    if (observerTarget) {
      const observer = new MutationObserver(() => {
        // Use a small delay to allow the UI to finish rendering after a tab switch
        setTimeout(populateEmptyReachTab, 100);
      });
      observer.observe(observerTarget, { childList: true, subtree: true });
      // Initial check after page loads
      setTimeout(populateEmptyReachTab, 1000);
    } else {
      // Fallback if the main element isn't immediately available
      setTimeout(populateEmptyReachTab, 2000);
    }
  
    window.fetch = injectedDashboardCustomFetch;
    window.__REPLIFY_DASHBOARD_FETCH_APPLIED__ = true;
    console.log(INJECTED_LOG_PREFIX, "Dashboard fetch override applied.");
  
    window.__REPLIFY_REVERT_DASHBOARD_FETCH__ = function () {
      if (window.fetch === injectedDashboardCustomFetch) {
        window.fetch = pageContextOriginalFetch;
        delete window.__REPLIFY_DASHBOARD_FETCH_APPLIED__;
        delete window.__REPLIFY_REVERT_DASHBOARD_FETCH__;
        console.log(INJECTED_LOG_PREFIX, "Dashboard fetch restored.");
        return true;
      }
      return false;
    };
  })();