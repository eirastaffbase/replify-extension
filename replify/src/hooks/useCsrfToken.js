/* eslint-disable no-undef */
// hooks/useCsrfToken.js
// This hook listens for messages from the Chrome runtime and updates the CSRF token state accordingly.

import { useEffect, useState } from "react";

export default function useCsrfToken() {
  const [csrf, setCsrf] = useState(null);

  useEffect(() => {
    function listener(msg) {
      if (msg?.csrfToken) setCsrf(msg.csrfToken);
    }
    chrome.runtime?.onMessage.addListener(listener);
    return () => chrome.runtime?.onMessage.removeListener(listener);
  }, []);

  return csrf;
}
