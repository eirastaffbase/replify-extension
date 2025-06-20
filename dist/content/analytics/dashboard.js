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
        users: null
    };

    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    function getUrlParams(urlString) {
        const params = {};
        try {
            const url = new URL(urlString, window.location.origin);
            url.searchParams.forEach((value, key) => params[key] = value);
        } catch (e) { /* Ignore */ }
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

    // FIX: Greatly enhanced to create full post objects for the detail view
    function generateFakePosts(count = 5) {
        if (dashboardCache.posts) return dashboardCache.posts;
        const users = generateFakeUsers();
        const posts = [];
        const titles = ["Q3 All-Hands Meeting Review", "New Employee Expense Policy Deployed", "Charity Drive Exceeds Goals!", "Weekend System Maintenance: Reminder", "Welcome New Summer Interns!"];
        for (let i = 0; i < count; i++) {
            const author = users[rand(0, users.length - 1)];
            const postDate = new Date(Date.now() - i * 48 * 3600 * 1000 - rand(0, 24 * 3600 * 1000));
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
                        teaser: `This is a short teaser for our latest news article about "${titles[i]}".`,
                        content: `<p>This is the full content for "<strong>${titles[i]}</strong>".</p><p>Here you would find more details, paragraphs, and maybe some lists or other rich text elements to make the post more engaging for all employees.</p>`,
                        image: { wide_first: { url: `https://picsum.photos/seed/${postId}/800/450` } }
                    }
                },
                author: { ...author, entityType: 'user', avatar: { thumb: { url: author.avatar } } },
                channel: { id: channelId, pluginID: "news", config: { localization: { en_US: { title: "Company News" } } } },
                published: postDate.toISOString(),
                updated: new Date(postDate.getTime() + rand(1000, 60000)).toISOString(),
                entityType: "post",
                highlighted: i === 0,
                commentingAllowed: true,
                likingAllowed: true,
                sharingAllowed: true,
                acknowledgingEnabled: false,
                links: { detail_view: { href: `/openlink/content/news/article/${postId}` } },
                rights: ["DELETE", "MODIFY"]
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
        const commentTexts = ["Thanks for sharing this!", "This is great news!", "Finally! Been waiting for this.", "Awesome work, team!", "Who should I contact for more details?"];
        for (let i = 0; i < count; i++) {
            const author = users[rand(0, users.length - 1)];
            const post = posts[rand(0, posts.length - 1)];
            const createdDate = new Date(Date.now() - rand(3600 * 1000, 7 * 24 * 3600 * 1000)); // 1 hour to 7 days ago
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
                updated: new Date(createdDate.getTime() + rand(1000, 60000)).toISOString(),
                links: {},
                rights: ["DELETE", "MODIFY"]
            });
        }
        dashboardCache.comments = comments.sort((a,b) => new Date(b.created) - new Date(a.created));
        return dashboardCache.comments;
    }
    
    function generatePageRankings() { /* ... unchanged ... */ return { entities: { contents: { "page_1": { id: "page_1", title: "Home", link: "/content/page/page_1" }, "page_2": { id: "page_2", title: "Directory", link: "/content/page/page_2" } } }, ranking: [{ group: { contentId: "page_1", contentType: "page" }, registeredVisitors: rand(50, 150), registeredVisits: rand(150, 500), unregisteredVisitors: 0, unregisteredVisits: 0 }, { group: { contentId: "page_2", contentType: "page" }, registeredVisitors: rand(40, 100), registeredVisits: rand(100, 300), unregisteredVisitors: 0, unregisteredVisits: 0 }], contentType: { "page": { "id": "page", "icon": "n", "title": "Pages" } } }; }
    function generatePostRankings() { /* ... unchanged ... */ const p=dashboardCache.posts||generateFakePosts();if(!p||p.length===0)return{entities:{contents:{}},ranking:[]};const e={};p.forEach(t=>{e[t.id]={id:t.id,title:t.contents.en_US.title,link:`/content/news/article/${t.id}`}});const n=p.map(t=>({group:{contentId:t.id,contentType:"post"},registeredVisitors:rand(5,75),registeredVisits:rand(10,200),unregisteredVisitors:0,unregisteredVisits:0})).sort((t,o)=>o.registeredVisitors-t.registeredVisitors).slice(0,5);return{entities:{contents:e},ranking:n,contentType:{post:{id:"post",icon:"n",title:"Posts"}}}; }
    function generateCustomPostRankings() { /* ... unchanged ... */ const p=dashboardCache.posts||generateFakePosts();if(!p||p.length===0)return{ranking:[]};const r=p.slice(0,4).map(t=>({id:t.id,visitors:rand(5,75),potentialVisitors:rand(250,300)}));return{ranking:r}; }

    // --- API Interception ---
    const TARGET_API_URLS = {
        POSTS: '/api/posts',
        COMMENTS: '/api/comments',
        // FIX: Regex to specifically catch generated post detail requests
        POST_DETAIL: /^\/api\/posts\/(gen_post_[a-zA-Z0-9_]+)$/,
        USER_STATUS: '/api/branch/analytics/users/status',
        USERS_COUNT_BY_STATUS: /^\/api\/branch\/analytics\/users\/countByStatus/,
        RANKINGS: /^\/api\/branch\/analytics\/contents\/rankings/,
        CUSTOM_POST_RANKINGS: /^\/api\/branch\/analytics\/posts\/rankings\/custom/
    };

    const injectedDashboardCustomFetch = async function(...args) {
        const resource = args[0];
        const requestFullUrl = typeof resource === 'string' ? resource : resource.url;
        let urlPath = '';

        try {
            urlPath = new URL(requestFullUrl, window.location.origin).pathname;
        } catch (e) {
            urlPath = requestFullUrl.startsWith('/') ? requestFullUrl.split('?')[0] : '';
        }

        try {
            // FIX: New interception for individual generated post details
            const postDetailMatch = urlPath.match(TARGET_API_URLS.POST_DETAIL);
            if (postDetailMatch) {
                const postId = postDetailMatch[1];
                console.log(INJECTED_LOG_PREFIX, `Intercepting DETAIL for generated post: ${postId}`);
                const posts = dashboardCache.posts || generateFakePosts(); // Ensure cache is populated
                const post = posts.find(p => p.id === postId);
                if (post) {
                    return new Response(JSON.stringify(post), { status: 200, headers: {'Content-Type': 'application/json'} });
                }
                // If not found for some reason, return a 404
                return new Response(JSON.stringify({ message: `Generated post ${postId} not found in cache.` }), { status: 404, headers: {'Content-Type': 'application/json'} });
            }

            // This must come AFTER the POST_DETAIL check
            if (urlPath.endsWith(TARGET_API_URLS.POSTS)) {
                const originalResponse = await pageContextOriginalFetch.apply(this, args);
                if (originalResponse.ok) {
                    const data = await originalResponse.clone().json();
                    if (data && data.total > 0) {
                        dashboardCache.posts = data.data;
                        return originalResponse; 
                    }
                }
                const fakePosts = generateFakePosts();
                return new Response(JSON.stringify({ total: fakePosts.length, data: fakePosts, links: {} }), { status: 200, headers: {'Content-Type': 'application/json'} });
            }
            
            if (urlPath.endsWith(TARGET_API_URLS.COMMENTS)) {
                const originalResponse = await pageContextOriginalFetch.apply(this, args);
                if (originalResponse.ok) {
                    const data = await originalResponse.clone().json();
                    if (data && data.total > 0) {
                         // Add full author object to real comments for UI consistency
                        const users = generateFakeUsers();
                        data.data.forEach(comment => {
                           comment.author = users.find(u => u.id.endsWith(comment.authorID.slice(-1))) || users[0];
                        });
                        return new Response(JSON.stringify(data), { status: 200, headers: {'Content-Type': 'application/json'} });
                    }
                }
                const fakeComments = generateFakeComments();
                return new Response(JSON.stringify({ total: fakeComments.length, data: fakeComments, links: {} }), { status: 200, headers: {'Content-Type': 'application/json'} });
            }

            if (TARGET_API_URLS.CUSTOM_POST_RANKINGS.test(urlPath)) {
                console.log(INJECTED_LOG_PREFIX, 'Intercepting CUSTOM POST RANKINGS');
                const fakeData = generateCustomPostRankings();
                return new Response(JSON.stringify(fakeData), { status: 200, headers: {'Content-Type': 'application/json'} });
            }
            
            if (TARGET_API_URLS.RANKINGS.test(urlPath)) {
                const urlParams = getUrlParams(requestFullUrl);
                const filter = decodeURIComponent(urlParams.filter || '');
                if (filter.includes('contentType%20eq%20%22post%22')) {
                    const fakeData = generatePostRankings();
                    return new Response(JSON.stringify(fakeData), { status: 200, headers: {'Content-Type': 'application/json'} });
                }
                if (filter.includes('contentType%20eq%20%22page%22')) {
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