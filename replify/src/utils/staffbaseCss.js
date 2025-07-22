/*  utils/staffbaseCSS.js
    ------------------------------------------------------------
    Staffbase CSS API helpers
    ------------------------------------------------------------
*/

/**
 * [READ-ONLY] Fetches CSS from the legacy custom.css endpoint.
 */
export async function fetchCurrentCSS(token) {
  if (!token) throw new Error("No token provided.");
    const url = `https://app.staffbase.com/api/custom.css`;
    const res = await fetch(url, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      headers: {
        Authorization: `Basic ${token.trim()}`,
        "Cache-Control": "no-cache",
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch CSS: ${res.status} – ${res.statusText}`);
    }

    const css = await res.text();
    // No need to check for empty here, the caller can decide.
    return css;
  }

/**
 * [UPDATED] Posts the provided CSS to BOTH the new Theme API
 * and the old Branch Config API in parallel.
 *
 * @param {string} token - Staffbase API token.
 * @param {string} branchId - Staffbase branch ID for the old system.
 * @param {string} cssText - The full CSS string to post.
 * @returns {Promise<PromiseSettledResult<any>[]>} An array with the results of both API calls.
 */
export async function postUpdatedCSS(token, branchId, cssText) {
  if (!token || !branchId) {
    throw new Error("Token and Branch ID are required for CSS update.");
  }
  if (typeof cssText !== 'string') {
    throw new Error("CSS text must be a string.");
  }

  // --- Promise for the NEW Theme API update ---
  const updateNewSystem = async () => {
    // 1. Get the primary theme to find its ID
    const themeRes = await fetch('https://app.staffbase.com/api/theming/themes/primary', {
      headers: { 'Authorization': `Basic ${token}` }
    });
    if (!themeRes.ok) throw new Error(`Theme API (GET): ${themeRes.statusText}`);

    const themeObject = await themeRes.json();
    const themeId = themeObject.id;
    if (!themeId) throw new Error("Theme API: Could not find theme ID.");

    // 2. Update the CSS in the object
    themeObject.desktopTheme.customCss = cssText;

    // 3. PUT the updated object to the specific theme endpoint
    const updateRes = await fetch(`https://app.staffbase.com/api/theming/themes/${themeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/vnd.staffbase.theming.themes.theme+json',
        'Authorization': `Basic ${token}`,
      },
      body: JSON.stringify(themeObject),
    });

    if (!updateRes.ok) throw new Error(`Theme API (PUT): ${updateRes.statusText}`);
    return { system: 'new', status: updateRes.status, data: await updateRes.json() };
  };

  // --- Promise for the OLD Branch Config API update ---
  const updateOldSystem = async () => {
    const url = `https://app.staffbase.com/api/branches/${branchId}/config`;
    const res = await fetch(url, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      headers: {
        Authorization: `Basic ${token.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ customCSS: cssText }),
    });

    if (!res.ok) {
      const msg = await res.text();
      throw new Error(`Branch API (POST): ${res.status} ${msg.slice(0, 100)}`);
    }
    return { system: 'old', status: res.status, data: await res.json() };
  };

  // --- Run both updates concurrently and return their results ---
  return Promise.allSettled([
    updateNewSystem(),
    updateOldSystem()
  ]);
}