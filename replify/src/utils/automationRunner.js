/* global chrome */

export function automationScript(users, apiToken, adminId, options) {
    // --- Logger Utility for Cleaner Console Output ---
    const logger = {
        _log(icon, color, message, details) {
            console.log(`%c${icon} ${message}`, `color: ${color}; font-weight: bold;`);
            if (details) console.log(details);
        },
        info(message, details) { this._log('⏳', '#6495ED', message, details); },
        success(message, details) { this._log('✅', '#32CD32', message, details); },
        warn(message, details) { this._log('⚠️', '#FFD700', message, details); },
        error(message, error) {
            console.error(`%c❌ ${message}`, 'color: #DC143C; font-size: 14px; font-weight: bold;');
            if (error) console.error(error);
        },
        section(title) { console.log(`\n%c--- ${title} ---`, 'color: #8A2BE2; font-weight: bold; text-transform: uppercase;'); },
        user(userName) { console.log(`\n%c--- Processing User: ${userName} ---`, 'color: #008B8B; font-weight: bold; font-size: 1.1em;'); }
    };

    // --- Helper Functions & Constants ---
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    function getUniqueRandomItem(availableItems, masterList) {
        if (availableItems.length === 0) {
            logger.info(`♻️ Refilling content bank from master list of size ${masterList.length}.`);
            Array.prototype.push.apply(availableItems, masterList);
        }
        const randomIndex = Math.floor(Math.random() * availableItems.length);
        const [item] = availableItems.splice(randomIndex, 1);
        return item;
    }

    async function pollForJwtInStorage(surveyId, timeout = 10000) {
        const startTime = Date.now();
        logger.info(`Polling local storage for JWT for survey ${surveyId}...`);
        while (Date.now() - startTime < timeout) {
            const data = await chrome.storage.local.get(surveyId);
            if (data && data[surveyId]) {
                await chrome.storage.local.remove(surveyId);
                logger.success(`Found JWT in storage for survey ${surveyId}.`);
                return data[surveyId];
            }
            await sleep(250);
        }
        throw new Error(`Timeout polling storage for JWT for survey ${surveyId}.`);
    }

    const getFreshCsrfToken = async () => {
        logger.info("Fetching a fresh CSRF token from /auth/discover...");
        try {
            const response = await fetch('/auth/discover', {
                method: 'GET',
                headers: { 'Accept': 'application/vnd.staffbase.auth.discovery.v2+json', 'Content-Type': 'application/json' }
            });
            if (!response.ok) throw new Error(`API returned status: ${response.status}`);
            const discoveryData = await response.json();
            const token = discoveryData?.csrfToken;
            if (token) {
                logger.success("Successfully fetched new CSRF token.");
                return token;
            }
            throw new Error("Could not find 'csrfToken' in the API response.");
        } catch (error) {
            logger.error("Failed to get a fresh CSRF token.", error);
            throw error;
        }
    };
    
    const getRandomItem = (array) => !array || array.length === 0 ? null : array[Math.floor(Math.random() * array.length)];
    const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    // --- MASTER Content Banks (Originals) ---
    const MASTER_REACTION_TYPES = ['LIKE', 'CELEBRATE', 'SUPPORT', 'INSIGHTFUL', 'THANKS'];
    const MASTER_CHAT_MESSAGE_PAIRS = [ { initiator: (name) => `Hey ${name}, just a heads up that your shift starts in about an hour. See you soon!`, reply: "Got it, thanks for the reminder! I'm on my way." }, { initiator: (name) => `Hi ${name}, could you double-check the inventory report when you get a chance? I think there might be a discrepancy.`, reply: "Sure thing, I'll take a look at it now and let you know what I find." }, { initiator: (name) => `Hey, Emily’s birthday is next week! I was thinking we could all pitch in for a cake. Let me know if you're in.`, reply: "Great idea! I'm definitely in for the cake." }, { initiator: (name) => `Quick question, ${name} - do you have the final specs for the Q3 project proposal?`, reply: "Yes, I just got them this morning. I'll forward the email to you right now." }, { initiator: (name) => `Friendly reminder that our weekly team sync is tomorrow at 10 AM.`, reply: "Thanks! I have it on my calendar." }, { initiator: (name) => `Are you free for a quick call this afternoon, ${name}? I'd like to go over the launch plan.`, reply: "Yep, my calendar is open after 2 PM. Just send an invite." }, { initiator: (name) => `Did you get a chance to see the latest client feedback on the mockups?`, reply: "Not yet, just logged on. I'll check my email now. Hopefully it's good news!" }, { initiator: (name) => `I'm a little stuck on the data analysis for the monthly report. Do you have a moment to look at my spreadsheet, ${name}?`, reply: "Of course, happy to help. Share the link with me whenever you're ready." }, { initiator: (name) => `Up for grabbing lunch today? I'm thinking about that new sandwich shop.`, reply: "I could eat. What time were you thinking?" }, { initiator: (name) => `Huge congrats on the successful presentation, ${name}! You absolutely nailed it.`, reply: "Thanks so much! That really means a lot." }, { initiator: (name) => `How was your weekend, ${name}?`, reply: "It was great, thanks for asking! Just relaxed. How about yours?" }, { initiator: (name) => `${name}, would you be able to cover the first hour of my Friday shift? Something unexpected came up.`, reply: "I think so, but let me double-check my schedule and I'll confirm with you in a few minutes." }, { initiator: (name) => `Just a heads-up, all expense reports for last month are due by end of day today.`, reply: "Whoops, almost forgot! Appreciate the reminder, I'll get that submitted now." }, { initiator: (name) => `Is anyone else having trouble connecting to the VPN this morning?`, reply: "Yeah, it's been really slow for me too. I was just about to file a ticket with IT." }, { initiator: (name) => `Great job on closing that deal, ${name}! The whole team is celebrating.`, reply: "Thank you! It was a team effort for sure." } ];
    const MASTER_PARENT_REPLY_PAIRS = [ { parent: "Could we get more details on the process for this?", reply: "I would like to second this! More detail would be great." }, { parent: "Is there a deadline for providing feedback on this?", reply: "Good question, I was wondering the same thing." }, { parent: "This looks promising. Who is the main point of contact for questions?", reply: "Thanks for asking, I'd also like to know who to reach out to." }, { parent: "Will there be a follow-up session or Q&A about this topic?", reply: "A Q&A session would be incredibly helpful." }, { parent: "Can you share the presentation slides from the meeting?", reply: "Yes, please! I'd love to review the slides." }, { parent: "What are the key metrics for success on this project?", reply: "Understanding the success metrics would provide a lot of clarity." }, { parent: "Is the documentation for this available on the company intranet?", reply: "A direct link to the documentation would be perfect." }, { parent: "This is a great initiative! How can other teams get involved?", reply: "My team would be very interested in contributing as well." }, { parent: "What was the biggest challenge the team faced during this rollout?", reply: "I'm curious about the lessons learned from this process." }, { parent: "Are there any plans to expand this program to other departments?", reply: "That's a great question; our team would be very interested." } ];
    const MASTER_SINGLE_COMMENTS = [ "This is fantastic news!", "Thank you for the clear and concise update.", "Great work, everyone involved!", "Looking forward to the positive impact this will have.", "Appreciate the transparency.", "This is a huge step forward for us.", "Excellent communication on this matter.", "Very well explained.", "Excited to see this in action.", "Thanks for keeping us in the loop.", "This aligns perfectly with our company goals.", "Incredibly helpful, thank you.", "A much-needed improvement.", "The team has done an outstanding job.", "This will definitely streamline our workflow.", "Kudos to the project team!", "So glad to see this being implemented.", "This makes a lot of sense.", "Simple, effective, and user-friendly. Great job!", "Can't wait to start using this.", "This is a game-changer.", "Well done on a successful launch.", "The results speak for themselves.", "Thrilled with this announcement.", "This is exactly what we needed.", "Informative and to the point.", "Big congratulations to the team!", "This is going to make a big difference.", "A welcome development.", "Really impressive work." ];
    const MASTER_SURVEY_COMMENT_BANK = [ "Very clear and helpful, thank you!", "This was great, no complaints from me.", "Excellent initiative.", "I'm really happy with this.", "Keep up the great work!", "Very satisfied with the process.", "The communication was fantastic.", "This exceeded my expectations.", "Found this very valuable.", "A positive experience all around.", "Well organized and efficient.", "No issues, everything went smoothly.", "This is a welcome change.", "I appreciate the effort that went into this.", "Very user-friendly.", "It was adequate for my needs.", "No strong feelings either way.", "The process was straightforward.", "It served its purpose.", "This is a good starting point.", "Looking forward to see how this develops.", "The information provided was sufficient.", "An interesting approach.", "I was able to complete it without issues.", "Standard procedure, nothing to add.", "As expected.", "It worked.", "Could use a bit more insight on the metrics.", "The instructions could have been clearer.", "I think there's room for improvement here.", "Felt a bit rushed.", "Would be nice to have more context.", "The platform was a little slow at times.", "Some of the questions were a bit ambiguous.", "Hopefully, the next iteration will be more refined.", "A few minor usability issues.", "It was okay, but not amazing.", "More detailed follow-up would be appreciated.", "Could be more engaging." ];
    
    // --- AVAILABLE Content Banks (Mutable copies for unique selection) ---
    const availableChats = [...MASTER_CHAT_MESSAGE_PAIRS];
    const availableParentReplyPairs = [...MASTER_PARENT_REPLY_PAIRS];
    const availableSingleComments = [...MASTER_SINGLE_COMMENTS];

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

    function generateSurveyResponse(questions) {
        const payload = { content: {} };
        if (!questions) return payload;
        for (const question of questions) {
            switch (question?.questionType) {
                case 'STAR': case 'SCALE':
                    payload.content[question.id] = getRandomInt(1, question.maxScale || 5);
                    break;
                case 'TEXT':
                    payload.content[question.id] = getRandomItem(MASTER_SURVEY_COMMENT_BANK);
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
        // Return the fetch promise so the caller can check the response status
        return fetch('https://pluginsurveys-us1.staffbase.com/api/v1/feedback', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(payload)
        });
    }
    
    async function handleSurveys(surveysWithQuestions, csrfToken, updateProgress) {
        if (!surveysWithQuestions || surveysWithQuestions.length === 0) return;
        
        for (const survey of surveysWithQuestions) {
            const surveyTitle = survey.config?.localization?.en_US?.title || survey.id;
            try {
                updateProgress({ status: `Answering survey: ${surveyTitle}` });
                if (!survey?.questions) continue;
                
                // This fetch is expected to result in a 404, as its goal is to trigger the backend to generate a JWT.
                logger.info(`Triggering JWT generation for survey "${surveyTitle}". A 404 network error for this action is expected and can be ignored.`);
                fetch(survey.links.frontend_forward.href, { headers: { 'x-csrf-token': csrfToken } }).catch(() => {});
                
                const jwt = await pollForJwtInStorage(survey.id);
                const responsePayload = generateSurveyResponse(survey.questions);

                if (Object.keys(responsePayload.content).length > 0) {
                    const submitResponse = await submitSurveyFeedback(jwt, responsePayload);
                    if (!submitResponse.ok) {
                         throw new Error(`Survey submission API failed with status ${submitResponse.status}`);
                    }
                    logger.success(`Submitted survey: '${surveyTitle}'`);
                    updateProgress({ increment: true });
                }
                await sleep(1500);
            } catch(error) {
                logger.error(`Survey did not submit: '${surveyTitle}'`, error);
            }
        }
    }

    // --- Chat Handling Functions ---
    async function getChatInstallationId(csrfToken) {
        logger.info("Fetching chat installation ID...");
        try {
            const response = await fetch('/api/installations/administrated?pluginID=chat', { headers: { 'x-csrf-token': csrfToken } });
            if (!response.ok) {
                const fallbackResponse = await fetch('/api/plugins/chat/installations', { headers: { 'x-csrf-token': csrfToken } });
                if (!fallbackResponse.ok) throw new Error('Failed to fetch chat installation via primary or fallback method.');
                 const fallbackData = await fallbackResponse.json();
                 if (fallbackData?.data?.length > 0) {
                    logger.success("Found chat installation ID via fallback.");
                    return fallbackData.data[0].id;
                }
            }
            const { data } = await response.json();
            if (data?.length > 0) {
                logger.success("Found chat installation ID.");
                return data[0].id;
            }
            throw new Error('Chat installation not found in API response.');
        } catch (error) {
            logger.warn(`Could not retrieve chat installation ID. Skipping chat actions.`, error);
            return null;
        }
    }

    async function handleChats(currentUser, chatInstallationId, csrfToken, pendingChats, updateProgress) {
        if (!chatInstallationId || currentUser.id === adminId) {
            if (currentUser.id === adminId) logger.info(`Skipping chat reply for admin user.`);
            return; 
        }
        updateProgress({ status: "Replying to chat..." });
        const pendingChatIndex = pendingChats.findIndex(c => c.recipientId === currentUser.id);
        if (pendingChatIndex > -1) {
            const [chatToReplyTo] = pendingChats.splice(pendingChatIndex, 1);
            try {
                const endpoint = `/api/installations/${chatInstallationId}/conversations/direct/${chatToReplyTo.initiatorId}`;
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
                    body: JSON.stringify({ message: chatToReplyTo.replyText })
                });
                if (!response.ok) throw new Error(`API returned status ${response.status}`);
                logger.success("Successfully sent chat reply.");
                updateProgress({ increment: true });
            } catch (error) {
                logger.error(`Failed to reply to chat.`, error);
            }
        } else {
            logger.info(`No pending chat messages found for this user.`);
        }
    }

    // --- Main Execution ---
    async function run() {
        logger.section("🚀 Automation Script Started 🚀");
        alert("Automation will begin once you close this alert. Leave this window open and watch the text below the progress bar for updates. To continue working, open a new window and be sure to leave this tab open.");

        let initialCsrfToken, surveysWithQuestions, publishedPosts, chatInstallationId;
        let pendingReplies = [], pendingChats = [];
        let tasksCompleted = 0, totalTasks = 0;

        const updateProgress = ({ increment = false, status = null, user = null }) => {
            if (increment) tasksCompleted++;
            chrome.runtime.sendMessage({ 
                type: 'automationProgress', 
                payload: { tasksCompleted, totalTasks, status, user } 
            });
        };

        try {
            logger.section("Pre-flight Checks & Task Calculation");
            initialCsrfToken = await getFreshCsrfToken();
            
            if (options.surveys) {
                surveysWithQuestions = await getSurveysWithQuestions(initialCsrfToken);
                totalTasks += surveysWithQuestions.length * users.length;
            }
            if (options.chats) {
                chatInstallationId = await getChatInstallationId(initialCsrfToken);
                if (chatInstallationId && adminId) {
                    totalTasks += users.filter(u => u.id !== adminId).length * 2;
                }
            }

            const postsResponse = await fetch('/api/posts?limit=20&sort=published_DESC&publicationState=published', { headers: { 'x-csrf-token': initialCsrfToken } });
            publishedPosts = (await postsResponse.json()).data;
            if (!publishedPosts?.length) { alert("No published posts found. Aborting."); return; }
            if (!users?.length) { alert("No users provided for automation. Aborting."); return; }

            if (options.reactions) totalTasks += users.length * 10;
            if (options.comments) totalTasks += users.length * 4;

            updateProgress({ status: "Initializing..." });
            
            if (options.chats && chatInstallationId && adminId) {
                updateProgress({ status: "Admin is sending initial chats..." });
                logger.info("Admin user is pre-sending initial chat messages...");
                for (const user of users) {
                    if (user.id === adminId) continue;
                    const chatPair = getUniqueRandomItem(availableChats, MASTER_CHAT_MESSAGE_PAIRS);
                    try {
                        const endpoint = `/api/installations/${chatInstallationId}/conversations/direct/${user.id}`;
                        const response = await fetch(endpoint, {
                            method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': initialCsrfToken },
                            body: JSON.stringify({ message: chatPair.initiator(user.firstName || 'there') })
                        });
                        if (response.ok) {
                            pendingChats.push({ recipientId: user.id, initiatorId: adminId, replyText: chatPair.reply });
                            updateProgress({ increment: true });
                        } else {
                           logger.warn(`Could not send initial chat to ${user.firstName || user.id}. Status: ${response.status}`);
                        }
                        await sleep(500);
                    } catch (error) { logger.error(`Error pre-sending chat to ${user.id}`, error); }
                }
            }
            logger.success(`Pre-flight complete. Total tasks to run: ${totalTasks}`);
        } catch (error) { 
            logger.error('Fatal error during pre-flight checks. Aborting script.', error);
            alert(`Failed to pre-fetch data: ${error.message}. Aborting.`); 
            return; 
        }
        
        logger.section("Starting Automation Loop");
        for (const user of users) {
            let freshCsrfToken = null;
            const userFullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.id;
            logger.user(userFullName);
            
            try {
                updateProgress({ user: userFullName, status: "Logging in..." });
                const identifier = user.emails?.find(e => e.primary)?.value || user.emails?.[0]?.value;
                if (!identifier) throw new Error(`User ID ${user.id} has no email address.`);
                
                const loginResponse = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier, secret: 'Clone12345', locale: 'en_US' }) });
                if (!loginResponse.ok) throw new Error(`API returned status ${loginResponse.status}`);
                
                logger.success(`Logged in as ${userFullName}.`);
                freshCsrfToken = await getFreshCsrfToken();
                await sleep(1000);

                if (options.surveys) await handleSurveys(surveysWithQuestions, freshCsrfToken, updateProgress);
                
                if (options.reactions) {
                    updateProgress({ status: "Adding reactions..." });
                    for (let i = 0; i < 10; i++) {
                        await fetch('/api/reactions', {
                            method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': freshCsrfToken },
                            body: JSON.stringify({ parentId: getRandomItem(publishedPosts).id, parentType: 'post', type: getRandomItem(MASTER_REACTION_TYPES) })
                        });
                        updateProgress({ increment: true });
                        await sleep(500);
                    }
                }

                if (options.comments) {
                    updateProgress({ status: "Posting comments..." });
                    const postComment = async (text, postId, parentId = null) => {
                        const url = parentId ? `/api/comments/${parentId}/comments` : `/api/articles/${postId}/comments`;
                        const response = await fetch(url, {
                            method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': freshCsrfToken },
                            body: JSON.stringify({ text: `<p>${text}</p>` })
                        });
                        if (!response.ok) throw new Error(`Comment API failed with status ${response.status}`);
                        updateProgress({ increment: true });
                        return response.json();
                    };
                    const handlePairedComment = async () => {
                        const replyableIndex = pendingReplies.findIndex(p => p.authorId !== user.id);
                        if (replyableIndex > -1) {
                            const [replyable] = pendingReplies.splice(replyableIndex, 1);
                            await postComment(replyable.replyText, null, replyable.parentId);
                        } else {
                            const pair = getUniqueRandomItem(availableParentReplyPairs, MASTER_PARENT_REPLY_PAIRS);
                            const newParent = await postComment(pair.parent, getRandomItem(publishedPosts).id);
                            pendingReplies.push({ parentId: newParent.id, replyText: pair.reply, authorId: user.id });
                        }
                    };
                    try {
                        await postComment(getUniqueRandomItem(availableSingleComments, MASTER_SINGLE_COMMENTS), getRandomItem(publishedPosts).id);
                        await sleep(1500);
                        await postComment(getUniqueRandomItem(availableSingleComments, MASTER_SINGLE_COMMENTS), getRandomItem(publishedPosts).id);
                        await sleep(1500);
                        if (Math.random() < 0.8) { await handlePairedComment(); await sleep(1500); }
                        if (Math.random() < 0.4) { await handlePairedComment(); }
                    } catch (e) {
                        logger.error("Comment failed to post.", e);
                    }
                }
                
                if (options.chats) {
                    await handleChats(user, chatInstallationId, freshCsrfToken, pendingChats, updateProgress);
                    await sleep(1500);
                }
            } catch (error) { 
                // This catch block handles major failures for a user, like login.
                logger.error(`An error occurred for user ${userFullName}. Skipping remaining tasks for this user.`, error);
            }
            await sleep(2000); // Cooldown between users
        }

        logger.section("✅ Automation Script Finished! ✅");
        chrome.runtime.sendMessage({ type: 'automationComplete' });
        alert("Automation run has completed successfully! You can close this tab. NOTE: You are logged in as the last user you selected.");
    }

    run();
}