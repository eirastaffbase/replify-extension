/* eslint-disable no-undef */
// hooks/useStaffbaseTab.js
// This hook checks if the current active tab is a Staffbase tab and updates the state accordingly.

import { useEffect, useState } from "react";

export default function useStaffbaseTab() {
  const [isStaffbaseTab, setIsStaffbaseTab] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        setIsStaffbaseTab(!!(tab?.url?.includes("app.staffbase.com")));
      } catch {
        setIsStaffbaseTab(false);
      }
    };

    check();
    chrome.tabs.onActivated.addListener(check);
    chrome.tabs.onUpdated.addListener(check);

    return () => {                           // cleanup on unmount
      chrome.tabs.onActivated.removeListener(check);
      chrome.tabs.onUpdated.removeListener(check);
    };
  }, []);

  return isStaffbaseTab;
}
