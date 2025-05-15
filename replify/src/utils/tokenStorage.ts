// utils/tokenStorage.js
/* Helpers for persisting Staffbase tokens in localStorage */

export const loadTokensFromStorage = () => {
    try {
      const raw = localStorage.getItem("staffbaseTokens");
      if (!raw) return [];
      return JSON.parse(raw).map((t: { slug: any; token: any; branchId: any; hasNewUI: any; }) => ({
        ...t,
        slug:      t.slug      || "unknown-slug",
        token:     t.token     || "[invalid token]",
        branchId:  t.branchId  || "unknown-branch-id",
        hasNewUI: !!t.hasNewUI
      }));
    } catch (err) {
      console.error("Failed to parse stored tokens", err);
      return [];
    }
  };
  
  export const saveTokensToStorage = (tokens: any) => {
    try   { localStorage.setItem("staffbaseTokens", JSON.stringify(tokens)); }
    catch (err) { console.error("Failed to save tokens", err); }
  };
  