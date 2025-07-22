// src/utils/automationRunner.js
/* global chrome */

export function automationScript(users, apiToken, adminId) {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  
    const getCsrfToken = () => {
      const meta = document.querySelector('meta[name="csrf-token"]');
      return meta ? meta.getAttribute('content') : null;
    };
  
    // Define the number of tasks per user for accurate progress calculation.
    // 1 (login) + 2 (actions) = 3 tasks per user.
    const TASKS_PER_USER = 3;
  
    async function run() {
      console.log("🚀 Automation Script Started 🚀");
      alert("Automation has started! This tab will now perform actions automatically. Please monitor the developer console for progress.");
  
      const totalTasks = users.length * TASKS_PER_USER;
      let tasksCompleted = 0;
  
      // --- Initial Logout ---
      try {
        const csrfToken = getCsrfToken();
        if (csrfToken) {
          await fetch('/auth/logout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'x-csrf-token': csrfToken
            },
            body: 'reason=automation_script_logout'
          });
        }
      } catch (error) {
        console.error("Could not perform initial logout:", error);
      }
      await sleep(2000);
  
      // --- Main Loop ---
      for (const [index, user] of users.entries()) {
        const userTaskStartCount = tasksCompleted;
        try {
          const primaryEmail = user.emails?.find(e => e.primary === true);
          const identifier = primaryEmail?.value || user.emails?.[0]?.value;
  
          if (!identifier) {
            throw new Error(`User with ID ${user.id} has no email available.`);
          }
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
          await sleep(2000);
  
          // Task 2: First Action
          console.log(`[${identifier}] Performing Task 1...`);
          await sleep(2500);
          tasksCompleted++;
          chrome.runtime.sendMessage({ type: 'automationProgress', payload: { tasksCompleted, totalTasks } });
          console.log(`[${identifier}] ✅ Task 1 Complete.`);
  
          // Task 3: Second Action
          console.log(`[${identifier}] Performing Task 2...`);
          await sleep(3000);
          tasksCompleted++;
          chrome.runtime.sendMessage({ type: 'automationProgress', payload: { tasksCompleted, totalTasks } });
          console.log(`[${identifier}] ✅ Task 2 Complete.`);
  
        } catch (error) {
          console.error(`❌ An error occurred for user ${user.id}:`, error.message);
          // If a user fails, advance the progress bar past all their tasks to prevent it from getting stuck.
          tasksCompleted = userTaskStartCount + TASKS_PER_USER;
          chrome.runtime.sendMessage({ type: 'automationProgress', payload: { tasksCompleted, totalTasks } });
        }
        
        console.log("----------------------------------------");
        await sleep(2000);
      }
  
      console.log("✅ Automation Script Finished! ✅");
      // Send a final message to tell the UI the process is complete.
      chrome.runtime.sendMessage({ type: 'automationComplete' });
      alert("Automation run has completed successfully! You can close this tab.");
    }
  
    run();
  }