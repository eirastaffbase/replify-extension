// hooks/useAnalyticsRedirects.js
/* global chrome */
import { useState, useEffect, useCallback } from "react";

import {
  manageAnalyticsScriptInPage,
  handleToggleAnalyticsChange as utilToggle,
} from "../utils/analyticsManager";

const getDefaultAnalyticsState = () => {
  console.log("[useAnalyticsRedirects] getDefaultAnalyticsState called");
  return {
    news: false,
    hashtags: false,
    search: false,
    campaigns: false,
    posts: false,
    email: false,
    dashboard: false,
    user: false, 
    chat: false,
    pages: false,
    // All analytics keys should be initialized to false
    // Add any new analytics keys here as needed
  };
};

export default function useAnalyticsRedirects() {
  // Initialize with default state structure
  const [redirectState, setRedirectState] = useState(getDefaultAnalyticsState());
  const [analyticsResponse, setAnalyticsResponse] = useState("");
  const [isLoading, setIsLoading] = useState(true); // For tracking loading state
  useEffect(() => {
    setIsLoading(true);

    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(["redirectAnalyticsState"], (result) => {

        if (chrome.runtime.lastError) {
          console.error(
            "[useAnalyticsRedirects] Error loading redirectAnalyticsState from storage:",
            chrome.runtime.lastError.message
          );
        } else {
          const storedState = result.redirectAnalyticsState;

          if (storedState && typeof storedState === 'object') {
            setRedirectState(currentDefaults => {
              const newLoadedState = { ...getDefaultAnalyticsState(), ...storedState };
              return newLoadedState;
            });
          } else {
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
  }, []); 

  useEffect(() => {
    if (!isLoading) {
      (async () => {
        let appliedSomething = false;
        for (const id of Object.keys(redirectState)) {
          if (redirectState[id]) {
            await manageAnalyticsScriptInPage(id, true, setAnalyticsResponse); 
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

        utilToggle(
          id,
          enabled,
          newState, 
          () => {}, 
          setAnalyticsResponse
        );

        // Return the new state to complete the update.
        return newState;
      });
    },
    [setAnalyticsResponse]
  );


  useEffect(() => {
    console.log("[useAnalyticsRedirects] redirectState CHANGED (or component re-rendered with it):", JSON.parse(JSON.stringify(redirectState)));
  }, [redirectState]);


  return { redirectState, analyticsResponse, handleToggleRedirect, isLoading }; 
}