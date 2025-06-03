/* utils/analyticsManager.js
    ------------------------------------------------------------
    This file manages the analytics scripts for the Replify extension.
    It handles the loading, enabling, and disabling of various
    analytics patches/scripts in the current page context.
    It also manages the state of these scripts in local storage.
    ------------------------------------------------------------
*/
/* global chrome */
import campaignsScript from "./analyticsScripts/campaigns";
// import newsScript from "./analyticsScripts/news";
// import hashtagsScript from "./analyticsScripts/hashtags";

const SCRIPT_MAP = {
  campaigns: campaignsScript,
  // news,
  // hashtags,
};

export const getInitialAnalyticsStateFromStorage = () => {
  const defaults = {
    news: false,
    hashtags: false,
    search: false,
    campaigns: false,
    posts: false,
    email: false,
  };
  try {
    const { redirectAnalyticsState } =
      chrome.storage?.local ? chrome.storage.local.getSync?.() ?? {} : {};
    return { ...defaults, ...redirectAnalyticsState };
  } catch {
    return defaults;
  }
};

/* inject OR remove a patch in the current tab */
export const manageAnalyticsScriptInPage = async (
  id,
  enable,
  setResp = () => {}
) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  /* remove existing tag (if you used the inject-as-<script> approach) */
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (tagId) => document.getElementById(tagId)?.remove(),
    args: [`replify-${id}-patch`],
  });

  if (!enable) return;

  /* run the patch */
  const fn = SCRIPT_MAP[id];
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: fn,
  });
  setResp(`✅ ${id} patch executed`);
};

/* called from the hook / checkbox */
export const handleToggleAnalyticsChange = async (
  id,
  enabled,
  curState,
  setState,
  setResp
) => {
  const newState = { ...curState, [id]: enabled };
  setState(newState);
  chrome.storage.local.set({ redirectAnalyticsState: newState });
  await manageAnalyticsScriptInPage(id, enabled, setResp);
};
