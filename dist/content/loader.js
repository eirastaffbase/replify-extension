/* global chrome */
import campaignsPatch     from "../utils/analyticsScripts/campaigns.js";
import newsPatch          from "../utils/analyticsScripts/news.js";       // if/when you write them
import hashtagsPatch      from "../utils/analyticsScripts/hashtags.js";

const PATCH_MAP = {
  campaigns:  campaignsPatch,
  news:       newsPatch,
  hashtags:   hashtagsPatch,
  // …search, posts, email
};

(async () => {
    alert('hi');
  try {
    const { redirectAnalyticsState = {} } =
      await chrome.storage.local.get("redirectAnalyticsState");

    // run only the enabled ones
    Object.entries(redirectAnalyticsState)
      .filter(([_, enabled]) => enabled)
      .forEach(([id]) => {
        try {
          PATCH_MAP[id]?.();                 // execute immediately in-page
          console.debug(`[Replify] ${id} patch applied by loader`);
        } catch (e) {
          console.error(`[Replify] ${id} patch failed:`, e);
        }
      });
  } catch (e) {
    console.error("[Replify] loader could not read storage:", e);
  }
})();
