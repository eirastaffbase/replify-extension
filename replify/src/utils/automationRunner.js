/* global chrome */

export function automationScript(users, apiToken, adminId) {
    // --- Helper Functions & Constants ---
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const getFreshCsrfToken = async () => {
      console.log("  - Fetching /auth/discover to get a definitive CSRF token...");
      try {
          const response = await fetch('/auth/discover', {
              method: 'GET',
              headers: { 'Accept': 'application/vnd.staffbase.auth.discovery.v2+json', 'Content-Type': 'application/json' }
          });
          if (!response.ok) throw new Error(`Failed to fetch from /auth/discover. Status: ${response.status}`);
          const discoveryData = await response.json();
          const token = discoveryData?.csrfToken;
          if (token) return token;
          throw new Error("Could not find 'csrfToken' key in the /auth/discover API response.");
      } catch (error) {
          console.error("Error in getFreshCsrfToken:", error);
          throw error;
      }
    };
    
    const shuffleArray = (array) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };
    const getRandomItem = (array) => {
        if (!array || array.length === 0) return null;
        return array[Math.floor(Math.random() * array.length)];
    }
    const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    // --- Configuration ---
    const REACTION_TYPES = ['LIKE', 'CELEBRATE', 'SUPPORT', 'INSIGHTFUL', 'THANKS'];
    
    // --- Comment Banks (Unchanged) ---
    const PARENT_REPLY_PAIRS = [ { parent: "Could we get more details on the process for this?", reply: "I would like to second this! More detail would be great." }, { parent: "Is there a deadline for providing feedback on this?", reply: "Good question, I was wondering the same thing." }, { parent: "This looks promising. Who is the main point of contact for questions?", reply: "Thanks for asking, I'd also like to know who to reach out to." }, { parent: "Will there be a follow-up session or Q&A about this topic?", reply: "A Q&A session would be incredibly helpful." }, { parent: "Can you share the presentation slides from the meeting?", reply: "Yes, please! I'd love to review the slides." }, { parent: "What are the key metrics for success on this project?", reply: "Understanding the success metrics would provide a lot of clarity." }, { parent: "Is the documentation for this available on the company intranet?", reply: "A direct link to the documentation would be perfect." }, { parent: "This is a great initiative! How can other teams get involved?", reply: "My team would be very interested in contributing as well." }, { parent: "What was the biggest challenge the team faced during this rollout?", reply: "I'm curious about the lessons learned from this process." }, { parent: "Are there any plans to expand this program to other departments?", reply: "That's a great question; our team would be very interested." } ];
    const SINGLE_COMMENTS = [ "This is fantastic news!", "Thank you for the clear and concise update.", "Great work, everyone involved!", "Looking forward to the positive impact this will have.", "Appreciate the transparency.", "This is a huge step forward for us.", "Excellent communication on this matter.", "Very well explained.", "Excited to see this in action.", "Thanks for keeping us in the loop.", "This aligns perfectly with our company goals.", "Incredibly helpful, thank you.", "A much-needed improvement.", "The team has done an outstanding job.", "This will definitely streamline our workflow.", "Kudos to the project team!", "So glad to see this being implemented.", "This makes a lot of sense.", "Simple, effective, and user-friendly. Great job!", "Can't wait to start using this.", "This is a game-changer.", "Well done on a successful launch.", "The results speak for themselves.", "Thrilled with this announcement.", "This is exactly what we needed.", "Informative and to the point.", "Big congratulations to the team!", "This is going to make a big difference.", "A welcome development.", "Really impressive work." ];
    const SURVEY_COMMENT_BANK = [ "Very clear and helpful, thank you!", "This was great, no complaints from me.", "Excellent initiative.", "I'm really happy with this.", "Keep up the great work!", "Very satisfied with the process.", "The communication was fantastic.", "This exceeded my expectations.", "Found this very valuable.", "A positive experience all around.", "Well organized and efficient.", "No issues, everything went smoothly.", "This is a welcome change.", "I appreciate the effort that went into this.", "Very user-friendly.", "It was adequate for my needs.", "No strong feelings either way.", "The process was straightforward.", "It served its purpose.", "This is a good starting point.", "Looking forward to see how this develops.", "The information provided was sufficient.", "An interesting approach.", "I was able to complete it without issues.", "Standard procedure, nothing to add.", "As expected.", "It worked.", "Could use a bit more insight on the metrics.", "The instructions could have been clearer.", "I think there's room for improvement here.", "Felt a bit rushed.", "Would be nice to have more context.", "The platform was a little slow at times.", "Some of the questions were a bit ambiguous.", "Hopefully, the next iteration will be more refined.", "A few minor usability issues.", "It was okay, but not amazing.", "More detailed follow-up would be appreciated.", "Could be more engaging." ];

    // --- Survey Handling Functions ---
    async function getSurveysWithQuestions(csrfToken) {
        const response = await fetch('/api/installations/administrated?pluginID=surveys&limit=-1', { headers: { 'x-csrf-token': csrfToken } });
        if (!response.ok) return [];
        const { data } = await response.json();
        
        const surveysWithQuestions = [];
        for (const survey of data) {
            const statusResponse = await fetch(`/api/surveys/installations/${survey.id}`, { method: 'POST', headers: { 'x-csrf-token': csrfToken } });
            if (!statusResponse.ok) continue;
            const statusData = await statusResponse.json();
            
            if (statusData.status !== 'PUBLISHED' || (statusData.latestSurveyClosedAt && new Date(statusData.latestSurveyClosedAt) < new Date())) continue;

            const questionsResponse = await fetch(`/api/surveys/installations/${survey.id}/questions`, { headers: { 'x-csrf-token': csrfToken } });
            if (questionsResponse.ok) {
                const questionsData = await questionsResponse.json();
                surveysWithQuestions.push({ ...survey, questions: questionsData.questions || questionsData });
            }
        }
        return surveysWithQuestions;
    }

    /**
     * ❗ NEW "SPY" METHOD: Intercepts fetch requests to find the JWT.
     */
    async function getSurveyJwtBySniffing(survey, csrfToken) {
        const originalFetch = window.fetch;
        let timeoutId;

        const promise = new Promise((resolve, reject) => {
            timeoutId = setTimeout(() => {
                window.fetch = originalFetch; // Restore fetch on timeout
                reject(new Error(`Timeout: Did not capture survey JWT for ${survey.id} within 10 seconds.`));
            }, 10000);

            window.fetch = async (...args) => {
                const url = args[0] instanceof Request ? args[0].url : args[0];
                if (typeof url === 'string' && url.includes('pluginsurveys-us1.staffbase.com/register?jwt=')) {
                    console.log('  - Intercepted register call, extracting JWT...');
                    const capturedJwt = new URL(url).searchParams.get('jwt');
                    clearTimeout(timeoutId);
                    window.fetch = originalFetch; // Restore fetch immediately
                    resolve(capturedJwt);
                }
                return originalFetch.apply(this, args);
            };
        });

        // Trigger the redirect, which our spy will catch
        fetch(survey.links.frontend_forward.href, { headers: { 'x-csrf-token': csrfToken }, credentials: 'include' });
        
        return promise;
    }

    function generateSurveyResponse(questions) {
        const payload = { content: {} };
        if (!questions) return payload;
        for (const question of questions) {
            switch (question?.questionType) {
                case 'STAR': case 'SCALE':
                    payload.content[question.id] = getRandomInt(1, question.maxScale || 5);
                    break;
                case 'TEXT':
                    payload.content[question.id] = getRandomItem(SURVEY_COMMENT_BANK);
                    break;
                case 'MULTIPLE_CHOICE':
                    const options = question.content?.en_US?.options;
                    if (options?.length > 0) payload.content[question.id] = [getRandomItem(options).id];
                    break;
                default: break;
            }
        }
        return payload;
    }
    
    async function submitSurveyFeedback(jwt, payload) {
        await fetch('https://pluginsurveys-us1.staffbase.com/api/v1/feedback', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(payload)
        });
    }
    
    async function handleSurveys(surveysWithQuestions, csrfToken) {
        if (!surveysWithQuestions || surveysWithQuestions.length === 0) return;
        console.log(`[SURVEYS] User will attempt to respond to ${surveysWithQuestions.length} pre-fetched surveys.`);
        
        for (const survey of surveysWithQuestions) {
            try {
                if (!survey?.questions) continue;
                const jwt = await getSurveyJwtBySniffing(survey, csrfToken);
                if (!jwt) {
                    console.warn(`  - Could not get JWT for survey "${survey.id}". Skipping.`);
                    continue;
                }
                const responsePayload = generateSurveyResponse(survey.questions);
                if (Object.keys(responsePayload.content).length > 0) {
                    await submitSurveyFeedback(jwt, responsePayload);
                    console.log(`  ✅ Survey response submitted for "${survey.config?.localization?.en_US?.title}".`);
                }
                await sleep(1500);
            } catch(error) {
                console.error(`  - Failed to process survey ${survey.id}:`, error.message);
            }
        }
    }

    // --- Main Execution ---
    async function run() {
        console.log("🚀 Automation Script Started 🚀");
        alert("Automation has started! This tab will now perform actions automatically. Please monitor the developer console for progress.");

        let initialCsrfToken, surveysWithQuestions, publishedPosts;
        // ✨ NEW: Queue for paired comments { parentId, replyText, authorId }
        let pendingReplies = []; 

        // --- Pre-fetch all data with the initial admin session ---
        try {
            console.log("--- Pre-fetching data with initial admin session ---");
            initialCsrfToken = await getFreshCsrfToken();
            surveysWithQuestions = await getSurveysWithQuestions(initialCsrfToken);
            const postsResponse = await fetch('/api/posts?limit=20&sort=published_DESC&publicationState=published', { headers: { 'x-csrf-token': initialCsrfToken } });
            publishedPosts = (await postsResponse.json()).data;
            if (!publishedPosts?.length) { alert("No published posts found. Aborting."); return; }
            if (!users?.length) { alert("No users provided for automation. Aborting."); return; }
            console.log(`✅ Pre-fetched ${surveysWithQuestions.length} surveys and ${publishedPosts.length} posts.`);
        } catch (error) {
            alert(`Failed to pre-fetch data: ${error.message}. Aborting.`); return;
        }
        
        // --- Main User Loop ---
        for (const [index, user] of users.entries()) {
            let freshCsrfToken = null;
            try {
                const identifier = user.emails?.find(e => e.primary)?.value || user.emails?.[0]?.value;
                if (!identifier) throw new Error(`User ID ${user.id} has no email.`);
                
                console.log(`--- [${index + 1}/${users.length}] Processing: ${identifier} ---`);

                // Login
                const loginResponse = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier, secret: 'Clone12345', locale: 'en_US' }) });
                if (!loginResponse.ok) throw new Error(`Login failed for ${identifier}`);
                freshCsrfToken = await getFreshCsrfToken();
                console.log(`✅ Login successful. CSRF token acquired.`);
                await sleep(1000);

                // Surveys
                await handleSurveys(surveysWithQuestions, freshCsrfToken);
                
                // Reactions
                console.log("[REACTIONS] Starting post reactions...");
                for (let i = 0; i < 10; i++) {
                    await fetch('/api/reactions', {
                        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': freshCsrfToken },
                        body: JSON.stringify({ parentId: getRandomItem(publishedPosts).id, parentType: 'post', type: getRandomItem(REACTION_TYPES) })
                    });
                    await sleep(500);
                }
                console.log(`✅ Finished reacting.`);

                // 🔄 NEW PAIRED COMMENTING LOGIC 🔄
                console.log(`[COMMENTS] Starting conversational commenting for ${identifier}...`);
                const postComment = async (text, postId, parentId = null) => {
                    const url = parentId ? `/api/comments/${parentId}/comments` : `/api/articles/${postId}/comments`;
                    const response = await fetch(url, {
                        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': freshCsrfToken },
                        body: JSON.stringify({ text: `<p>${text}</p>` })
                    });
                    if (!response.ok) throw new Error(`Failed to post comment`);
                    return response.json();
                };

                // Helper for posting a paired comment (either reply or new parent)
                const handlePairedComment = async () => {
                    const replyable = pendingReplies.find(p => p.authorId !== user.id);
                    if (replyable) {
                        // If there's a pending reply from another user, answer it.
                        pendingReplies = pendingReplies.filter(p => p.parentId !== replyable.parentId); // Remove from queue
                        await postComment(replyable.replyText, null, replyable.parentId);
                        console.log(`  - Posted reply to comment ${replyable.parentId}.`);
                    } else {
                        // Otherwise, create a new parent/reply pair.
                        const pair = getRandomItem(PARENT_REPLY_PAIRS);
                        const post = getRandomItem(publishedPosts);
                        const newParent = await postComment(pair.parent, post.id);
                        pendingReplies.push({ parentId: newParent.id, replyText: pair.reply, authorId: user.id });
                        console.log(`  - Posted new parent comment. Waiting for reply.`);
                    }
                };

                // 1. Post two single comments
                await postComment(getRandomItem(SINGLE_COMMENTS), getRandomItem(publishedPosts).id);
                console.log("  - Posted single comment 1/2.");
                await sleep(1500);
                await postComment(getRandomItem(SINGLE_COMMENTS), getRandomItem(publishedPosts).id);
                console.log("  - Posted single comment 2/2.");
                await sleep(1500);
                
                // 2. 80% chance to post a 3rd (paired) comment
                if (Math.random() < 0.8) {
                    await handlePairedComment();
                    await sleep(1500);
                }

                // 3. 40% chance to post a 4th (paired) comment
                if (Math.random() < 0.4) {
                    await handlePairedComment();
                }
                console.log(`✅ Finished commenting tasks for ${identifier}.`);

            } catch (error) {
                console.error(`❌ An error occurred for user ${user?.id || 'Unknown User'}:`, error.message);
            }
            console.log("----------------------------------------");
            await sleep(2000);
        }

        console.log("✅ Automation Script Finished! ✅");
        chrome.runtime.sendMessage({ type: 'automationComplete' });
        alert("Automation run has completed successfully! You can close this tab.");
    }

    run();
}