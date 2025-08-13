/* utils/staffbaseCSS.js
    ------------------------------------------------------------
    Staffbase CSS API helpers
    ------------------------------------------------------------
*/

/* ───── Color Comparison Utilities (CIEDE2000) ───── */

/**
 * Converts a hex color string to an RGB array.
 * @param {string} hex - The hex color string (e.g., "#RRGGBB").
 * @returns {number[]} An array [r, g, b].
 */
function hexToRgb(hex) {
  if (!hex || typeof hex !== "string") return [0, 0, 0];
  let r = 0,
    g = 0,
    b = 0;
  // 3 digits
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  }
  // 6 digits
  else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  return [r, g, b];
}

/**
 * Converts an RGB color value to CIE 1931 XYZ values.
 * @param {number[]} rgb - The RGB color array [r, g, b].
 * @returns {number[]} The XYZ values [x, y, z].
 */
function rgbToXyz(rgb) {
  let [r, g, b] = rgb.map((c) => c / 255);
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
  r *= 100;
  g *= 100;
  b *= 100;
  const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = r * 0.0193 + g * 0.1192 + b * 0.9505;
  return [x, y, z];
}

/**
 * Converts CIE 1931 XYZ values to CIE L*a*b*.
 * @param {number[]} xyz - The XYZ values [x, y, z].
 * @returns {number[]} The L*a*b* values [l, a, b].
 */
function xyzToLab(xyz) {
  let [x, y, z] = xyz;
  const refX = 95.047,
    refY = 100.0,
    refZ = 108.883;
  x /= refX;
  y /= refY;
  z /= refZ;
  x = x > 0.008856 ? Math.pow(x, 1 / 3) : 7.787 * x + 16 / 116;
  y = y > 0.008856 ? Math.pow(y, 1 / 3) : 7.787 * y + 16 / 116;
  z = z > 0.008856 ? Math.pow(z, 1 / 3) : 7.787 * z + 16 / 116;
  const l = 116 * y - 16;
  const a = 500 * (x - y);
  const b = 200 * (y - z);
  return [l, a, b];
}

/**
 * Calculates the CIEDE2000 color difference between two L*a*b* colors.
 * @param {number[]} lab1 The first L*a*b* color.
 * @param {number[]} lab2 The second L*a*b* color.
 * @returns {number} The Delta E 2000 value.
 */
function deltaE2000(lab1, lab2) {
  const [L1, a1, b1] = lab1;
  const [L2, a2, b2] = lab2;
  const kL = 1,
    kC = 1,
    kH = 1;
  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const C_bar = (C1 + C2) / 2;
  const G =
    0.5 * (1 - Math.sqrt(Math.pow(C_bar, 7) / (Math.pow(C_bar, 7) + Math.pow(25, 7))));
  const a1_prime = (1 + G) * a1;
  const a2_prime = (1 + G) * a2;
  const C1_prime = Math.sqrt(a1_prime * a1_prime + b1 * b1);
  const C2_prime = Math.sqrt(a2_prime * a2_prime + b2 * b2);
  const h1_rad = Math.atan2(b1, a1_prime);
  const h1_prime =
    h1_rad >= 0 ? h1_rad * (180 / Math.PI) : h1_rad * (180 / Math.PI) + 360;
  const h2_rad = Math.atan2(b2, a2_prime);
  const h2_prime =
    h2_rad >= 0 ? h2_rad * (180 / Math.PI) : h2_rad * (180 / Math.PI) + 360;
  const deltaL_prime = L2 - L1;
  const deltaC_prime = C2_prime - C1_prime;
  let deltah_prime;
  if (C1_prime * C2_prime === 0) deltah_prime = 0;
  else if (Math.abs(h2_prime - h1_prime) <= 180)
    deltah_prime = h2_prime - h1_prime;
  else if (h2_prime - h1_prime > 180) deltah_prime = h2_prime - h1_prime - 360;
  else deltah_prime = h2_prime - h1_prime + 360;
  const deltaH_prime =
    2 * Math.sqrt(C1_prime * C2_prime) * Math.sin((deltah_prime * Math.PI) / 180 / 2);
  const L_bar_prime = (L1 + L2) / 2;
  const C_bar_prime = (C1_prime + C2_prime) / 2;
  let h_bar_prime;
  if (C1_prime * C2_prime === 0) h_bar_prime = h1_prime + h2_prime;
  else if (Math.abs(h1_prime - h2_prime) <= 180)
    h_bar_prime = (h1_prime + h2_prime) / 2;
  else if (h1_prime + h2_prime < 360)
    h_bar_prime = (h1_prime + h2_prime + 360) / 2;
  else h_bar_prime = (h1_prime + h2_prime - 360) / 2;
  const T =
    1 -
    0.17 * Math.cos(((h_bar_prime - 30) * Math.PI) / 180) +
    0.24 * Math.cos(((2 * h_bar_prime) * Math.PI) / 180) +
    0.32 * Math.cos(((3 * h_bar_prime + 6) * Math.PI) / 180) -
    0.2 * Math.cos(((4 * h_bar_prime - 63) * Math.PI) / 180);
  const delta_theta =
    (30 * Math.PI) /
    180 *
    Math.exp(-Math.pow((h_bar_prime - 275) / 25, 2));
  const R_C =
    2 * Math.sqrt(Math.pow(C_bar_prime, 7) / (Math.pow(C_bar_prime, 7) + Math.pow(25, 7)));
  const S_L =
    1 +
    (0.015 * Math.pow(L_bar_prime - 50, 2)) /
      Math.sqrt(20 + Math.pow(L_bar_prime - 50, 2));
  const S_C = 1 + 0.045 * C_bar_prime;
  const S_H = 1 + 0.015 * C_bar_prime * T;
  const R_T = -Math.sin(2 * delta_theta) * R_C;
  const termL = deltaL_prime / (kL * S_L);
  const termC = deltaC_prime / (kC * S_C);
  const termH = deltaH_prime / (kH * S_H);
  return Math.sqrt(
    Math.pow(termL, 2) +
      Math.pow(termC, 2) +
      Math.pow(termH, 2) +
      R_T * termC * termH
  );
}

/**
 * Checks if two hex colors are perceptually similar using the CIEDE2000 formula.
 * @param {string} hex1 - The first color in hex format (e.g., "#FFF", "#FFFFFF").
 * @param {string} hex2 - The second color in hex format.
 * @param {number} [threshold=15] - The Delta E value below which colors are considered similar.
 * @returns {boolean} `true` if colors are similar, `false` otherwise.
 */
function areColorsSimilar(hex1, hex2, threshold = 15) {
  const lab1 = xyzToLab(rgbToXyz(hexToRgb(hex1)));
  const lab2 = xyzToLab(rgbToXyz(hexToRgb(hex2)));
  const delta = deltaE2000(lab1, lab2);
  return delta < threshold;
}

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
    return css;
}

/**
 * [MODIFIED] Posts the provided CSS and color configuration to BOTH the new Theme API
 * and the old Branch Config API in parallel.
 *
 * @param {string} token - Staffbase API token.
 * @param {string} branchId - Staffbase branch ID for the old system.
 * @param {string} cssText - The full CSS string to post.
 * @param {object} [colorConfig] - Optional. An object with colors to update.
 * @param {string} colorConfig.primary - The primary color for the interface.
 * @param {string} colorConfig.text - The text color for navigation.
 * @param {string} colorConfig.background - The background color for navigation.
 * @param {string} colorConfig.floatingNavText - The text color of the floating nav.
 * @param {string} colorConfig.floatingNavBg - The background color of the floating nav.
 * @returns {Promise<PromiseSettledResult<any>[]>} An array with the results of both API calls.
 */
export async function postUpdatedCSS(token, branchId, cssText, colorConfig) {
  if (!token || !branchId) {
    throw new Error("Token and Branch ID are required for CSS update.");
  }
  if (typeof cssText !== "string") {
    throw new Error("CSS text must be a string.");
  }

  // --- Promise for the NEW Theme API update ---
  const updateNewSystem = async () => {
    // 1. Get the primary theme to find its ID
    const themeRes = await fetch(
      "https://app.staffbase.com/api/theming/themes/primary",
      {
        headers: { Authorization: `Basic ${token}` },
      }
    );
    if (!themeRes.ok)
      throw new Error(`Theme API (GET): ${themeRes.statusText}`);

    const themeObject = await themeRes.json();
    const themeId = themeObject.id;
    if (!themeId) throw new Error("Theme API: Could not find theme ID.");

    // 2. Update the CSS and Colors in the object
    // Ensure nested objects exist before assigning to them
    themeObject.desktopTheme = themeObject.desktopTheme || {};
    themeObject.globalTheme = themeObject.globalTheme || {};

    // Always update the custom CSS
    themeObject.desktopTheme.customCss = cssText;

    // If colorConfig is provided, update the color properties
    if (colorConfig) {
      themeObject.desktopTheme.components =
        themeObject.desktopTheme.components || {};
      themeObject.desktopTheme.components.navigation =
        themeObject.desktopTheme.components.navigation || {};

      // Deconstruct all colors from the config
      const { primary, text, background, floatingNavText, floatingNavBg } =
        colorConfig;

      // ---- Accent Color Logic ----
      let accentColor = text;
      if (areColorsSimilar(floatingNavText, text)) {
        if (areColorsSimilar(floatingNavText, primary)) {
          accentColor = floatingNavBg;
        } else {
          accentColor = primary;
        }
      }
      // ---- End Accent Color Logic ----

      // ---- Background Color Logic ----
      let finalBackgroundColor = background;
      // CHECK 1: Is the background color too similar to the floating nav text color?
      if (areColorsSimilar(floatingNavText, background)) {
        // If so, CHECK 2: Is the main branding text color also too similar?
        if (areColorsSimilar(floatingNavText, text)) {
          // FALLBACK: Both are too similar, use the floating nav's BG color.
          finalBackgroundColor = floatingNavBg;
        } else {
          // PRIMARY: Use the main branding text color as the background.
          finalBackgroundColor = text;
        }
      }
      // ---- End Background Color Logic ----

      // Map colors based on the final determined values
      themeObject.desktopTheme.components.navigation.accentColor = accentColor;
      themeObject.desktopTheme.components.navigation.backgroundColor =
        finalBackgroundColor;
      themeObject.desktopTheme.components.navigation.textColor = text;
      themeObject.globalTheme.interfaceColor = primary;
    }

    // 3. PUT the updated object to the specific theme endpoint
    const updateRes = await fetch(
      `https://app.staffbase.com/api/theming/themes/${themeId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/vnd.staffbase.theming.themes.theme+json",
          Authorization: `Basic ${token}`,
        },
        body: JSON.stringify(themeObject),
      }
    );

    if (!updateRes.ok) {
      const errorBody = await updateRes.text();
      console.error("Theme API PUT Error:", errorBody);
      throw new Error(`Theme API (PUT): ${updateRes.statusText}`);
    }
    return {
      system: "new",
      status: updateRes.status,
      data: await updateRes.json(),
    };
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
    return { system: "old", status: res.status, data: await res.json() };
  };

  // --- Run both updates concurrently and return their results ---
  return Promise.allSettled([updateNewSystem(), updateOldSystem()]);
}