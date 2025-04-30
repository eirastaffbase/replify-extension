/*  utils/staffbaseCSS.js
    ------------------------------------------------------------
    Staffbase CSS API helpers
    ------------------------------------------------------------
    @param {string} token - Staffbase API token
    @param {string} branchId - Staffbase branch ID
    @param {string} cssText - CSS text to be posted
    @returns {Promise<string>} - Fetched CSS text
*/

export async function fetchCurrentCSS( token ) {
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
    if (!css.trim()) throw new Error("Fetched CSS is empty.");
    return css;
  }

export async function postUpdatedCSS( token, branchId, cssText ) {
  if (!token) throw new Error("API token error.");
  if (!branchId) throw new Error("Branch ID error.");
  if (!cssText) throw new Error("CSS error.");
  const url = `https://app.staffbase.com/api/branches/${branchId}/config`;

  const res = await fetch(url, {
    method: "POST",          
    mode: "cors",
    credentials: "omit",     
    headers: {
      Authorization : `Basic ${token.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ customCSS: cssText }),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Staffbase ${res.status}: ${msg.slice(0, 250)}`);
  }
  return res.json();
}
  