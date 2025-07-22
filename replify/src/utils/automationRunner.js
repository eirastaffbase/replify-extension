// src/utils/automationRunner.js
/* global chrome */

export function automationScript(users, apiToken, adminId) {
    // --- Helper Functions & Constants ---
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  
    const getCsrfTokenFromDoc = (doc) => {
      const meta = doc.querySelector('meta[name="csrf-token"]');
      return meta ? meta.getAttribute('content') : null;
    };
  
    /**
     * After an API-based login, the page's CSRF token is stale.
     * This function creates a hidden iframe, loads the homepage into it (which uses the new session cookie),
     * and extracts a fresh token from the iframe's DOM.
     */
    const getFreshCsrfToken = () => {
      console.log("  - Creating hidden iframe to get a fresh CSRF token...");
      return new Promise((resolve, reject) => {
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          iframe.src = '/'; // Load the root page
  
          iframe.onload = () => {
              try {
                  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                  const token = getCsrfTokenFromDoc(iframeDoc);
                  if (token) {
                      resolve(token);
                  } else {
                      reject(new Error("Could not find CSRF token in the reloaded iframe."));
                  }
              } catch (error) {
                  reject(error);
              } finally {
                  document.body.removeChild(iframe); // Clean up
              }
          };
  
          iframe.onerror = () => {
              reject(new Error("The hidden iframe failed to load."));
              document.body.removeChild(iframe);
          };
  
          document.body.appendChild(iframe);
      });
    };
  
    const shuffleArray = (array) => {
      for (let i = array.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };
    
    const getRandomItem = (array) => array[Math.floor(Math.random() * array.length)];
  
    // --- Configuration ---
    const CHANNEL_ID = '6813da6066ed576f4d6347c3';
    const TASKS_PER_USER = 14;
    const REACTION_TYPES = ['LIKE', 'CELEBRATE', 'SUPPORT', 'INSIGHTFUL', 'THANKS'];
    const COMMENT_BANK = [
      "This looks great!", "Thanks for sharing!", "Good to know!", 
      "Can't wait to learn more!", "Very helpful information.", "Nice update!",
      "Appreciate the info.", "Looks really user-friendly.", "Excited to see this.",
      "Solid work, team!"
    ];
  
    async function run() {
      console.log("🚀 Automation Script Started 🚀");
      alert("Automation has started! This tab will now perform actions automatically. Please monitor the developer console for progress.");
  
      const totalTasks = users.length * TASKS_PER_USER;
      let tasksCompleted = 0;
  
      // --- Initial Logout ---
      try {
        const initialToken = getCsrfTokenFromDoc(document);
        if (initialToken) {
          await fetch('/auth/logout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'x-csrf-token': initialToken
            },
            body: 'reason=automation_script_logout'
          });
        }
      } catch (error) {
        console.error("Could not perform initial logout:", error);
      }
      await sleep(2000);
  
      // --- Main User Loop ---
      for (const [index, user] of users.entries()) {
        const userTaskStartCount = tasksCompleted;
        let freshCsrfToken = null;
  
        try {
          const primaryEmail = user.emails?.find(e => e.primary === true);
          const identifier = primaryEmail?.value || user.emails?.[0]?.value;
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
          console.log(`✅ Login successful. Fetching fresh CSRF token...`);
          
          freshCsrfToken = await getFreshCsrfToken();
          console.log(`✅ Fresh CSRF token acquired.`);
          await sleep(1000);
  
          // Task 2: Fetch Posts
          const postsResponse = await fetch(`/api/client/channels/${CHANNEL_ID}/posts?limit=20&offset=0`);
          if (!postsResponse.ok) throw new Error('Failed to fetch posts');
          const postsData = await postsResponse.json();
          const posts = postsData.data;
          if (!posts || posts.length === 0) throw new Error('No posts found in the channel.');
          tasksCompleted++;
          chrome.runtime.sendMessage({ type: 'automationProgress', payload: { tasksCompleted, totalTasks } });
          console.log(`✅ Fetched ${posts.length} posts.`);
          await sleep(1000);
  
          // Tasks 3-12: React to 10 random posts
          const postsToReactTo = shuffleArray([...posts]).slice(0, 10);
          console.log(`[${identifier}] Reacting to 10 random posts...`);
          for (const post of postsToReactTo) {
            await fetch('/api/reactions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-csrf-token': freshCsrfToken },
              body: JSON.stringify({ parentId: post.id, parentType: 'post', type: getRandomItem(REACTION_TYPES) })
            });
            tasksCompleted++;
            chrome.runtime.sendMessage({ type: 'automationProgress', payload: { tasksCompleted, totalTasks } });
            await sleep(Math.random() * 1000 + 500);
          }
          console.log(`✅ Finished reacting.`);
  
          // Tasks 13-14: Comment on 2 of those posts
          const postsToCommentOn = shuffleArray([...postsToReactTo]).slice(0, 2);
          console.log(`[${identifier}] Commenting on 2 random posts...`);
          for (const post of postsToCommentOn) {
            const commentText = getRandomItem(COMMENT_BANK);
            await fetch(`/api/articles/${post.id}/comments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-csrf-token': freshCsrfToken },
              body: JSON.stringify({ text: `<p>${commentText}</p>`, image: null })
            });
            tasksCompleted++;
            chrome.runtime.sendMessage({ type: 'automationProgress', payload: { tasksCompleted, totalTasks } });
            await sleep(Math.random() * 1500 + 1000);
          }
          console.log(`✅ Finished commenting.`);
  
        } catch (error) {
          console.error(`❌ An error occurred for user ${user.id}:`, error.message);
          tasksCompleted = userTaskStartCount + TASKS_PER_USER;
          chrome.runtime.sendMessage({ type: 'automationProgress', payload: { tasksCompleted, totalTasks } });
        }
        
        console.log("----------------------------------------");
        await sleep(2000);
      }
  
      console.log("✅ Automation Script Finished! ✅");
      chrome.runtime.sendMessage({ type: 'automationComplete' });
      alert("Automation run has completed successfully! You can close this tab. \n\nNote: You are still logged in as the last user in the list.");
    }
  
    run();
  }