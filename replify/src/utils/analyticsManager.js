// utils/analyticsManager.js
/* global chrome */
import campaignsScript from "./analyticsScripts/campaigns";
// import newsScript from "./analyticsScripts/news";
// import hashtagsScript from "./analyticsScripts/hashtags";

// Define SCRIPT_MAP here as it's static and related to these utils
const SCRIPT_MAP_UTIL = {
  campaigns: campaignsScript,
  // news: newsScript,
  // hashtags: hashtagsScript,
};

export const getInitialAnalyticsStateFromStorage = () => {
  try {
    const item = localStorage.getItem('redirectAnalyticsState');
    const defaultState = {
      news: false,
      hashtags: false,
      search: false,
      campaigns: false,
      posts: false,
      email: false,
    };
    const storedState = item ? JSON.parse(item) : {};
    // Ensure all default keys are present
    return { ...defaultState, ...storedState };
  } 
  
  
  catch (error) {
    console.error("[Replify Extension] Error reading redirect state from localStorage:", error);
    // Return a fully-formed default state in case of error
    return { news: false, hashtags: false, search: false, campaigns: false, posts: false, email: false };
  }
};

export const manageAnalyticsScriptInPage = async (id, enable, setResponseCallback) => {
    if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.scripting) {
      setResponseCallback("❌ Chrome APIs not available.");
      return;
    }
  
    let activeTab;
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs.length > 0) activeTab = tabs[0];
    } catch(e) {
      console.error("[Replify Extension] Error querying tabs:", e);
      setResponseCallback("❌ Could not query active tab.");
      return;
    }
  
    if (!activeTab?.id) {
      setResponseCallback("❌ No active tab found.");
      return;
    }
  
    if (activeTab.url && (activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('https://chrome.google.com'))) {
      setResponseCallback(`❌ Cannot inject scripts on this page type. Try a regular webpage.`);
      return;
    }
  
    // No script tag to remove with this direct execution method unless the script itself creates DOM elements
    // that you need to track and remove separately. For just running a function, removal is about state, not script tags.
    if (!enable) {
      setResponseCallback(`⬅︎ Analytics redirection (execution) for ${id} is now off. Any effects would need manual reversal if not self-contained.`);
      console.log(`[Replify Extension] Analytics execution disabled for ${id} on tab ${activeTab.id}.`);
      // If the script had persistent effects (e.g., added global listeners), you'd inject a "cleanup" function here.
      return;
    }
  
    const functionToExecute = SCRIPT_MAP_UTIL[id];
    if (typeof functionToExecute !== 'function') {
      setResponseCallback(`❌ No analytics script function registered for ${id}.`);
      console.error(`[Replify Extension] Script for ${id} is not a function.`);
      return;
    }
  
    try {
      console.log(`[Replify Extension] Attempting to directly execute script for ID: ${id}`);
      await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: functionToExecute, // Execute the function directly
        // args: [], // Pass any JSON-serializable arguments your functionToExecute might need.
                     // Our modified campaignsAnalytics now takes no args and uses global 'window'.
      });
      // The console.logs and alert are now INSIDE campaignsAnalytics.
      // Success here means chrome.scripting.executeScript itself didn't throw.
      // The actual success/failure of the script's logic (like alert) depends on what's inside it.
      setResponseCallback(`✅ Analytics script for ${id} executed.`);
      console.log(`[Replify Extension] Analytics script for ${id} on tab ${activeTab.id} executed via direct func.`);
    } catch (e) {
      console.error(`[Replify Extension] Error executing script for ${id} via executeScript:`, e);
      // This catch is for errors in the executeScript call itself (e.g., tab closed, invalid target)
      // Errors *inside* functionToExecute (if not caught there) might appear in the target page's console
      // or sometimes bubble up here depending on the error type.
      setResponseCallback(`❌ Error executing analytics script for ${id}: ${e.message}`);
    }
  };
  
  // ... (handleToggleAnalyticsChange remains the same, it calls manageAnalyticsScriptInPage) ...
  export const handleToggleAnalyticsChange = async (
    id,
    shouldEnable,
    currentRedirectState,
    setRedirectStateCallback,
    setResponseCallback
  ) => {
    const newState = { ...currentRedirectState, [id]: shouldEnable };
    setRedirectStateCallback(newState);
    try {
        chrome.storage.local.set({ redirectAnalyticsState: newState });
    } catch (error) {
      console.error("[Replify Extension] Error saving redirect state to localStorage:", error);
      setResponseCallback("❌ Could not save redirect preference.");
    }
    await manageAnalyticsScriptInPage(id, shouldEnable, setResponseCallback);
  };
  