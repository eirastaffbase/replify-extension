// src/utils/tokenStorage.js

export const loadTokensFromStorage = () => {
  try {
    const raw = localStorage.getItem("staffbaseTokens");
    if (!raw) return [];
    return JSON.parse(raw).map((t) => ({
      ...t,
      slug: t.slug || "unknown-slug",
      token: t.token || "[invalid token]",
      // Change this line
      branchId: t.branchId || null,
      hasNewUI: !!t.hasNewUI,
    }));
  } catch (err) {
    console.error("Failed to parse stored tokens", err);
    return [];
  }
};

  
export const saveTokensToStorage = tokens => {
  try   { localStorage.setItem("staffbaseTokens", JSON.stringify(tokens)); }
  catch (err) { console.error("Failed to save tokens", err); }
};
