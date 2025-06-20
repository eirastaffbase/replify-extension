// content/analytics/dashboard.js
(function () {
    'use strict';

    const INJECTED_LOG_PREFIX = '[Replify InjectedDashboardPatch]:';

    if (window.__REPLIFY_DASHBOARD_FETCH_APPLIED__) {
        return;
    }

    const pageContextOriginalFetch = window.fetch;
    if (!pageContextOriginalFetch) {
        console.error(INJECTED_LOG_PREFIX, 'CRITICAL: window.fetch is null/undefined in page context!');
        return;
    }

    const dashboardCache = {
        posts: null,
        comments: null,
        users: null,
        postStats: {}
    };

    const rand = (min, max) => {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    function getUrlParams(urlString) {
        const params = {};
        try {
            const url = new URL(urlString, window.location.origin);
            url.searchParams.forEach((value, key) => {
                params[key] = value;
            });
        } catch (e) { /* Ignore invalid URLs */ }
        return params;
    }

    // --- Data Generation ---

    function generateFakeUsers() {
        if (dashboardCache.users) return dashboardCache.users;
        dashboardCache.users = [
            { id: "user_1", firstName: "Alex", lastName: "Chen", position: "Lead Developer", department: "Technology", avatar: "https://i.pravatar.cc/150?u=user_1" },
            { id: "user_2", firstName: "Brenda", lastName: "Smith", position: "Marketing Manager", department: "Marketing", avatar: "https://i.pravatar.cc/150?u=user_2" },
            { id: "user_3", firstName: "Charles", lastName: "Davis", position: "HR Business Partner", department: "Human Resources", avatar: "https://i.pravatar.cc/150?u=user_3" },
            { id: "user_4", firstName: "Diana", lastName: "Miller", position: "Sales Director", department: "Sales", avatar: "https://i.pravatar.cc/150?u=user_4" }
        ];
        return dashboardCache.users;
    }

    function generateFakePosts(count = 5) {
        if (dashboardCache.posts) return dashboardCache.posts;
        const users = generateFakeUsers();
        const posts = [];
        const titles = [
            "Q3 All-Hands Meeting Scheduled for Next Week",
            "Important: New Employee Expense Policy",
            "Celebrating Our Team's Success in the Annual Charity Drive",
            "System Maintenance Alert: Intranet Downtime This Saturday",
            "Welcome to the New Summer Intern Cohort!"
        ];
        for (let i = 0; i < count; i++) {
            const author = users[rand(0, users.length - 1)];
            const postDate = new Date(Date.now() - i * 24 * 3600 * 1000 - rand(0, 24 * 3600 * 1000));
            const postId = `gen_post_${i}_${Date.now()}`;
            posts.push({
                id: postId,
                authorID: author.id,
                channelID: `gen_channel_${i}`,
                contents: {
                    en_US: {
                        title: titles[i] || `Generated Post Title ${i + 1}`,
                        teaser: `This is a short teaser for our latest news article. Click to read more about "${titles[i]}".`,
                        content: `<p>This is the full content for "<strong>${titles[i]}</strong>".</p>`,
                        image: { wide_first: { url: `https://picsum.photos/seed/${postId}/800/450` } }
                    }
                },
                author: { ...author, avatar: { thumb: { url: author.avatar } } },
                published: postDate.toISOString(),
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
        const commentTexts = ["Thanks for the update!", "This is great news!", "Can we get more info?", "Awesome work!", "Who should I contact about this?"];
        for (let i = 0; i < count; i++) {
            const author = users[rand(0, users.length - 1)];
            const post = posts[rand(0, posts.length - 1)];
            // FIX: Generate truly recent dates for comments
            const commentDate = new Date(Date.now() - rand(300000, 24 * 3600 * 1000)); // 5 mins ago to 24 hours ago
            comments.push({
                id: `gen_comment_${i}_${Date.now()}`,
                text: `<p>${commentTexts[i]}</p>`,
                authorID: author.id,
                parentID: post.id,
                rootID: post.id,
                installationID: post.channelID,
                parentType: "post",
                entityType: "comment",
                created: commentDate.toISOString(),
                rights: ["DELETE", "MODIFY"]
            });
        }
        dashboardCache.comments = comments.sort((a,b) => new Date(b.created) - new Date(a.created));
        return dashboardCache.comments;
    }
    
    // FIX: Function rewritten to match the correct data structure
    function generatePageRankings() {
        const pageData = [
            { id: `page_${rand(1000,9999)}`, title: "Home" },
            { id: `page_${rand(1000,9999)}`, title: "Company Directory" },
            { id: `page_${rand(1000,9999)}`, title: "IT Helpdesk" },
            { id: `page_${rand(1000,9999)}`, title: "My Benefits" },
            { id: `page_${rand(1000,9999)}`, title: "Submit Expense Report" }
        ];

        const entitiesContents = {};
        pageData.forEach(page => {
            entitiesContents[page.id] = { ...page, link: `/content/page/${page.id}` };
        });

        const ranking = pageData.map(page => ({
            group: { contentId: page.id, contentType: "page" },
            registeredVisitors: rand(50, 150),
            registeredVisits: rand(150, 500),
            unregisteredVisitors: 0,
            unregisteredVisits: 0
        })).sort((a, b) => b.registeredVisits - a.registeredVisits);

        return {
            entities: { contents: entitiesContents },
            ranking: ranking,
            contentType: { "page": { "id": "page", "icon": "n", "title": "Pages" } }
        };
    }

    // NEW: Function to generate rankings for posts
    function generatePostRankings() {
        const posts = dashboardCache.posts || generateFakePosts();
        if (!posts || posts.length === 0) return { entities: { contents: {} }, ranking: [] };

        const entitiesContents = {};
        posts.forEach(post => {
            entitiesContents[post.id] = { id: post.id, title: post.contents.en_US.title, link: `/content/news/article/${post.id}` };
        });

        const ranking = posts.map(post => ({
            group: { contentId: post.id, contentType: "post" },
            // FIX: Ensure every post has at least 5 visitors
            registeredVisitors: rand(5, 75),
            registeredVisits: rand(10, 200),
            unregisteredVisitors: 0,
            unregisteredVisits: 0
        })).sort((a, b) => b.registeredVisitors - a.registeredVisitors).slice(0, 5); // Take top 5

        return {
            entities: { contents: entitiesContents },
            ranking: ranking,
            contentType: { "post": { "id": "post", "icon": "n", "title": "Posts" } } // Mimic structure
        };
    }

    function getOrGeneratePostStats(postId) {
        if (dashboardCache.postStats[postId]) return dashboardCache.postStats[postId];
        const visitors = rand(5, 50);
        dashboardCache.postStats[postId] = {
            registeredVisitors: visitors,
            registeredVisits: visitors + rand(5, 50),
            comments: rand(0, 8),
            likes: rand(2, 30),
            newPosts: 1,
            shares: 0
        };
        return dashboardCache.postStats[postId];
    }

    // --- API Interception ---
    const TARGET_API_URLS = {
        POSTS: '/api/posts',
        COMMENTS: '/api/comments',
        USER_STATUS: '/api/branch/analytics/users/status',
        USERS_COUNT_BY_STATUS: /^\/api\/branch\/analytics\/users\/countByStatus/,
        RANKINGS: /^\/api\/branch\/analytics\/contents\/rankings/,
        POST_STATS: /^\/api\/branch\/analytics\/posts\/stats/
    };

    const injectedDashboardCustomFetch = async function(...args) {
        const resource = args[0];
        const requestFullUrl = typeof resource === 'string' ? resource : resource.url;
        let urlPath = '';

        try {
            urlPath = new URL(requestFullUrl, window.location.origin).pathname;
        } catch (e) {
            if (requestFullUrl.startsWith('/')) {
                urlPath = requestFullUrl.split('?')[0];
            } else {
                return pageContextOriginalFetch.apply(this, args);
            }
        }

        try {
            if (urlPath.endsWith(TARGET_API_URLS.POSTS)) {
                console.log(INJECTED_LOG_PREFIX, 'Intercepting POSTS');
                const originalResponse = await pageContextOriginalFetch.apply(this, args);
                if (!originalResponse.ok) throw new Error(`Original failed: ${originalResponse.status}`);
                const data = await originalResponse.clone().json();
                if (data && data.total > 0) {
                    dashboardCache.posts = data.data;
                    return originalResponse; 
                }
                const fakePosts = generateFakePosts();
                return new Response(JSON.stringify({ total: fakePosts.length, data: fakePosts }), { status: 200, headers: {'Content-Type': 'application/json'} });
            }
            
            if (urlPath.endsWith(TARGET_API_URLS.COMMENTS)) {
                console.log(INJECTED_LOG_PREFIX, 'Intercepting COMMENTS');
                const originalResponse = await pageContextOriginalFetch.apply(this, args);
                if (!originalResponse.ok) throw new Error(`Original failed: ${originalResponse.status}`);
                const data = await originalResponse.clone().json();
                if (data && data.total > 0) return originalResponse;
                const fakeComments = generateFakeComments();
                return new Response(JSON.stringify({ total: fakeComments.length, data: fakeComments }), { status: 200, headers: {'Content-Type': 'application/json'} });
            }
            
            if (TARGET_API_URLS.RANKINGS.test(urlPath)) {
                const urlParams = getUrlParams(requestFullUrl);
                const filter = decodeURIComponent(urlParams.filter || '');
                // NEW: Handle post rankings specifically
                if (filter.includes('contentType%20eq%20%22post%22')) {
                    console.log(INJECTED_LOG_PREFIX, 'Intercepting POST RANKINGS');
                    const fakeData = generatePostRankings();
                    return new Response(JSON.stringify(fakeData), { status: 200, headers: {'Content-Type': 'application/json'} });
                }
                // Handle page rankings
                if (filter.includes('contentType%20eq%20%22page%22')) {
                    console.log(INJECTED_LOG_PREFIX, 'Intercepting PAGE RANKINGS');
                    const fakeData = generatePageRankings();
                    return new Response(JSON.stringify(fakeData), { status: 200, headers: {'Content-Type': 'application/json'} });
                }
            }
            
            if (urlPath.endsWith(TARGET_API_URLS.USER_STATUS)) {
                return new Response(JSON.stringify({ "activated": rand(240, 260), "pending": rand(1, 5) }), { status: 200, headers: {'Content-Type': 'application/json'} });
            }
            
            if (TARGET_API_URLS.USERS_COUNT_BY_STATUS.test(urlPath)) {
                return new Response(JSON.stringify({ "count": rand(2, 10) }), { status: 200, headers: {'Content-Type': 'application/json'} });
            }

            if (TARGET_API_URLS.POST_STATS.test(urlPath)) {
                const urlParams = getUrlParams(requestFullUrl);
                const filter = decodeURIComponent(urlParams.filter || '');
                const postIdMatch = filter.match(/postId eq "([^"]+)"/);
                if (postIdMatch && postIdMatch[1]) {
                    const postId = postIdMatch[1];
                    const originalResponse = await pageContextOriginalFetch.apply(this, args);
                    if (originalResponse.ok) {
                        const realStats = await originalResponse.clone().json();
                        if (realStats && realStats.registeredVisitors > 0) return originalResponse;
                    }
                    const fakeData = getOrGeneratePostStats(postId);
                    return new Response(JSON.stringify(fakeData), { status: 200, headers: {'Content-Type': 'application/json'} });
                }
            }

        } catch (err) {
            console.warn(INJECTED_LOG_PREFIX, 'Could not intercept, falling back. Reason:', err.message);
        }
        
        return pageContextOriginalFetch.apply(this, args);
    };

    window.fetch = injectedDashboardCustomFetch;
    window.__REPLIFY_DASHBOARD_FETCH_APPLIED__ = true;
    console.log(INJECTED_LOG_PREFIX, 'Dashboard fetch override applied.');

    window.__REPLIFY_REVERT_DASHBOARD_FETCH__ = function() {
        if (window.fetch === injectedDashboardCustomFetch) {
            window.fetch = pageContextOriginalFetch;
            delete window.__REPLIFY_DASHBOARD_FETCH_APPLIED__;
            delete window.__REPLIFY_REVERT_DASHBOARD_FETCH__;
            console.log(INJECTED_LOG_PREFIX, 'Dashboard fetch restored.');
            return true;
        }
        return false;
    };
})();