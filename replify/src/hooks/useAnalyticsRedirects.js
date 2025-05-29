// hooks/useAnalyticsRedirects.js
/* global chrome */
import { useState, useEffect, useCallback } from 'react';
import {
  getInitialAnalyticsStateFromStorage,
  manageAnalyticsScriptInPage,
  handleToggleAnalyticsChange as utilHandleToggleAnalyticsChange,
} from '../utils/analyticsManager'; // Adjust path if your utils folder is elsewhere

export default function useAnalyticsRedirects() {
  // State for analytics redirects and related responses, managed by this hook
  const [redirectState, setRedirectState] = useState(getInitialAnalyticsStateFromStorage);
  const [analyticsResponse, setAnalyticsResponse] = useState("");

  // Effect to apply persisted redirects on initial component load
  useEffect(() => {
    const applyPersistedRedirects = async () => {
      console.log("[Replify Hook] Applying persisted redirects on load. Initial redirectState:", redirectState);
      let scriptsApplied = 0;
      for (const id in redirectState) {
        if (redirectState[id]) { // Check if script type is enabled in state
          scriptsApplied++;
          console.log(`[Replify Hook] Persisted redirect for ${id}: true. Attempting to enable.`);
          // SCRIPT_MAP is internal to analyticsManager.js's manageAnalyticsScriptInPage
          await manageAnalyticsScriptInPage(id, true, setAnalyticsResponse); // Use this hook's setAnalyticsResponse
        }
      }
      if (scriptsApplied === 0) {
        console.log("[Replify Hook] No persisted redirects to apply on load.");
        // Optionally set a message if no scripts were applied and response is empty
        // if (!analyticsResponse) setAnalyticsResponse("No persisted analytics redirects found.");
      }
    };
    applyPersistedRedirects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Runs once on mount. Uses initial redirectState from this hook.
          // setAnalyticsResponse is stable from its own useState.

  // Memoized handler for toggling an analytics redirect type
  const handleToggleRedirect = useCallback(async (id, shouldEnable) => {
    console.log(`[Replify Hook] Toggling ${id} to ${shouldEnable}`);
    await utilHandleToggleAnalyticsChange(
      id,
      shouldEnable,
      redirectState,
      setRedirectState,
      setAnalyticsResponse 
    );
  }, [redirectState]); 

  return {
    redirectState,
    analyticsResponse,
    handleToggleRedirect,
  };
}