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
    
    // --- NEW COMMENT BANKS ---
    const PARENT_REPLY_PAIRS = [
        { parent: "Could we get more details on the process for this?", reply: "I would like to second this! More detail would be great." },
        { parent: "Is there a deadline for providing feedback on this?", reply: "Good question, I was wondering the same thing." },
        { parent: "This looks promising. Who is the main point of contact for questions?", reply: "Thanks for asking, I'd also like to know who to reach out to." },
        { parent: "Will there be a follow-up session or Q&A about this topic?", reply: "A Q&A session would be incredibly helpful." },
        { parent: "Can you share the presentation slides from the meeting?", reply: "Yes, please! I'd love to review the slides." },
        { parent: "What are the key metrics for success on this project?", reply: "Understanding the success metrics would provide a lot of clarity." },
        { parent: "Is the documentation for this available on the company intranet?", reply: "A direct link to the documentation would be perfect." },
        { parent: "This is a great initiative! How can other teams get involved?", reply: "My team would be very interested in contributing as well." },
        { parent: "What was the biggest challenge the team faced during this rollout?", reply: "I'm curious about the lessons learned from this process." },
        { parent: "Are there any plans to expand this program to other departments?", reply: "That's a great question; our team would be very interested." } // FIX: Added 10th item
    ]; // 10 pairs = 20 comments

    const SINGLE_COMMENTS = [
        "This is fantastic news!", "Thank you for the clear and concise update.", "Great work, everyone involved!",
        "Looking forward to the positive impact this will have.", "Appreciate the transparency.", "This is a huge step forward for us.",
        "Excellent communication on this matter.", "Very well explained.", "Excited to see this in action.",
        "Thanks for keeping us in the loop.", "This aligns perfectly with our company goals.", "Incredibly helpful, thank you.",
        "A much-needed improvement.", "The team has done an outstanding job.", "This will definitely streamline our workflow.",
        "Kudos to the project team!", "So glad to see this being implemented.", "This makes a lot of sense.",
        "Simple, effective, and user-friendly. Great job!", "Can't wait to start using this.", "This is a game-changer.",
        "Well done on a successful launch.", "The results speak for themselves.", "Thrilled with this announcement.",
        "This is exactly what we needed.", "Informative and to the point.", "Big congratulations to the team!",
        "This is going to make a big difference.", "A welcome development.", "Really impressive work."
    ]; // 30 comments

    const SURVEY_COMMENT_BANK = [
      "Very clear and helpful, thank you!", "This was great, no complaints from me.", "Excellent initiative.",
      "I'm really happy with this.", "Keep up the great work!", "Very satisfied with the process.",
      "The communication was fantastic.", "This exceeded my expectations.", "Found this very valuable.",
      "A positive experience all around.", "Well organized and efficient.", "No issues, everything went smoothly.",
      "This is a welcome change.", "I appreciate the effort that went into this.", "Very user-friendly.",
      "It was adequate for my needs.", "No strong feelings either way.", "The process was straightforward.",
      "It served its purpose.", "This is a good starting point.", "Looking forward to see how this develops.",
      "The information provided was sufficient.", "An interesting approach.", "I was able to complete it without issues.",
      "Standard procedure, nothing to add.", "As expected.", "It worked.", "Could use a bit more insight on the metrics.",
      "The instructions could have been clearer.", "I think there's room for improvement here.", "Felt a bit rushed.",
      "Would be nice to have more context.", "The platform was a little slow at times.", "Some of the questions were a bit ambiguous.",
      "Hopefully, the next iteration will be more refined.", "A few minor usability issues.", "It was okay, but not amazing.",
      "More detailed follow-up would be appreciated.", "Could be more engaging."
    ];

    // --- Survey Handling Functions ---
    async function getPublishedSurveys(csrfToken) {
        console.log("  - Fetching list of surveys...");
        const response = await fetch('/api/installations/administrated?pluginID=surveys&limit=-1', {
            headers: { 'x-csrf-token': csrfToken }
        });
        if (!response.ok) {
            console.error("Failed to fetch surveys list.");
            return [];
        }
        const { data } = await response.json();
        const now = new Date();
        return data.filter(survey => survey.published && (!survey.config.endDate || new Date(survey.config.endDate) > now));
    }
    
    async function getSurveyDetailsAndToken(survey, csrfToken) {
        try {
            const forwardLink = survey?.links?.frontend_forward?.href;
            if (!forwardLink) {
              console.warn(`  - Survey "${survey?.config?.localization?.en_US?.title || survey?.id}" has no forward link. Skipping.`);
              return null;
            }

            const redirectResponse = await fetch(forwardLink, {
                headers: { 'x-csrf-token': csrfToken },
                redirect: 'manual' 
            });

            const locationHeader = redirectResponse.headers.get('Location') || redirectResponse.url;
            if (!locationHeader) {
                console.error("  - Survey redirect failed. No 'Location' header or URL found. Skipping.");
                return null;
            }

            const locationUrl = new URL(locationHeader);
            const jwt = locationUrl.searchParams.get('jwt');
            if (!jwt) {
                console.error("  - Could not extract JWT from survey redirect URL. Skipping.");
                console.log("  - URL Searched:", locationUrl.href);
                return null;
            }

            const surveyApiUrl = `https://pluginsurveys-us1.staffbase.com/api/v1/surveys/${survey.id}`;
            const detailsResponse = await fetch(surveyApiUrl, {
                headers: { 'Authorization': `Bearer ${jwt}`, 'Accept': 'application/json' }
            });

            if (!detailsResponse.ok) {
                console.error(`  - Failed to fetch survey details for ${survey.id}.`);
                return null;
            }
            
            const surveyData = await detailsResponse.json();
            return { survey: surveyData, token: jwt };

        } catch (error) {
            console.error("  - Error in getSurveyDetailsAndToken:", error.message);
            return null;
        }
    }
    
    function generateSurveyResponse(questions) {
        const payload = { content: {} };
        if (!questions) return payload;
        for (const question of questions) {
            switch (question?.type) {
                case 'rating':
                    payload.content[question.id] = getRandomInt(1, 10);
                    break;
                case 'text':
                    payload.content[question.id] = getRandomItem(SURVEY_COMMENT_BANK);
                    break;
                case 'select':
                     if (question.config?.options?.length > 0) {
                        payload.content[question.id] = [getRandomItem(question.config.options).id];
                    }
                    break;
                default:
                    console.warn(`  - Unsupported survey question type: "${question?.type}". Skipping.`);
                    break;
            }
        }
        return payload;
    }
    
    async function submitSurveyFeedback(surveyData, payload) {
        const { token } = surveyData;
        if (!token) {
            console.error("  - No JWT found for submitting survey. Aborting.");
            return;
        }
        const response = await fetch('https://pluginsurveys-us1.staffbase.com/api/v1/feedback', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        if (response.ok) {
            console.log("  ✅ Survey response submitted successfully.");
        } else {
            const errorText = await response.text();
            console.error(`  - Failed to submit survey. Status: ${response.status}`, errorText);
        }
    }
    
    async function handleSurveys(surveys, csrfToken) {
        try {
            if (!surveys || surveys.length === 0) {
                console.log("  - No published surveys found to respond to.");
                return;
            }
            console.log(`[SURVEYS] Processing ${surveys.length} pre-fetched surveys.`);
            for (const survey of surveys) {
                if (!survey) continue;
                const surveyDetails = await getSurveyDetailsAndToken(survey, csrfToken);
                if (surveyDetails?.survey?.questions) {
                    const responsePayload = generateSurveyResponse(surveyDetails.survey.questions);
                    if (Object.keys(responsePayload.content).length > 0) {
                        await submitSurveyFeedback(surveyDetails, responsePayload);
                    } else {
                        console.log("  - No supported questions found in survey, skipping submission.");
                    }
                }
                await sleep(1500);
            }
        } catch (e) {
            console.error("❌ An error occurred during the survey handling process:", e.message);
        }
    }

    // --- Main Execution ---
    async function run() {
        console.log("🚀 Automation Script Started 🚀");
        alert("Automation has started! This tab will now perform actions automatically. Please monitor the developer console for progress.");

        let initialCsrfToken, publishedSurveys, publishedPosts;

        // --- Pre-fetch all data with the initial admin session ---
        try {
            console.log("--- Pre-fetching data with initial admin session ---");
            initialCsrfToken = await getFreshCsrfToken();
            
            publishedSurveys = await getPublishedSurveys(initialCsrfToken);
            const postsResponse = await fetch('/api/posts?limit=20&sort=published_DESC&publicationState=published', {
                headers: { 'x-csrf-token': initialCsrfToken }
            });
            const postsData = await postsResponse.json();
            publishedPosts = postsData.data;
            if (!publishedPosts || publishedPosts.length === 0) {
                alert("No published posts found. Cannot proceed with commenting or reacting. Aborting.");
                return;
            }
            if (!users || users.length === 0) {
                alert("No users provided for automation. Aborting.");
                return;
            }

            console.log(`✅ Pre-fetched ${publishedSurveys.length} surveys and ${publishedPosts.length} posts.`);
            console.log("--- Data pre-fetching complete ---");
        } catch (error) {
            alert(`Failed to pre-fetch data. Make sure you are logged in as an admin. Error: ${error.message}. Aborting.`);
            return;
        }
        
        // --- Generate Commenting Plan ---
        console.log("--- Generating commenting plan ---");
        const commentTasks = [];
        const createdParentComments = {}; // { parentTaskId: 'commentIdFromApi' }
        
        // Generate parent/reply pairs if possible
        if (users.length > 1 && PARENT_REPLY_PAIRS?.length > 0) {
            const numPairsToGenerate = Math.min(10, PARENT_REPLY_PAIRS.length); // FIX: Dynamic loop limit
            console.log(`  - Generating ${numPairsToGenerate} parent/reply comment pairs.`);
            const shuffledUsers = shuffleArray([...users]);

            for (let i = 0; i < numPairsToGenerate; i++) {
                const parentUser = shuffledUsers[i % shuffledUsers.length];
                const replyUser = shuffledUsers[(i + 1) % shuffledUsers.length];
                const commentPair = PARENT_REPLY_PAIRS[i];
                const post = getRandomItem(publishedPosts);

                if (parentUser && replyUser && commentPair && post) {
                    commentTasks.push({
                        id: `pair_${i}`,
                        type: 'parent',
                        user: parentUser,
                        post: post,
                        text: commentPair.parent
                    });
                    
                    commentTasks.push({
                        id: `reply_to_pair_${i}`,
                        type: 'reply',
                        user: replyUser,
                        parentTaskId: `pair_${i}`,
                        text: commentPair.reply
                    });
                }
            }
        } else {
            console.warn("  - Skipping two-pronged parent/reply comments (not enough users or no pairs defined).");
        }
        
        // Generate single comments to reach the target of 50 total
        const singleCommentsToGenerate = 50 - commentTasks.length;
        if (singleCommentsToGenerate > 0 && SINGLE_COMMENTS?.length > 0) {
            console.log(`  - Generating ${singleCommentsToGenerate} single comments.`);
            for (let i = 0; i < singleCommentsToGenerate; i++) {
                const user = getRandomItem(users);
                const post = getRandomItem(publishedPosts);
                const text = getRandomItem(SINGLE_COMMENTS);
                if (user && post && text) {
                    commentTasks.push({ type: 'single', user, post, text });
                }
            }
        }
        console.log(`✅ Commenting plan generated with ${commentTasks.length} total comments.`);

        // --- Main User Loop ---
        const totalTasks = (users.length * 11) + commentTasks.length; // 1 login + 10 reactions per user, plus all comments.
        let tasksCompleted = 0;

        for (const [index, user] of users.entries()) {
            const userTaskStartCount = tasksCompleted;
            const userCommentTasks = commentTasks.filter(task => task?.user?.id === user.id);
            const totalTasksForThisUser = 1 + 10 + userCommentTasks.length;

            let freshCsrfToken = null;

            try {
                const identifier = user.emails?.find(e => e.primary)?.value || user.emails?.[0]?.value;
                if (!identifier) throw new Error(`User with ID ${user.id} has no email available.`);
                
                console.log(`--- [${index + 1}/${users.length}] Processing: ${identifier} ---`);

                // Task 1: Login
                const loginResponse = await fetch('/api/sessions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identifier, secret: 'Clone12345', locale: 'en_US' })
                });
                if (!loginResponse.ok) throw new Error(`Login failed for ${identifier}`);
                tasksCompleted++;
                chrome.runtime.sendMessage({ type: 'automationProgress', payload: { tasksCompleted, totalTasks } });
                console.log(`✅ Login successful.`);
                
                freshCsrfToken = await getFreshCsrfToken();
                console.log(`✅ Fresh CSRF token acquired.`);
                await sleep(1000);

                // Handle Surveys
                await handleSurveys(publishedSurveys, freshCsrfToken);
                
                // Post Reaction Logic
                console.log("[REACTIONS] Starting post reactions...");
                const postsToReactTo = shuffleArray([...publishedPosts]).slice(0, 10);
                for (const post of postsToReactTo) {
                    if (post?.id) {
                         await fetch('/api/reactions', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'x-csrf-token': freshCsrfToken },
                            body: JSON.stringify({ parentId: post.id, parentType: 'post', type: getRandomItem(REACTION_TYPES) })
                        });
                    }
                    tasksCompleted++;
                    chrome.runtime.sendMessage({ type: 'automationProgress', payload: { tasksCompleted, totalTasks } });
                    await sleep(Math.random() * 1000 + 500);
                }
                console.log(`✅ Finished reacting.`);

                // Commenting Logic
                console.log(`[COMMENTS] Starting commenting tasks for ${identifier}...`);
                if (userCommentTasks.length > 0) {
                    for (const task of userCommentTasks) {
                        try {
                            if (!task?.text) continue; // Skip task if there's no text

                            if ((task.type === 'single' || task.type === 'parent') && task.post?.id) {
                                const response = await fetch(`/api/articles/${task.post.id}/comments`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'x-csrf-token': freshCsrfToken },
                                    body: JSON.stringify({ text: `<p>${task.text}</p>`, image: null })
                                });
                                if (!response.ok) throw new Error(`Failed to post comment. Status: ${response.status}`);
                                
                                const responseData = await response.json();
                                if (task.type === 'parent' && responseData?.id) {
                                    createdParentComments[task.id] = responseData.id;
                                    console.log(`  ✅ Parent comment ${task.id} created with ID ${responseData.id}`);
                                } else {
                                    console.log(`  ✅ Single comment posted to article ${task.post.id}.`);
                                }
                            } else if (task.type === 'reply') {
                                const parentCommentId = createdParentComments[task.parentTaskId];
                                if (!parentCommentId) {
                                    console.warn(`  - Skipping reply for task ${task.id} because parent comment ID was not found.`);
                                    tasksCompleted++;
                                    chrome.runtime.sendMessage({ type: 'automationProgress', payload: { tasksCompleted, totalTasks } });
                                    continue;
                                }
                                await fetch(`/api/comments/${parentCommentId}/comments`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'x-csrf-token': freshCsrfToken },
                                    body: JSON.stringify({ text: `<p>${task.text}</p>`, image: null })
                                });
                                console.log(`  ✅ Reply comment posted to ${parentCommentId}.`);
                            }
                            tasksCompleted++;
                            chrome.runtime.sendMessage({ type: 'automationProgress', payload: { tasksCompleted, totalTasks } });
                            await sleep(Math.random() * 1500 + 1000);
                        } catch (commentError) {
                            console.error(`  ❌ Failed to execute comment task: ${commentError.message}`);
                            tasksCompleted++;
                            chrome.runtime.sendMessage({ type: 'automationProgress', payload: { tasksCompleted, totalTasks } });
                        }
                    }
                } else {
                    console.log(`  - No comment tasks for this user.`);
                }
                console.log(`✅ Finished commenting tasks for ${identifier}.`);

            } catch (error) {
                console.error(`❌ An error occurred for user ${user?.id || 'Unknown User'}:`, error.message);
                tasksCompleted = userTaskStartCount + totalTasksForThisUser; 
                chrome.runtime.sendMessage({ type: 'automationProgress', payload: { tasksCompleted, totalTasks } });
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