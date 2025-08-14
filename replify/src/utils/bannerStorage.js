/* global chrome */

/**
 * Loads the banner's minimized state from chrome.storage.local.
 * @param {function(boolean): void} callback - The function to call with the result.
 */
export const loadBannerState = (callback) => {
    // Check if chrome.storage is available
    if (chrome?.storage?.local) {
      chrome.storage.local.get(['isBannerMinimized'], (result) => {
        // Defaults to false (expanded) if not found
        callback(!!result.isBannerMinimized);
      });
    } else {
      // Fallback for development environments where chrome APIs are not present
      console.warn("chrome.storage.local not found. Defaulting banner state.");
      callback(false);
    }
  };
  
  /**
   * Saves the banner's minimized state to chrome.storage.local.
   * @param {boolean} isMinimized - The state to save.
   */
  export const saveBannerState = (isMinimized) => {
    if (chrome?.storage?.local) {
      chrome.storage.local.set({ isBannerMinimized: isMinimized });
    }
  };