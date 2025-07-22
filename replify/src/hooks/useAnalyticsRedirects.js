// hooks/useAnalyticsRedirects.js
/* global chrome */
import { useState, useEffect, useCallback } from "react";

// Assuming this utilToggle is for saving state and works.
// The manageAnalyticsScriptInPage and getInitialAnalyticsStateFromStorage
// from analyticsManager.js will be handled differently for loading.
import {
  // getInitialAnalyticsStateFromStorage, // We will replace this for loading
  manageAnalyticsScriptInPage,
  handleToggleAnalyticsChange as utilToggle,
} from "../utils/analyticsManager";

// Define a function to get your default/initial state structure
// This replaces the direct use of getInitialAnalyticsStateFromStorage in useState
const getDefaultAnalyticsState = () => {
  console.log("[useAnalyticsRedirects] getDefaultAnalyticsState called");
  // This should return the basic structure, e.g., all false
  // This should match the structure your analyticsManager.getInitialAnalyticsStateFromStorage
  // would have ideally returned if it were synchronous and empty.
  return {
    news: false,
    hashtags: false,
    search: false,
    campaigns: false,
    posts: false,
    email: false,
    dashboard: false,
    user: false, 
    pages: false,
    // Add all your analytics types here, initialized to false
  };
};

export default function useAnalyticsRedirects() {
  // Initialize with default state structure
  const [redirectState, setRedirectState] = useState(getDefaultAnalyticsState());
  const [analyticsResponse, setAnalyticsResponse] = useState("");
  const [isLoading, setIsLoading] = useState(true); // For tracking loading state
  // Effect for LOADING the state from chrome.storage
  useEffect(() => {
    setIsLoading(true);

    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(["redirectAnalyticsState"], (result) => {

        if (chrome.runtime.lastError) {
          console.error(
            "[useAnalyticsRedirects] Error loading redirectAnalyticsState from storage:",
            chrome.runtime.lastError.message
          );
          // In case of error, we'll stick with the default state.
          // You might want to set an error message in analyticsResponse here.
        } else {
          const storedState = result.redirectAnalyticsState;

          if (storedState && typeof storedState === 'object') {
            // Merge with defaults to ensure all keys are present
            setRedirectState(currentDefaults => {
              // currentDefaults here is the state at the time setRedirectState is called,
              // which could be the initial default state or a subsequently updated one if this effect somehow re-ran.
              // For an effect with [], it's the initial default.
              const newLoadedState = { ...getDefaultAnalyticsState(), ...storedState };
              return newLoadedState;
            });
          } else {
            // Ensure it's at least the default structure if nothing valid was loaded.
            // This might be redundant if useState already set it, but for safety:
            setRedirectState(currentDefaults => {
                const defaultState = getDefaultAnalyticsState();
                return defaultState;
            });
          }
        }
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array: runs ONCE on mount.

  // Effect for APPLYING saved redirects (calls manageAnalyticsScriptInPage)
  // This was your original useEffect. It should ideally run AFTER state is loaded.
  useEffect(() => {
    // Only attempt to apply if not loading and redirectState is populated
    if (!isLoading) {
      (async () => {
        let appliedSomething = false;
        for (const id of Object.keys(redirectState)) {
          if (redirectState[id]) {
            await manageAnalyticsScriptInPage(id, true, setAnalyticsResponse); // Assuming this function is correctly defined elsewhere
            appliedSomething = true;
          }
        }
      })();
    } else {
        console.log("[useAnalyticsRedirects] Skipping Applying Effect because isLoading is true.");
    }
    // This effect depends on redirectState (after it's loaded) and isLoading status
  }, [redirectState, isLoading]);

  // Callback for TOGGLING and SAVING a redirect state
  const handleToggleRedirect = useCallback(
    (id, enabled) => {
      // Use the functional update form of `setRedirectState`.
      // `prevState` is guaranteed by React to be the latest version of the state.
      setRedirectState(prevState => {
        const newState = {
          ...prevState,
          [id]: enabled,
        };

        // Call your utility function for its side effects (like saving to storage).
        // We pass it the newly calculated `newState` so it saves the correct, up-to-date data.
        utilToggle(
          id,
          enabled,
          newState, // Pass the correct new state
          () => {}, // The state is already set, so we pass an empty function for the setter
          setAnalyticsResponse
        );

        // Return the new state to complete the update.
        return newState;
      });
    },
    // The dependencies are now stable, which fixes the bug.
    [setAnalyticsResponse]
  );


  // Log redirectState whenever it changes (after loading or toggling)
  useEffect(() => {
    console.log("[useAnalyticsRedirects] redirectState CHANGED (or component re-rendered with it):", JSON.parse(JSON.stringify(redirectState)));
  }, [redirectState]);


  return { redirectState, analyticsResponse, handleToggleRedirect, isLoading }; // Added isLoading to the return
}