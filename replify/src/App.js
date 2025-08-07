// App.js
/* eslint-disable no-undef */
/* global chrome */

import React, { useState, useEffect } from "react";

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
import { automationScript } from "./utils/automationRunner";


/* ───── Constants & styles ───── */
import { LAUNCHPAD_DICT, blockRegex } from "./constants/appConstants";
import { responseStyle, containerStyle, headingStyle, brandingButtonStyle, subDescriptionStyle } from "./styles";


/* ───── Components ───── */
import SavedEnvironments from "./components/SavedEnvironments";
import ApiKeyForm from "./components/ApiKeyForm";
import BrandingForm from "./components/BrandingForm";
import EnvironmentSetupForm from "./components/EnvironmentSetupForm";
import UseEnvironmentOptions from "./components/UseEnvironmentOptions";
import RedirectAnalyticsForm from "./components/RedirectAnalyticsForm";
import FeedbackBanner from "./components/FeedbackBanner";
import UpdateUserForm from "./components/UpdateUserForm";
import AutomationForm from "./components/AutomationForm";
import ProgressBar from "./components/ProgressBar";


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
  const [applyMobileBranding, setApplyMobileBranding] = useState(false);
  const [previewActive, setPreviewActive] = useState(false);
  const [brandingExists, setBrandingExists] = useState(false); // Replify block already in CSS?

  /* 📰  News scraping (LinkedIn) ------------------------------------------ */
  const [includeArticles, setIncludeArticles] = useState(false);
  const [prospectLinkedInUrl, setProspectLinkedInUrl] = useState("");
  const [linkedInPostsCount, setLinkedInPostsCount] = useState(10);

  /* 📈  Analytics / redirect toggles ---- */
  const [redirectOpen, setRedirectOpen] = useState(false);
  const {
    redirectState,
    analyticsResponse, // if needed for display
    handleToggleRedirect,
  } = useAnalyticsRedirects();

  /* ⚙️  Prospect / misc branding inputs ----------------------------------- */
  const [prospectName, setProspectName] = useState("");
  const [includeBranding, setIncludeBranding] = useState(true);

  /* 🏗️  Environment setup toggles ---------------------------------------- */
  const [chatEnabled, setChatEnabled] = useState(false);
  const [microsoftEnabled, setMicrosoftEnabled] = useState(false);
  const [journeysEnabled, setJourneysEnabled] = useState(false); // New state for Journeys
  const [loggedInUserId, setLoggedInUserId] = useState(null); // New state for user ID
  const [campaignsEnabled, setCampaignsEnabled] = useState(false);
  const [customWidgetsChecked, setCustomWidgetsChecked] = useState(false);
  const [mergeIntegrationsChecked, setMergeIntegrationsChecked] =
    useState(false);
  const [sbEmail, setSbEmail] = useState("");
  const [sbPassword, setSbPassword] = useState("");
  const [mergeField, setMergeField] = useState("");
  const [setupEmailChecked, setSetupEmailChecked] = useState(false);


  /* 📲  Launchpad & mobile quick links ------------------------------------ */
  const [launchpadSel, setLaunchpadSel] = useState([]);
  const [isLaunchpadDropdownOpen, setIsLaunchpadDropdownOpen] = useState(false);
  const [mobileQuickLinks, setMobileQuickLinks] = useState([
    { name: "Home", title: "Home", position: 0, enabled: true },
    { name: "My Directory", title: "Directory", position: 1, enabled: true },
    { name: "Launchpad", title: "Launchpad", position: 2, enabled: true },
  ]);
  const [quickLinksEnabled, setQuickLinksEnabled] = useState(false);

/* 👥  User management ---------------------------------------------------- */
const [usersList, setUsersList] = useState([]);
const [selectedUserId, setSelectedUserId] = useState("");
const [userProfile, setUserProfile] = useState(null);
const [fieldToUpdate, setFieldToUpdate] = useState("");
const [newValue, setNewValue] = useState("");
const [allProfileFields, setAllProfileFields] = useState([]); 
const [adminUserId, setAdminUserId] = useState(null);        
const [nestedFieldKeys, setNestedFieldKeys] = useState([]);
const [userManagementView, setUserManagementView] = useState('selection'); // 'selection', 'profile', or 'automation'


  /* 🔄  UI / async status -------------------------------------------------- */
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState("");

  /* 🌐  Browser-specific --------------------------------------------------- */
  const isStaffbaseTab = useStaffbaseTab(); // are we viewing a Staffbase page?

  /* 🌐  Progress tracking -------------------------------------------------- */
  const [automationRunning, setAutomationRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [progressData, setProgressData] = useState({
    tasksCompleted: 0,
    totalTasks: 0,
    currentUser: null,
    currentStatus: null,
  });

  
  // --------------------------------------------------
  //   SMALL HELPERS
  // --------------------------------------------------


    useEffect(() => {
      const messageListener = (message, sender, sendResponse) => {
          if (message.type === 'automationProgress') {
              setProgressData(prev => ({
                  tasksCompleted: message.payload.tasksCompleted,
                  totalTasks: message.payload.totalTasks,
                  // Only update user/status if they are provided, otherwise keep the last known value
                  currentUser: message.payload.user || prev.currentUser,
                  currentStatus: message.payload.status || prev.currentStatus,
              }));
          } else if (message.type === 'automationComplete') {
              setAutomationRunning(false);
              setResponse("✅ Automation has finished!");
          }
      };
      
      chrome.runtime.onMessage.addListener(messageListener);
      
      return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, []); // Empty array ensures this runs only once
  
  const handleLoginAsUser = async () => {
    if (!selectedUserId) {
      setResponse("⚠️ Please select a user to log in as.");
      return;
    }
    if (!isStaffbaseTab) {
      setResponse("❌ This action can only be run on a Staffbase tab.");
      return;
    }

    const userToLogin = usersList.find((user) => user.id === selectedUserId);
    const identifier =
      userToLogin?.emails?.find((e) => e.primary)?.value ||
      userToLogin?.emails?.[0]?.value;

    if (!identifier) {
      setResponse(`❌ Could not find a primary email for user ID ${selectedUserId}.`);
      return;
    }

    setResponse(`Attempting to log in as ${identifier}...`);
    setIsLoading(true);

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      // This function will be executed in the page's context
      const scriptToInject = (userIdentifier) => {
        const loginAndReload = async () => {
          try {
            console.log(`Inject: Attempting login for ${userIdentifier}`);
            const loginResponse = await fetch("/api/sessions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                identifier: userIdentifier,
                secret: "Clone12345", // Using the same hardcoded password as the automation script
                locale: "en_US",
              }),
            });

            if (!loginResponse.ok) {
              const errorData = await loginResponse.json();
              throw new Error(
                `Login API failed with status ${loginResponse.status}: ${
                  errorData.message || "Unknown error"
                }`
              );
            }

            console.log("Inject: Login successful. Reloading page...");
            alert(`Successfully logged in as ${userIdentifier}. The page will now reload.`);
            window.location.reload();
          } catch (error) {
            console.error("Inject: Login script failed.", error);
            alert(`Failed to log in as ${userIdentifier}. See console for details. Error: ${error.message}`);
          }
        };
        loginAndReload();
      };

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: scriptToInject,
        args: [identifier],
      });

      setResponse(`✅ Login script injected for ${identifier}. Check the tab.`);
    } catch (err) {
      setResponse(`❌ Script injection failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunAutomation = async (selectedUserIds, automationOptions) => {
    if (selectedUserIds.length === 0) {
      setResponse("⚠️ Please select at least one user.");
      return;
    }

    setResponse("🚀 Starting automation... preparing new tab.");
    setProgressData({ tasksCompleted: 0, totalTasks: 0, currentUser: null, currentStatus: "Initializing..." });
    setAutomationRunning(true);
    setIsLoading(true);

    const selectedUsers = usersList.filter(user => selectedUserIds.includes(user.id));
    if (selectedUsers.length === 0) {
        setResponse("❌ Error: Could not find user data for the current selection.");
        setIsLoading(false);
        return;
    }

    try {
      const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const origin = new URL(currentTab.url).origin;
      const rootUrl = `${origin}/`;

      const newTab = await chrome.tabs.create({ url: rootUrl, active: true });

      // Prevent Chrome from automatically discarding the tab to save memory
      await chrome.tabs.update(newTab.id, { autoDiscardable: false });

      const listener = (tabId, changeInfo, tab) => {
        if (tabId === newTab.id && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);

          setResponse(`Tab ready. Injecting main automation script...`);
          
          chrome.scripting.executeScript({
            target: { tabId: newTab.id },
            func: automationScript,
            args: [selectedUsers, apiToken, adminUserId, automationOptions],
          });
          
          setResponse(`✅ Script injected. The new tab will now run the automation.`);
          setIsLoading(false);
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
      
    } catch (err) {
      setResponse(`❌ Automation failed: ${err.message}`);
      setIsLoading(false);
      setAutomationRunning(false);
    }
  };


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

  /** Pre-configures the "New Environment" form with default email and user ID. */
  const prepareNewEnvironmentSetup = async (token, slug) => {
    if (!slug) {
      setResponse("⚠️ Slug not found, cannot set up default email.");
      return;
    }
  
    // Set default email immediately
    const defaultEmail = `admin+${slug}@staffbase.com`;
    setSbEmail(defaultEmail);
    setResponse(`Default email set to ${defaultEmail}. Fetching user ID...`);
  
    // Fetch user ID for journeys
    try {
      const meResponse = await fetch('https://app.staffbase.com/api/users/me', {
        headers: { Authorization: `Basic ${token}` }
      });
      if (!meResponse.ok) throw new Error('Failed to fetch current user ID');
      const meData = await meResponse.json();
      setLoggedInUserId(meData.id);
      setResponse(prev => prev + `\n✅ User ID for Journeys is ${meData.id}.`);
    } catch (error) {
      setResponse(prev => prev + `\n⚠️ Could not fetch user ID for Journeys. Error: ${error.message}`);
    }
  };

  /** “Set Up” or “Brand” button inside <UseEnvironmentOptions>. */
  const handleUseOptionClick = async ({ mode, token, branchId }) => {
    setApiToken(token);
    setBranchId(branchId);
    setIsAuthenticated(true);
    setUseOption({ type: mode, token, branchId });
    setUserManagementView('selection'); // Reset to main selection view

    if (mode === 'new') {
      prepareNewEnvironmentSetup(token, useOption.slug);
    } else if (mode === "users") {
      fetchUsers(token); // Fetch users when entering this mode
      fetchAllProfileFields(token, branchId); 
    } else if (mode === "existing") {
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
        : mode === "users"
        ? "Ready for user management!"
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
   * 1. Inject / replace Replify CSS block.
   * 2. Trigger sb-news LinkedIn scraper (optional).
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
    setResponse("Processing setup request...");
    setIsLoading(true);
  
    const messages = [];
    
    // Determine if the installations endpoint needs to be called
    const isInstallationSetupNeeded =
      chatEnabled ||
      microsoftEnabled ||
      (journeysEnabled && loggedInUserId) ||
      launchpadSel.length > 0 ||
      quickLinksEnabled ||
      customWidgetsChecked ||
      mergeIntegrationsChecked;

    try {
      // 1. Conditionally set up environment features (installations)
      if (isInstallationSetupNeeded) {
        setResponse("Setting up environment features...");
        const body = {
          chat: chatEnabled,
          microsoft: microsoftEnabled,
          campaigns: campaignsEnabled,
        };
        if (launchpadSel.length) body.launchpad = launchpadSel;
        if (journeysEnabled && loggedInUserId) {
          body.journeys = { user: loggedInUserId, desired: ["all"] };
        }
        if (quickLinksEnabled) {
          body.mobileQuickLinks = Object.fromEntries(
            mobileQuickLinks
              .filter((l) => l.name.trim())
              .map((l) => [l.name, { title: l.title, position: l.position }])
          );
        }
        if (customWidgetsChecked) body.customWidgets = [sbEmail, sbPassword];
        if (mergeIntegrationsChecked) {
          body.workdayMerge = [sbEmail, sbPassword, mergeField];
        }
  
        const envResponse = await fetch(
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
  
        if (envResponse.ok) {
          messages.push("✅ Environment features configured successfully!");
        } else {
          throw new Error(`Environment setup failed: ${envResponse.statusText}`);
        }
      }
  
      // 2. Conditionally set up email templates
      if (setupEmailChecked) {
        setResponse("Setting up email templates...");
        const emailResponse = await fetch(
          "https://sb-news-generator.uc.r.appspot.com/api/v1/generate/email-templates",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiToken}`,
            },
            body: JSON.stringify({ domain: "app.staffbase.com" }),
          }
        );
  
        if (emailResponse.ok) {
          messages.push("✅ Email templates set up successfully!");
        } else {
          throw new Error(`Failed to set up email templates: ${emailResponse.statusText}`);
        }
      }
  
      // Set final response message
      if (messages.length === 0) {
        setResponse("Nothing to set up. Please check an option.");
      } else {
        setResponse(messages.join("\n"));
      }
      
    } catch (err) {
      setResponse(`❌ Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }


  /* ──────────────────────────────────────────────────────────────
    USER MANAGEMENT
    ────────────────────────────────────────────────────────────── */

  /** * Fetches all users, finds the first admin ID for updates, 
   * and cleans up usernames for display. 
   */
  const fetchUsers = async (token) => {
    setIsLoading(true);
    setResponse("Fetching users...");
    try {
      const response = await fetch("https://app.staffbase.com/api/users", {
        credentials: "omit",
        headers: { Authorization: `Basic ${token}` },
      });
      if (!response.ok) throw new Error(`Failed to fetch users: ${response.statusText}`);
      
      const data = await response.json();
      const allUsers = data.data || [];

      // 1. Find the first user with the admin role and set their ID
      const adminUser = allUsers.find(user => user.branchRole === 'WeBranchAdminRole');
      if (adminUser) {
        setAdminUserId(adminUser.id);
      } else {
        setAdminUserId(null); // Explicitly set to null if no admin is found
        setResponse(prev => prev + "\n⚠️ No admin user found. Updates will be disabled.");
      }

      // 2. Clean the username data before setting it to state
      const cleanedUsers = allUsers.map(user => {
        // Safety check: Only call replace if user.username is a string
        const cleanedUsername = typeof user.username === 'string'
          ? user.username.replace(/^\(|\)$/g, '')
          : user.username; // If not a string, leave it as is (e.g., null)
          
        return { ...user, username: cleanedUsername };
      });
      
      setUsersList(cleanedUsers);
      setResponse("✅ Users loaded. Ready for user management.");

    } catch (err) {
      setResponse(`❌ ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  /** Fetches all available, non-read-only profile fields for the branch. */
  const fetchAllProfileFields = async (token, branchId) => {
    // UPDATE: Only exclude image fields for now.
    const fieldsToExclude = [
      'avatar', 
      'profileHeaderImage',
      'apitoken'
    ];
  
    try {
      const response = await fetch(`https://app.staffbase.com/api/branches/${branchId}/profilefields`, {
        headers: { Authorization: `Basic ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch profile fields");
      
      const data = await response.json();
      const fields = Object.values(data.schema)
        .filter(field => !field.readOnly)
        .map(field => field.slug)
        .filter(slug => !fieldsToExclude.includes(slug));
        
      setAllProfileFields(fields);
    } catch (err) {
      console.error(err.message);
      setResponse(prev => prev + "\n⚠️ Could not fetch all profile fields.");
    }
  };

  

  /** Fetch the full profile for a single selected user. */
  useEffect(() => {
    // This hook is now simplified, as it no longer needs to find nested keys.
    if (!selectedUserId || !apiToken) {
      setUserProfile(null);
      return;
    }
    const fetchUserProfile = async () => {
      setIsLoading(true);
      setResponse(`Fetching profile for user ${selectedUserId}...`);
      try {
        const response = await fetch(`https://app.staffbase.com/api/users/${selectedUserId}`, {
          headers: { Authorization: `Basic ${apiToken}` },
        });
        if (!response.ok) throw new Error(`Failed to fetch profile: ${response.statusText}`);
        
        const data = await response.json();
        setUserProfile(data);
        
        setResponse("✅ Profile loaded. Select a field to update.");
      } catch (err) {
        setResponse(`❌ ${err.message}`);
        setUserProfile(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [selectedUserId, apiToken]);

  /** * Sends a PUT request, defaulting to nesting fields under 'profile'
   * unless the field is in the 'topLevelFields' list.
   */
  const handleUpdateUser = async () => {
    if (!selectedUserId || !fieldToUpdate || !newValue) {
      setResponse("Please select a user, a field, and provide a new value.");
      return;
    }
    if (!adminUserId) {
      setResponse("❌ Cannot update: Branch Admin user ID not found.");
      return;
    }

    setIsLoading(true);
    setResponse("Updating user profile...");

    // Define the exceptions: fields that are NOT nested under 'profile'.
    const topLevelFields = [
      'firstName', 
      'lastName', // lastName is often top-level as well
      'department', 
      'publicEmailAddress', 
      'position', 
      'location', 
      'phoneNumber'
    ];

    let body;
    // If the field is in our exception list, build a top-level body.
    if (topLevelFields.includes(fieldToUpdate)) {
      body = { [fieldToUpdate]: newValue };
    } else {
      // Otherwise, default to nesting it under 'profile'.
      body = { profile: { [fieldToUpdate]: newValue } };
    }

    try {
      const response = await fetch(`https://app.staffbase.com/api/users/${selectedUserId}`, {
        method: 'PUT',
        mode: "cors",
        credentials: "omit",           
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${apiToken}`,
          'USERID': adminUserId,
        },
        body: JSON.stringify(body),
      });

      const updatedUser = await response.json(); 

      if (!response.ok) {
        throw new Error(updatedUser.message || `API responded with status ${response.status}`);
      }
      
      let actualValue;
      // Use the same logic to find the updated value for verification.
      if (topLevelFields.includes(fieldToUpdate)) {
        actualValue = updatedUser[fieldToUpdate];
      } else {
        actualValue = updatedUser.profile?.[fieldToUpdate];
      }
      
      const isSuccess = String(actualValue) === String(newValue);

      let verificationMessage = `Update sent for user ${selectedUserId}.\n\n`;
      verificationMessage += `--- Verification ---\n`;
      verificationMessage += `Field: '${fieldToUpdate}'\n`;
      verificationMessage += `Requested: '${newValue}'\n`;
      verificationMessage += `Result: '${actualValue ?? "Not set"}'\n`;
      verificationMessage += `Status: ${isSuccess ? '✔️ Verified Match' : '❌ Mismatch!'}`;
      
      setResponse(verificationMessage);

    } catch (err) {
      setResponse(`❌ Update Failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };








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
        onClick={() => {
          setUseOption({ type: null });
          setUserManagementView('selection'); // Also reset user mgmt view
        }}
      >
        ← Back to Environments
      </button>
    </div>
  );
  
  /** Breadcrumb nav for inside the User Management section. */
  const renderUserMgmtBreadcrumbs = () => (
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
        onClick={() => setUserManagementView('selection')}
      >
        ← Back to User Options
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

      <FeedbackBanner />

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
        open={redirectOpen} // This state should be managed in App.js
        onToggleOpen={() => setRedirectOpen((o) => !o)} // This should be managed in App.js
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

      {/* ─────────── USER MANAGEMENT (AUTOMATION / PROFILE) ─────────── */}
      {isAuthenticated && useOption?.type === "users" && (
        <>
          {userManagementView !== 'selection' && renderUserMgmtBreadcrumbs()}

          {userManagementView === 'selection' && (
            <div style={{ marginTop: '10px' }}>
              <button style={brandingButtonStyle} onClick={() => setUserManagementView('automation')}>
                Automation
              </button>
              <p style={subDescriptionStyle}>
                This can fill out surveys, forms, comment, create chat groups, and more.
              </p>

              <button style={{ ...brandingButtonStyle, marginTop: '20px' }} onClick={() => setUserManagementView('profile')}>
                User Profile
              </button>
              <p style={subDescriptionStyle}>
                Update user profile fields.
              </p>
            </div>
          )}
          
          {userManagementView === 'automation' && (
            <AutomationForm
              users={usersList}
              isStaffbaseTab={isStaffbaseTab}
              onRun={handleRunAutomation}
              automationRunning={automationRunning}
              progressData={progressData} 
            />
          )}
          {userManagementView === 'profile' && (
            <UpdateUserForm
            users={usersList}
            selectedUserId={selectedUserId}
            onUserSelect={setSelectedUserId}
            userProfile={userProfile}
            fieldToUpdate={fieldToUpdate}
            onFieldChange={setFieldToUpdate}
            newValue={newValue}
            onNewValueChange={setNewValue}
            onUpdate={handleUpdateUser}
            isLoading={isLoading}
            allProfileFields={allProfileFields}
            onLoginAsUser={handleLoginAsUser} 
          />
          )}
        </>
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
          journeysEnabled={journeysEnabled}
          setJourneysEnabled={setJourneysEnabled}
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
          setupEmailChecked={setupEmailChecked}         
          setSetupEmailChecked={setSetupEmailChecked}          
          sbEmail={sbEmail}
          setSbEmail={setSbEmail}
          sbPassword={sbPassword}
          setSbPassword={setSbPassword}
          mergeField={mergeField}
          setSetMergeField={setMergeField}
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