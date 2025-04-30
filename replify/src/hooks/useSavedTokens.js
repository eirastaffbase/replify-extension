// hooks/useSavedTokens.js
// This hook manages saved tokens in local storage.

import { useEffect, useState } from "react";
import { loadTokensFromStorage, saveTokensToStorage } from "../utils/tokenStorage";

export default function useSavedTokens() {
  const [tokens, setTokens] = useState([]);

  // initial load
  useEffect(() => {
    setTokens(loadTokensFromStorage().map(t => ({
      slug: t.slug,
      branchId: t.branchId,
      truncatedToken:
        typeof t.token === "string" && t.token.trim().length >= 8
          ? `${t.token.trim().substring(0, 8)}.....`
          : "[invalid token]",
      fullToken: t.token,
      hasNewUI: t.hasNewUI
    })));
  }, []);

  // synced setter
  const updateTokens = updater => {
    setTokens(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveTokensToStorage(next.map(t => ({ slug: t.slug, token: t.fullToken, branchId: t.branchId })));
      return next;
    });
  };

  return [tokens, updateTokens];
}