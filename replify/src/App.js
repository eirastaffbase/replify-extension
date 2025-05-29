//App.js
/* eslint-disable no-undef */
/* global chrome */

import React, { useState } from "react";

/* ───── Hooks & utils ───── */
import useStaffbaseTab from "./hooks/useStaffbaseTab";
import useSavedTokens from "./hooks/useSavedTokens";
import useAnalyticsRedirects from "./hooks/useAnalyticsRedirects";
import buildPreviewCss from "./utils/buildPreviewCss";
import { fetchCurrentCSS, postUpdatedCSS } from "./utils/staffbaseCss";
import {
  loadTokensFromStorage,
  saveTokensToStorage,
} from "./utils/tokenStorage";
import {
  getInitialAnalyticsStateFromStorage,
  manageAnalyticsScriptInPage,
  handleToggleAnalyticsChange,
} from "./utils/analyticsManager"; 


/* ───── Constants & styles ───── */
import { LAUNCHPAD_DICT, blockRegex } from "./constants/appConstants";
import { responseStyle, containerStyle, headingStyle } from "./styles";

/* ───── Components ───── */
import SavedEnvironments from "./components/SavedEnvironments";
import ApiKeyForm from "./components/ApiKeyForm";
import BrandingForm from "./components/BrandingForm";
import EnvironmentSetupForm from "./components/EnvironmentSetupForm";
import UseEnvironmentOptions from "./components/UseEnvironmentOptions";
import RedirectAnalyticsForm from "./components/RedirectAnalyticsForm";


function App() {
  // --------------------------------------------------
  //  STATE
  // --------------------------------------------------

  /* 🛂  Auth & token–related ---------------------------------------------- */
  const [apiToken, setApiToken] = useState("");
  const [branchId, setBranchId] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [savedTokens, setSavedTokens] = useSavedTokens();
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [showFullToken, setShowFullToken] = useState(null); // which saved token is expanded
  const [useOption, setUseOption] = useState(null); // "select" | "existing" | "new"

  /* 🎨  Branding preview / colours --------------------------------------- */
  const [primaryColor, setPrimaryColor] = useState("#000000");
  const [textColor, setTextColor] = useState("#f0f0f0");
  const [backgroundColor, setBackgroundColor] = useState("#F3F3F3");
  const [logoUrl, setLogoUrl] = useState("");
  const [bgUrl, setBgURL] = useState("");
  const [logoPadWidth, setLogoPadWidth] = useState(0);
  const [logoPadHeight, setLogoPadHeight] = useState(0);
  const [bgVertical, setBgVertical] = useState(0);
  const [previewActive, setPreviewActive] = useState(false);
  const [brandingExists, setBrandingExists] = useState(false); // Replify block already in CSS?

  /* 📰  News scraping (LinkedIn) ------------------------------------------ */
  const [includeArticles, setIncludeArticles] = useState(false);
  const [prospectLinkedInUrl, setProspectLinkedInUrl] = useState("");
  const [linkedInPostsCount, setLinkedInPostsCount] = useState(10);

  /* 📈  Analytics / redirect toggles ---- */
  const [redirectOpen, setRedirectOpen] = useState(false);
  const {
    redirectState,          // State for checkboxes from the hook
    analyticsResponse,      // Response messages from analytics operations
    handleToggleRedirect,   // Handler function from the hook
  } = useAnalyticsRedirects();

  /* ⚙️  Prospect / misc branding inputs ----------------------------------- */
  const [prospectName, setProspectName] = useState("");
  const [includeBranding, setIncludeBranding] = useState(true);

  /* 🏗️  Environment setup toggles ---------------------------------------- */
  const [chatEnabled, setChatEnabled] = useState(false);
  const [microsoftEnabled, setMicrosoftEnabled] = useState(false);
  const [campaignsEnabled, setCampaignsEnabled] = useState(false);
  const [customWidgetsChecked, setCustomWidgetsChecked] = useState(false);
  const [mergeIntegrationsChecked, setMergeIntegrationsChecked] =
    useState(false);
  const [sbEmail, setSbEmail] = useState("");
  const [sbPassword, setSbPassword] = useState("");
  const [mergeField, setMergeField] = useState("");

  /* 📲  Launchpad & mobile quick links ------------------------------------ */
  const [launchpadSel, setLaunchpadSel] = useState([]);
  const [isLaunchpadDropdownOpen, setIsLaunchpadDropdownOpen] = useState(false);
  const [mobileQuickLinks, setMobileQuickLinks] = useState([
    { name: "Home", title: "Home", position: 0, enabled: true },
    { name: "My Directory", title: "Directory", position: 1, enabled: true },
    { name: "Launchpad", title: "Launchpad", position: 2, enabled: true },
  ]);
  const [quickLinksEnabled, setQuickLinksEnabled] = useState(false);

  /* 🔄  UI / async status -------------------------------------------------- */
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState("");

  /* 🌐  Browser-specific --------------------------------------------------- */
  const isStaffbaseTab = useStaffbaseTab(); // are we viewing a Staffbase page?

  // --------------------------------------------------
  //  DERIVED LABELS / SMALL HELPERS
  // --------------------------------------------------

  /** Returns CTA label for the “Create” button depending on the two checkboxes. */
  const getCreateLabel = () => {
    if (includeBranding && includeArticles) return "Create Branding and News";
    if (includeBranding) return "Create Branding";
    if (includeArticles) return "Create News";
    return "Nothing to create";
  };

  /* ──────────────────────────────────────────────────────────────
   BRANDING  (delete, preview on/off)
   ────────────────────────────────────────────────────────────── */

  /** Remove the entire Replify comment-block from the Staffbase CSS. */
  async function deleteBranding() {
    try {
      const css = await fetchCurrentCSS(apiToken);

      if (!css.trim())
        throw new Error("Fetched CSS is empty – aborting delete.");

      // Bail if no Replify block was found
      if (!blockRegex.test(css)) {
        setResponse("Nothing to delete – no Replify block found.");
        return;
      }

      const cleaned = css.replace(blockRegex, "").trim();
      await postUpdatedCSS(apiToken, branchId, cleaned);

      setBrandingExists(false);
      setResponse("✅ Replify branding deleted");
    } catch (err) {
      setResponse(`❌ ${err.message}`);
    }
  }

  /** Pull colors / images / prospect‑name from the existing Replify CSS */
  const pullCurrentBranding = async () => {
    try {
      console.log("start");
      const css = await fetchCurrentCSS(apiToken);
      const match = css.match(blockRegex);
      if (!match) throw new Error("No Replify block found.");

      const block = match[0];

      const nameMatch = block.match(/\/\*\s*prospect:(.*?)\*\//i);
      if (nameMatch) setProspectName(nameMatch[1].trim());
      // helper utilities -------------------------------------------------
      const grabRaw = (v) =>
        (block.match(new RegExp(`--${v}\\s*:\\s*([^;]+);`, "i")) ||
          [])[1]?.trim();
      const clean = (
        val = "" 
      ) =>
        val
          .replace(/!important/i, "")
          .trim()
          .replace(/^['"]|['"]$/g, "");
      const pxToNum = (val = "") => parseInt(val.replace("px", ""), 10) || 0;
      const extractUrl = (
        raw = "" // url("…") → …
      ) => (raw.match(/url\(["']?(.*?)["']?\)/i) || [])[1] || "";

      setPrimaryColor(clean(grabRaw("color-client-primary")) || primaryColor);
      setTextColor(clean(grabRaw("color-client-text")) || textColor);
      setBackgroundColor(
        clean(grabRaw("color-client-background")) || backgroundColor
      );

      setBgURL(extractUrl(grabRaw("bg-image")) || bgUrl);
      setLogoUrl(extractUrl(grabRaw("logo-url")) || logoUrl);

      /* padding & bg‑vert come back as plain numbers */
      const pad = (grabRaw("padding-logo-size") || "").split(" ") || [];
      setLogoPadHeight(pxToNum(pad[0]) || logoPadHeight);
      setLogoPadWidth(pxToNum(pad[1]) || logoPadWidth);

      const pos = (grabRaw("bg-image-position") || "").split(" ") || [];
      setBgVertical(
        parseInt((pos[1] || "").replace("%", ""), 10) || bgVertical
      );

      setResponse("✅ Pulled current branding into the form.");
    } catch (err) {
      setResponse(`❌ ${err.message}`);
    }
  };

  /** Remove the live-preview <style> tag that we injected into the active tab. */
  async function cancelPreview() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (styleId) => {
          const el = document.getElementById(styleId);
          if (el) el.remove();
        },
        args: ["replify-preview-styles"], // keep id in sync with handlePreview
      });

      setPreviewActive(false);
      setResponse("Preview cancelled.");
    } catch (err) {
      setResponse(`Failed to cancel preview: ${err.message}`);
    }
  }

  /* ──────────────────────────────────────────────────────────────
   LAUNCHPAD SELECTION
   ────────────────────────────────────────────────────────────── */

  /** Toggle an item in the Launchpad multiselect. */
  const handleLaunchpadSelect = (option) => {
    if (option === "all") {
      setLaunchpadSel(["all"]);
      return;
    }
    const current = launchpadSel.filter((it) => it !== "all");
    setLaunchpadSel(
      current.includes(option)
        ? current.filter((it) => it !== option)
        : [...current, option]
    );
  };

  /* ──────────────────────────────────────────────────────────────
   AUTHENTICATION  (save/retrieve tokens)
   ────────────────────────────────────────────────────────────── */

  /**
   * Exchange the user-supplied API key for Staffbase metadata, stash the
   * token in local-storage, and prime the UI so the user can pick
   * “Brand” vs “Set Up”.
   */
  const handleAuth = async () => {
    setResponse("Authenticating …");

    try {
      const spacesRes = await fetch("https://app.staffbase.com/api/spaces", {
        headers: { Authorization: `Basic ${apiToken}` },
      });
      if (!spacesRes.ok)
        throw new Error(`Failed to fetch spaces: ${spacesRes.status}`);

      /* 1️⃣ pull data we care about */
      const firstSpace = (await spacesRes.json())?.data?.[0];
      const slug = firstSpace?.accessors?.branch?.slug || "unknown-slug";
      const branchId =
        firstSpace?.accessors?.branch?.id || firstSpace?.branchID;
      const hasNewUI =
        !!firstSpace?.accessors?.branch?.config?.flags?.includes(
          "wow_desktop_menu"
        );

      /* 2️⃣ persist token in localStorage (idempotent) */
      const stored = loadTokensFromStorage();
      if (!stored.find((t) => t.slug === slug)) {
        stored.push({ slug, token: apiToken, branchId, hasNewUI });
        saveTokensToStorage(stored);
      }

      /* 3️⃣ update UI state */
      const mapped = stored.map((t) => ({
        slug: t.slug,
        truncatedToken:
          typeof t.token === "string"
            ? `${t.token.slice(0, 8)}...`
            : "[invalid]",
        fullToken: t.token,
        branchId: t.branchId,
        hasNewUI: t.hasNewUI,
      }));
      setSavedTokens(mapped);
      setBranchId(branchId);
      setUseOption({ type: "select", slug, token: apiToken, branchId });
      setResponse(
        `Authentication successful! Stored token for slug “${slug}”.`
      );
    } catch (err) {
      setResponse(`Authentication failed: ${err.message}`);
    }
  };

  /* ──────────────────────────────────────────────────────────────
   SAVED-TOKEN INTERACTIONS
   ────────────────────────────────────────────────────────────── */

  /** “Set Up” or “Brand” button inside <SavedEnvironments>. */
  const handleUseOptionClick = async ({ mode, token, branchId }) => {
    setApiToken(token);
    setBranchId(branchId);
    setIsAuthenticated(true);
    setUseOption({ type: mode, token, branchId });

    // For existing envs we also flag if a Replify block already lives in CSS
    if (mode === "existing") {
      try {
        const css = await fetchCurrentCSS(token);
        const hasBlock =
          /\/\*\s*⇢\s*REPLIFY START[\s\S]*?REPLIFY END\s*⇠\s*\*\//.test(css);
        setBrandingExists(hasBlock);
      } catch {
        setBrandingExists(false);
      }
    }

    setResponse(
      mode === "existing"
        ? "Using saved environment – ready to brand!"
        : "Using saved environment – ready to set up!"
    );
  };

  /** Trash-can icon next to a saved token. */
  const handleDeleteToken = (slug) => {
    const filtered = savedTokens.filter((t) => t.slug !== slug);
    setSavedTokens(filtered);
    saveTokensToStorage(
      filtered.map(({ slug, fullToken }) => ({ slug, token: fullToken }))
    );
    setShowFullToken(null);
  };

  /** Show/hide the full API key in the token list. */
  const handleShowFullToken = (slug) =>
    setShowFullToken((cur) => (cur === slug ? null : slug));

  /* ──────────────────────────────────────────────────────────────
   BRAND / NEWS CREATION
   ────────────────────────────────────────────────────────────── */

  /** Helper: ensure the LinkedIn URL ends with `/posts/?feedView=images`. */
  const normaliseLinkedInUrl = (raw) =>
    raw
      .replace(/\/posts.*$/i, "") // drop an existing /posts…
      .replace(/\/$/, "") + // drop trailing slash
    "/posts/?feedView=images";

  /**
   * Create or update demo resources:
   *  1. Inject / replace Replify CSS block.
   *  2. Trigger sb-news LinkedIn scraper (optional).
   */
  async function handleCreateDemo() {
    try {
      /* ---------- 1️⃣  CSS block ------------------------------------------ */
      if (includeBranding) {
        setResponse("Updating demo CSS…");

        const existingCss = await fetchCurrentCSS(apiToken);
        if (!existingCss?.trim()) throw new Error("No existing CSS retrieved.");

        const newCssBody = buildPreviewCss({
          primary: primaryColor,
          text: textColor,
          background: backgroundColor,
          bg: bgUrl,
          logo: logoUrl,
          padW: logoPadWidth,
          padH: logoPadHeight,
          bgVert: bgVertical,
          prospectName,
        });

        const newBlock = `/* ⇢ REPLIFY START ⇠ */\n${newCssBody}\n/* ⇢ REPLIFY END ⇠ */`;
        const finalCss = blockRegex.test(existingCss)
          ? existingCss.replace(blockRegex, newBlock)
          : `${existingCss.trim()}\n\n${newBlock}`;

        await postUpdatedCSS(apiToken, branchId, finalCss);
        setBrandingExists(true);
        setResponse("Demo CSS updated!");
      }

      /* ---------- 2️⃣  LinkedIn articles ---------------------------------- */
      if (
        includeArticles &&
        prospectLinkedInUrl &&
        /linkedin\.com/i.test(prospectLinkedInUrl)
      ) {
        const fixedUrl = normaliseLinkedInUrl(prospectLinkedInUrl);
        if (fixedUrl !== prospectLinkedInUrl) setProspectLinkedInUrl(fixedUrl);

        setResponse(
          (p) =>
            p +
            "\nFetching LinkedIn posts… allow 5-7 min; you can close this panel."
        );

        /* 2-a) resolve / create “Top News” channel */
        let topNewsChannelId = null;
        try {
          const r = await fetch(
            `https://app.staffbase.com/api/spaces/${branchId}/installations?pluginID=news`,
            { headers: { Authorization: `Basic ${apiToken.trim()}` } }
          );
          if (r.ok) {
            const hit = (await r.json())?.data?.find((i) =>
              i.config?.localization?.en_US?.title
                ?.toLowerCase()
                .includes("top news")
            );
            if (hit) topNewsChannelId = hit.id;
          }
        } catch {
          /* ignore */
        }

        if (!topNewsChannelId) {
          const payload = {
            pluginID: "news",
            contentType: "articles",
            accessorIDs: [branchId],
            config: {
              localization: {
                en_US: { title: `Top News // ${prospectName || "Demo"}` },
              },
            },
          };
          const crt = await fetch(
            `https://app.staffbase.com/api/spaces/${branchId}/installations`,
            {
              method: "POST",
              headers: {
                Authorization: `Basic ${apiToken.trim()}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            }
          );
          if (!crt.ok)
            throw new Error(`failed to create “Top News” (${crt.status})`);
          topNewsChannelId = (await crt.json()).id;
        }

        /* 2-b) fire sb-news scraper */
        const payload = {
          channelID: topNewsChannelId,
          pageURL: fixedUrl,
          totalPosts: linkedInPostsCount || 10,
        };
        const newsRes = await fetch(
          "https://sb-news-generator.uc.r.appspot.com/api/v1/bulkscrape/linkedin/article",
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${apiToken.trim()}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );
        if (!newsRes.ok) throw new Error(`sb-news responded ${newsRes.status}`);

        setResponse("Complete! Refresh for your branded demo!");
      }
    } catch (err) {
      setResponse(`❌ ${err.message}`);
    }
  }

  /* ──────────────────────────────────────────────────────────────
   LIVE CSS PREVIEW
   ────────────────────────────────────────────────────────────── */

  /** Inject (or update) a <style> tag with the current colour config. */
  async function handlePreview() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      const css = buildPreviewCss({
        primary: primaryColor,
        text: textColor,
        background: backgroundColor,
        bg: bgUrl,
        logo: logoUrl,
        padW: logoPadWidth,
        padH: logoPadHeight,
        bgVert: bgVertical,
      });

      setPreviewActive(true);

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (cssText, styleId) => {
          let style = document.getElementById(styleId);
          if (!style) {
            style = document.createElement("style");
            style.id = styleId;
            document.head.appendChild(style);
          }
          style.textContent = cssText;
        },
        args: [css, "replify-preview-styles"],
      });

      setResponse("Preview applied. Refresh the tab to clear it");
    } catch (err) {
      setResponse(`Preview failed: ${err.message}`);
    }
  }

  /* ──────────────────────────────────────────────────────────────
   ENVIRONMENT CREATION
   ────────────────────────────────────────────────────────────── */

  /** POST to Replify backend to spin up a fresh environment with selected extras. */
  async function handleSetupNewEnv() {
    setResponse("Setting up new environment! Allow 1-2 minutes…");
    setIsLoading(true);

    const body = {
      chat: chatEnabled,
      microsoft: microsoftEnabled,
      campaigns: campaignsEnabled,
    };
    if (launchpadSel.length) body.launchpad = launchpadSel;
    if (quickLinksEnabled) {
      body.mobileQuickLinks = Object.fromEntries(
        mobileQuickLinks
          .filter((l) => l.name.trim())
          .map((l) => [l.name, { title: l.title, position: l.position }])
      );
    }
    if (customWidgetsChecked) body.customWidgets = [sbEmail, sbPassword];
    if (mergeIntegrationsChecked)
      body.workdayMerge = [sbEmail, sbPassword, mergeField];

    try {
      const r = await fetch(
        "https://sb-news-generator.uc.r.appspot.com/api/v1/installations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiToken}`,
          },
          body: JSON.stringify(body),
        }
      );
      if (!r.ok) throw new Error(`${r.status}`);
      setResponse("Environment created!");
    } catch (err) {
      setResponse(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }  

  /* ──────────────────────────────────────────────────────────────
   UI UTILS
   ────────────────────────────────────────────────────────────── */

  /** Tiny breadcrumb nav that appears after the user clicks a saved token. */
  const renderBreadcrumbs = () => (
    <div style={{ marginBottom: 20 }}>
      <button
        style={{
          background: "none",
          border: "none",
          color: "#007bff",
          cursor: "pointer",
          padding: 0,
          fontSize: 14,
        }}
        onClick={() => setUseOption({ type: null })}
      >
        ← Back
      </button>
    </div>
  );

  /* ——— Quick‑link helpers ——— */
  const handleQuickLinkChange = (idx, field, val) => {
    setMobileQuickLinks((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      copy.forEach((l, i) => (l.position = i)); // keep positions tidy
      return copy;
    });
  };

  const handleQuickLinkSwap = (aIdx, bIdx) => {
    setMobileQuickLinks((prev) => {
      const copy = [...prev];
      [copy[aIdx].position, copy[bIdx].position] = [
        copy[bIdx].position,
        copy[aIdx].position,
      ];
      return copy;
    });
  };

  const handleQuickLinkDelete = (idx) =>
    setMobileQuickLinks((prev) =>
      prev.filter((_, i) => i !== idx).map((l, i) => ({ ...l, position: i }))
    );

  const handleQuickLinkAdd = () =>
    setMobileQuickLinks((prev) => [
      ...prev,
      { name: "", title: "", position: prev.length, enabled: true },
    ]);

  // --------------------------------------------------
  //  JSX
  // --------------------------------------------------
  return (
    <div style={containerStyle}>
      <h1 style={headingStyle}>Replify for Staffbase</h1>

      {/* ─────────── SAVED ENVIRONMENTS ─────────── */}
      <SavedEnvironments
        savedTokens={savedTokens}
        showFull={showFullToken}
        onUse={({ slug, token, branchId }) =>
          setUseOption({ type: "select", slug, token, branchId })
        }
        onToggle={handleShowFullToken}
        onDelete={handleDeleteToken}
        onAdd={() => setShowApiKeyInput((prev) => !prev)}
      />

      <RedirectAnalyticsForm
        open={redirectOpen}
        onToggleOpen={() => setRedirectOpen((o) => !o)}
        state={redirectState}
        onToggleType={handleToggleRedirect} 
      />

      {useOption?.type && renderBreadcrumbs()}

      {/* ─────────── ENTER API-KEY FIRST TIME ─────────── */}
      {!useOption?.type && !isAuthenticated && showApiKeyInput && (
        <ApiKeyForm
          value={apiToken}
          onChange={(e) => setApiToken(e.target.value)}
          onAuth={handleAuth}
        />
      )}

      {/* ─────────── CHOOSE “SET-UP” vs “BRAND” ─────────── */}
      {useOption?.type === "select" && (
        <UseEnvironmentOptions
          slug={useOption.slug}
          onChoose={(mode) =>
            handleUseOptionClick({
              mode,
              token: useOption.token,
              branchId: useOption.branchId,
            })
          }
        />
      )}

      {/* ─────────── BRAND EXISTING ENV ─────────── */}
      {isAuthenticated && useOption?.type === "existing" && (
        <BrandingForm
          /* flags & handlers */
          isStaffbaseTab={isStaffbaseTab}
          includeBranding={includeBranding}
          setIncludeBranding={setIncludeBranding}
          includeArticles={includeArticles}
          setIncludeArticles={setIncludeArticles}
          brandingExists={brandingExists}
          /* live preview */
          previewActive={previewActive}
          onPreview={handlePreview}
          onCancelPreview={cancelPreview}
          /* helpers */
          getCreateLabel={getCreateLabel}
          /* prospect / style state */
          prospectName={prospectName}
          setProspectName={setProspectName}
          logoUrl={logoUrl}
          setLogoUrl={setLogoUrl}
          bgUrl={bgUrl}
          setBgURL={setBgURL}
          primaryColor={primaryColor}
          setPrimaryColor={setPrimaryColor}
          textColor={textColor}
          setTextColor={setTextColor}
          backgroundColor={backgroundColor}
          setBackgroundColor={setBackgroundColor}
          logoPadWidth={logoPadWidth}
          setLogoPadWidth={setLogoPadWidth}
          logoPadHeight={logoPadHeight}
          setLogoPadHeight={setLogoPadHeight}
          bgVertical={bgVertical}
          setBgVertical={setBgVertical}
          prospectLinkedInUrl={prospectLinkedInUrl}
          setProspectLinkedInUrl={setProspectLinkedInUrl}
          /* action */
          onCreateDemo={handleCreateDemo}
          onDeleteBranding={deleteBranding}
          onPullBranding={pullCurrentBranding}
        />
      )}

      {/* ─────────── SET-UP BRAND-NEW ENV ─────────── */}
      {isAuthenticated && useOption?.type === "new" && (
        <EnvironmentSetupForm
          /* toggles */
          chatEnabled={chatEnabled}
          setChatEnabled={setChatEnabled}
          microsoftEnabled={microsoftEnabled}
          setMicrosoftEnabled={setMicrosoftEnabled}
          campaignsEnabled={campaignsEnabled}
          setCampaignsEnabled={setCampaignsEnabled}
          /* launchpad */
          launchpadSel={launchpadSel}
          items={LAUNCHPAD_DICT}
          openLaunchpad={isLaunchpadDropdownOpen}
          onToggleLaunchpadOpen={() =>
            setIsLaunchpadDropdownOpen((open) => !open)
          }
          onToggleLaunchpadItem={handleLaunchpadSelect}
          /* mobile quick links */
          quickLinksEnabled={quickLinksEnabled}
          setQuickLinksEnabled={setQuickLinksEnabled}
          mobileQuickLinks={mobileQuickLinks}
          onQuickLinkChange={handleQuickLinkChange}
          onQuickLinkSwap={handleQuickLinkSwap}
          onQuickLinkDelete={handleQuickLinkDelete}
          onQuickLinkAdd={handleQuickLinkAdd}
          /* widgets / merge */
          customWidgetsChecked={customWidgetsChecked}
          setCustomWidgetsChecked={setCustomWidgetsChecked}
          mergeIntegrationsChecked={mergeIntegrationsChecked}
          setMergeIntegrationsChecked={setMergeIntegrationsChecked}
          sbEmail={sbEmail}
          setSbEmail={setSbEmail}
          sbPassword={sbPassword}
          setSbPassword={setSbPassword}
          mergeField={mergeField}
          setMergeField={setMergeField}
          /* submit */
          onSetup={handleSetupNewEnv}
        />
      )}

      {/* ─────────── “DEFAULT” BRANDING VIEW WHEN AUTHED ─────────── */}
      {isAuthenticated &&
        !useOption &&
        (isLoading ? (
          <div>Loading…</div>
        ) : (
          <BrandingForm
            isStaffbaseTab={isStaffbaseTab}
            includeBranding={includeBranding}
            setIncludeBranding={setIncludeBranding}
            includeArticles={includeArticles}
            setIncludeArticles={setIncludeArticles}
            brandingExists={brandingExists}
            previewActive={previewActive}
            onPreview={handlePreview}
            onCancelPreview={cancelPreview}
            getCreateLabel={getCreateLabel}
            prospectName={prospectName}
            setProspectName={setProspectName}
            logoUrl={logoUrl}
            setLogoUrl={setLogoUrl}
            bgUrl={bgUrl}
            setBgURL={setBgURL}
            primaryColor={primaryColor}
            setPrimaryColor={setPrimaryColor}
            textColor={textColor}
            setTextColor={setTextColor}
            backgroundColor={backgroundColor}
            setBackgroundColor={setBackgroundColor}
            logoPadWidth={logoPadWidth}
            setLogoPadWidth={setLogoPadWidth}
            logoPadHeight={logoPadHeight}
            setLogoPadHeight={setLogoPadHeight}
            bgVertical={bgVertical}
            setBgVertical={setBgVertical}
            prospectLinkedInUrl={prospectLinkedInUrl}
            setProspectLinkedInUrl={setProspectLinkedInUrl}
            onCreateDemo={handleCreateDemo}
          />
        ))}

      {/* ─────────── SERVER RESPONSES ─────────── */}
      {response && <pre style={responseStyle}>{response}</pre>}
    </div>
  );
}

export default App;
