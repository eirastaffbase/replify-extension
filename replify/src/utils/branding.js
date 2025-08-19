// src/utils/branding.js

// This function now takes the CSS text as an argument.
export const parseBrandingFromCSS = (cssText, blockRegex) => {
    // These helper functions are fine to keep inside
    const clean = (val = "") => val.replace(/!important/i, "").trim().replace(/^['"]|['"]$/g, "");
    const pxToNum = (val = "") => parseInt(val.replace("px", ""), 10) || 0;
    const extractUrl = (raw = "") => (raw.match(/url\(["']?(.*?)["']?\)/i) || [])[1] || "";
  
    const match = cssText.match(blockRegex);
    if (!match) {
      // Instead of setting a response, throw an error that the component can catch.
      throw new Error("No Replify block found in the CSS.");
    }
  
    const block = match[0];
    const grabRaw = (v) => (block.match(new RegExp(`--${v}\\s*:\\s*([^;]+);`, "i")) || [])[1]?.trim();
    const nameMatch = block.match(/\/\*\s*prospect:(.*?)\*\//i);

    // Step 2: Parse the entire CSS string for the conditional logo sizing rule
    let changeLogoSize = false;
    let logoHeight, logoMarginTop;

    const sizeRuleRegex = /\.header-left-container\s*{([^}])}/i;
    const sizeRuleMatch = cssText.match(sizeRuleRegex);

    if (sizeRuleMatch) {
        const ruleContent = sizeRuleMatch[1];
        const heightMatch = ruleContent.match(/height:\s*([^;!])/i);
        const marginTopMatch = ruleContent.match(/margin-top:\s*([^;!])/i);
        
        if (heightMatch && pxToNum(heightMatch[1])) {
        changeLogoSize = true; 
        logoHeight = pxToNum(heightMatch[1]);
        logoMarginTop = marginTopMatch ? pxToNum(marginTopMatch[1]) : 0;
        }
    }
      
    // Return a single object with all the parsed data
    return {
      prospectName: nameMatch ? nameMatch[1].trim() : undefined,
      primaryColor: clean(grabRaw("color-client-primary")),
      textColor: clean(grabRaw("color-client-text")),
      backgroundColor: clean(grabRaw("color-client-background")),
      floatingNavBgColor: clean(grabRaw("color-floating-nav-bg")),
      floatingNavTextColor: clean(grabRaw("color-floating-nav-text")),
      bgUrl: extractUrl(grabRaw("bg-image")),
      logoUrl: extractUrl(grabRaw("logo-url")),
      logoPadHeight: pxToNum((grabRaw("padding-logo-size") || "").split(" ")[0]),
      logoPadWidth: pxToNum((grabRaw("padding-logo-size") || "").split(" ")[1]),
      bgVertical: parseInt(((grabRaw("bg-image-position") || "").split(" ")[1] || "").replace("%", ""), 10),
      changeLogoSize,
      logoHeight,
      logoMarginTop,
    };
  };