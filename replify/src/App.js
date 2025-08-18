// App.js
/* eslint-disable no-undef */
/* global chrome */

import React, { useState, useEffect } from "react";

/* ───── Hooks & utils ───── */
import useStaffbaseTab from "./hooks/useStaffbaseTab";
import useSavedTokens from "./hooks/useSavedTokens";
import useAnalyticsRedirects from "./hooks/useAnalyticsRedirects";
import buildPreviewCss from "./utils/buildPreviewCss";
import { fetchCurrentCSS, postUpdatedCSS, resetDesktopTheme } from "./utils/staffbaseCss";
import {
  loadTokensFromStorage,
  saveTokensToStorage,
} from "./utils/tokenStorage";
import { automationScript } from "./utils/automationRunner";
import { normaliseLinkedInUrl, buildImagePayload } from "./utils/helpers";
import { parseBrandingFromCSS } from "./utils/branding";

/* ───── Constants & styles ───── */
import { LAUNCHPAD_DICT, blockRegex } from "./constants/appConstants";
import {
  responseStyle,
  containerStyle,
  brandingButtonStyle,
  subDescriptionStyle,
  logoStyle,
} from "./styles";
import { colors } from "./styles/colors"; // Import new colors

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
  const [floatingNavBgColor, setFloatingNavBgColor] = useState("#FFFFFF");
  const [floatingNavTextColor, setFloatingNavTextColor] = useState("#000000");
  const [logoUrl, setLogoUrl] = useState("");
  const [bgUrl, setBgURL] = useState("");
  const [logoPadWidth, setLogoPadWidth] = useState(0);
  const [logoPadHeight, setLogoPadHeight] = useState(0);
  const [bgVertical, setBgVertical] = useState(0);
  const [previewActive, setPreviewActive] = useState(false);
  const [brandingExists, setBrandingExists] = useState(false); // Replify block already in CSS?
  const [resetThemeOnDelete, setResetThemeOnDelete] = useState(false);

  /* 📰  News scraping (LinkedIn) ------------------------------------------ */
  const [includeArticles, setIncludeArticles] = useState(false);
  const [prospectLinkedInUrl, setProspectLinkedInUrl] = useState("");
  const [linkedInPostsCount, setLinkedInPostsCount] = useState(10);

  /* 📈  Analytics / redirect toggles ---- */
  const [redirectOpen, setRedirectOpen] = useState(false);
  const { redirectState, handleToggleRedirect } = useAnalyticsRedirects();

  /* ⚙️  Prospect / misc branding inputs ----------------------------------- */
  const [prospectName, setProspectName] = useState("");
  const [includeBranding, setIncludeBranding] = useState(true);
  const [updateThemeColors, setUpdateThemeColors] = useState(true);

  /* 🏗️  Environment setup toggles ---------------------------------------- */
  const [chatEnabled, setChatEnabled] = useState(false);
  const [microsoftEnabled, setMicrosoftEnabled] = useState(false);
  const [journeysEnabled, setJourneysEnabled] = useState(false);
  const [loggedInUserId, setLoggedInUserId] = useState(null);
  const [campaignsEnabled, setCampaignsEnabled] = useState(false);
  const [customWidgetsChecked, setCustomWidgetsChecked] = useState(false);
  const [mergeIntegrationsChecked, setMergeIntegrationsChecked] =
    useState(false);
  const [sbEmail, setSbEmail] = useState(""); // Kept for other potential uses
  const [sbPassword, setSbPassword] = useState(""); // Kept for other potential uses
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
  const [userManagementView, setUserManagementView] = useState("selection");
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageType, setImageType] = useState("none");

  /* 🔄  UI / async status -------------------------------------------------- */
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState("");

  /* 🌐  Browser-specific --------------------------------------------------- */
  const isStaffbaseTab = useStaffbaseTab(); // are we viewing a Staffbase page?

  /* 🌐  Progress tracking -------------------------------------------------- */
  const [automationRunning, setAutomationRunning] = useState(false);
  const [progressData, setProgressData] = useState({
    tasksCompleted: 0,
    totalTasks: 0,
    currentUser: null,
    currentStatus: null,
  });
  
  // Get the slug from the useOption state if it exists.
  const selectedSlug = useOption?.slug ?? null;

  // When profile fields are loaded, set the default for the Merge dropdown
  useEffect(() => {
    if (allProfileFields.length > 0 && !mergeField) {
      const defaultField = allProfileFields.includes("publicEmailAddress")
        ? "publicEmailAddress"
        : allProfileFields[0];
      setMergeField(defaultField);
    }
  }, [allProfileFields, mergeField]);

  // --------------------------------------------------
  //   Message Listeners and other simple effects
  // --------------------------------------------------
  useEffect(() => {
    const messageListener = (message) => {
      if (message.type === "automationProgress") {
        setProgressData((prev) => ({
          tasksCompleted: message.payload.tasksCompleted,
          totalTasks: message.payload.totalTasks,
          currentUser: message.payload.user || prev.currentUser,
          currentStatus: message.payload.status || prev.currentStatus,
        }));
      } else if (message.type === "automationComplete") {
        setAutomationRunning(false);
        setResponse("✅ Automation has finished!");
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, []);

  // Fetch the full profile for a single selected user.
  useEffect(() => {
    if (!selectedUserId || !apiToken) {
      setUserProfile(null);
      return;
    }
    const fetchUserProfile = async () => {
      setIsLoading(true);
      setResponse(`Fetching profile for user ${selectedUserId}...`);
      try {
        const response = await fetch(
          `https://app.staffbase.com/api/users/${selectedUserId}`,
          {
            headers: { Authorization: `Basic ${apiToken}` },
          }
        );
        if (!response.ok)
          throw new Error(`Failed to fetch profile: ${response.statusText}`);

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
      setResponse(
        `❌ Could not find a primary email for user ID ${selectedUserId}.`
      );
      return;
    }

    setResponse(`Attempting to log in as ${identifier}...`);
    setIsLoading(true);

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      const scriptToInject = (userIdentifier) => {
        const loginAndReload = async () => {
          try {
            console.log(`Inject: Attempting login for ${userIdentifier}`);
            const loginResponse = await fetch("/api/sessions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                identifier: userIdentifier,
                secret: "Clone12345",
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
            alert(
              `Successfully logged in as ${userIdentifier}. The page will now reload.`
            );
            window.location.reload();
          } catch (error) {
            console.error("Inject: Login script failed.", error);
            alert(
              `Failed to log in as ${userIdentifier}. See console for details. Error: ${error.message}`
            );
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

    /**
   * Handles all profile updates: text fields, images, or both together.
   */
  const handleProfileUpdate = async () => {
    if (!selectedUserId || !adminUserId) {
      setResponse("⚠️ Please select a user. Admin ID is also required.");
      return;
    }
    if (!fieldToUpdate && (!selectedFile || imageType === "none")) {
      setResponse(
        "⚠️ Nothing to update. Select a field or choose an image and type (Avatar/Banner)."
      );
      return;
    }
    setIsLoading(true);
    setResponse("Processing update...");

    try {
      let profileChanges = {};

      if (selectedFile && imageType !== "none") {
        setResponse("Uploading image...");
        const mediaMeta = JSON.stringify({
          type: "image",
          fileName: selectedFile.name,
        });
        const uploadResponse = await fetch(
          "https://app.staffbase.com/api/media",
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${apiToken}`,
              "Content-Type": selectedFile.type,
              "staffbase-media-meta": mediaMeta,
            },
            body: selectedFile,
          }
        );

        if (!uploadResponse.ok)
          throw new Error(`Media upload failed: ${uploadResponse.statusText}`);

        const { id: rawFileId } = await uploadResponse.json();
        if (!rawFileId) throw new Error("Media API did not return an ID.");

        const fileIdWithExt = `${rawFileId}.jpg`;
        profileChanges[imageType] = buildImagePayload(fileIdWithExt);
      }

      if (fieldToUpdate && newValue) {
        profileChanges[fieldToUpdate] = newValue;
      }

      setResponse("Updating user profile...");
      const finalBody = { profile: profileChanges };

      const updateUserResponse = await fetch(
        `https://app.staffbase.com/api/users/${selectedUserId}`,
        {
          method: "PUT",
          mode: "cors",
          credentials: "omit",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${apiToken}`,
            USERID: adminUserId,
          },
          body: JSON.stringify(finalBody),
        }
      );

      if (!updateUserResponse.ok) {
        const errorData = await updateUserResponse.json();
        throw new Error(
          `User update failed: ${
            errorData.message || updateUserResponse.statusText
          }`
        );
      }
      const updatedUserData = await updateUserResponse.json();
      setResponse(`✅ Profile updated successfully!`);
      setUserProfile(updatedUserData);

      setFieldToUpdate("");
      setNewValue("");
      setSelectedFile(null);
      setImageType("none");
    } catch (err) {
      setResponse(`❌ Update Failed: ${err.message}`);
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
    setProgressData({
      tasksCompleted: 0,
      totalTasks: 0,
      currentUser: null,
      currentStatus: "Initializing...",
    });
    setAutomationRunning(true);
    setIsLoading(true);

    const selectedUsers = usersList.filter((user) =>
      selectedUserIds.includes(user.id)
    );
    if (selectedUsers.length === 0) {
      setResponse(
        "❌ Error: Could not find user data for the current selection."
      );
      setIsLoading(false);
      return;
    }

    try {
      const [currentTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const origin = new URL(currentTab.url).origin;
      const rootUrl = `${origin}/`;
      const newTab = await chrome.tabs.create({ url: rootUrl, active: true });
      await chrome.tabs.update(newTab.id, { autoDiscardable: false });

      const listener = (tabId, changeInfo, tab) => {
        if (tabId === newTab.id && changeInfo.status === "complete") {
          chrome.tabs.onUpdated.removeListener(listener);
          setResponse(`Tab ready. Injecting main automation script...`);
          chrome.scripting.executeScript({
            target: { tabId: newTab.id },
            func: automationScript,
            args: [selectedUsers, apiToken, adminUserId, automationOptions],
          });
          setResponse(
            `✅ Script injected. The new tab will now run the automation.`
          );
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
    setIsLoading(true);
    setResponse("Deleting branding...");
    try {
      // Fetch current CSS to clean it for the legacy endpoint
      const css = await fetchCurrentCSS(apiToken);
      const cleanedCss = css ? css.replace(blockRegex, "").trim() : "";

      if (resetThemeOnDelete) {
        // If resetting, perform two actions in parallel:
        // 1. Reset the new Theme API by removing the desktop theme
        const themeResetPromise = resetDesktopTheme(apiToken);
        
        // 2. Update the old Branch Config API with cleaned CSS
        const legacyCssUpdatePromise = fetch(`https://app.staffbase.com/api/branches/${branchId}/config`, {
            method: "POST",
            headers: {
              Authorization: `Basic ${apiToken.trim()}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ customCSS: cleanedCss }),
        });

        await Promise.all([themeResetPromise, legacyCssUpdatePromise]);
        setResponse("✅ Replify branding deleted and app/intranet theme was reset.");

      } else {
        // If not resetting, just remove the CSS block from both systems
        if (!blockRegex.test(css)) {
          setResponse("Nothing to delete – no Replify CSS block found.");
          return;
        }
        await postUpdatedCSS(apiToken, branchId, cleanedCss);
        setResponse("✅ Replify CSS block deleted.");
      }

      setBrandingExists(false);
    } catch (err) {
      setResponse(`❌ ${err.message}`);
    } finally {
      setIsLoading(false);
      setResetThemeOnDelete(false); // Reset checkbox after action
    }
  }


  const pullCurrentBranding = async () => {
    try {
      const css = await fetchCurrentCSS(apiToken);
      const brandingData = parseBrandingFromCSS(css, blockRegex);
      if (brandingData.prospectName) setProspectName(brandingData.prospectName);
      setPrimaryColor(brandingData.primaryColor || primaryColor);
      setTextColor(brandingData.textColor || textColor);
      setBackgroundColor(brandingData.backgroundColor || backgroundColor);
      setFloatingNavBgColor(brandingData.floatingNavBgColor || floatingNavBgColor);
      setFloatingNavTextColor(brandingData.floatingNavTextColor || floatingNavTextColor);
      setBgURL(brandingData.bgUrl || bgUrl);
      setLogoUrl(brandingData.logoUrl || logoUrl);
      setLogoPadHeight(brandingData.logoPadHeight || logoPadHeight);
      setLogoPadWidth(brandingData.logoPadWidth || logoPadWidth);
      setBgVertical(brandingData.bgVertical || bgVertical);
      setResponse("✅ Pulled current branding into the form.");
    } catch (err) {
      setResponse(`❌ ${err.message}`);
    }
  };


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
        args: ["replify-preview-styles"],
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
      const firstSpace = (await spacesRes.json())?.data?.[0];
      const slug = firstSpace?.accessors?.branch?.slug || "unknown-slug";
      const branchId =
        firstSpace?.accessors?.branch?.id || firstSpace?.branchID;
      const hasNewUI =
        !!firstSpace?.accessors?.branch?.config?.flags?.includes(
          "wow_desktop_menu"
        );
      const stored = loadTokensFromStorage();
      if (!stored.find((t) => t.slug === slug)) {
        stored.push({ slug, token: apiToken, branchId, hasNewUI });
        saveTokensToStorage(stored);
      }
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
    const defaultEmail = `admin+${slug}@staffbase.com`;
    setSbEmail(defaultEmail);
    setResponse(`Default email set to ${defaultEmail}. Fetching user ID...`);
    try {
      const meResponse = await fetch("https://app.staffbase.com/api/users/me", {
        headers: { Authorization: `Basic ${token}` },
      });
      if (!meResponse.ok) throw new Error("Failed to fetch current user ID");
      const meData = await meResponse.json();
      setLoggedInUserId(meData.id);
      setResponse(
        (prev) => prev + `\n✅ User ID for Journeys is ${meData.id}.`
      );
    } catch (error) {
      setResponse(
        (prev) =>
          prev +
          `\n⚠️ Could not fetch user ID for Journeys. Error: ${error.message}`
      );
    }
  };

  /**
 * Fetches the branchId for a given token from the /api/spaces endpoint
 * and updates the state and localStorage.
 */
const recoverBranchId = async (tokenToRecover, slugToUpdate) => {
  console.log("Attempting to recover branch ID for slug:", slugToUpdate);
  try {
    const spacesRes = await fetch("https://app.staffbase.com/api/spaces", {
      headers: { Authorization: `Basic ${tokenToRecover}` },
    });
    if (!spacesRes.ok) throw new Error(`API returned status ${spacesRes.status}`);

    const firstSpace = (await spacesRes.json())?.data?.[0];
    const recoveredId = firstSpace?.accessors?.branch?.id || firstSpace?.branchID;

    if (!recoveredId) throw new Error("Could not find branch ID in the spaces API response.");

    // Update state and localStorage with the recovered ID
    setSavedTokens((currentTokens) => {
      const updatedTokens = currentTokens.map((t) =>
        t.slug === slugToUpdate ? { ...t, branchId: recoveredId } : t
      );
      // Persist the fix so we don't have to do this again
      saveTokensToStorage(updatedTokens);
      return updatedTokens;
    });

    return recoveredId;
  } catch (err) {
    // Throw the user-friendly error message you requested
    throw new Error(
      "Error fetching branch ID. Remove the environment and try again with an admin API key. Apologies for the error."
    );
  }
};


/** “Set Up” or “Brand” button inside <UseEnvironmentOptions>. */
const handleUseOptionClick = async ({ mode, token, branchId: initialBranchId }) => {
  // Use a try/catch block to handle potential recovery errors
  try {
    let currentBranchId = initialBranchId;
    
    // If branchId is missing (null) or the old invalid string
    if (!currentBranchId || currentBranchId === "unknown-branch-id") {
      setIsLoading(true);
      setResponse("Legacy environment detected. Attempting to recover branch ID...");
      
      // Call the recovery function
      currentBranchId = await recoverBranchId(token, useOption.slug);
      setResponse(`✅ Branch ID recovered successfully!`);
      setIsLoading(false);
    }
    
    // --- The rest of the function proceeds as normal, using currentBranchId ---
    setApiToken(token);
    setBranchId(currentBranchId);
    setIsAuthenticated(true);
    setUseOption({ type: mode, slug: useOption.slug, token, branchId: currentBranchId });
    setUserManagementView("selection");

    if (mode === "new") {
      prepareNewEnvironmentSetup(token, useOption.slug);
      fetchAllProfileFields(token, currentBranchId); // Now uses the correct ID
    } else if (mode === "users") {
      fetchUsers(token);
      fetchAllProfileFields(token, currentBranchId); // Now uses the correct ID
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
  } catch (err) {
    setResponse(`❌ ${err.message}`);
    setIsLoading(false);
  }
};

    /** Delete button next to a saved token. */

  const handleDeleteToken = (slug) => {
    const filtered = savedTokens.filter((t) => t.slug !== slug);
    setSavedTokens(filtered);
    saveTokensToStorage(
      filtered.map(({ slug, fullToken }) => ({ slug, token: fullToken }))
    );
    setShowFullToken(null);
  };

  const handleShowFullToken = (slug) =>
    setShowFullToken((cur) => (cur === slug ? null : slug));

    /* ──────────────────────────────────────────────────────────────
   BRAND / NEWS CREATION
   ────────────────────────────────────────────────────────────── */



    /**
   * Create or update demo resources:
   * 1. Inject / replace Replify CSS block and optionally update theme colors.
   * 2. Trigger sb-news LinkedIn scraper (optional).
   */

  async function handleCreateDemo() {
    try {
      /* ---------- 1️⃣  CSS block & Theme Colors -------------------------- */
      if (includeBranding) {
        setResponse("Processing branding request…");

        const existingCss = await fetchCurrentCSS(apiToken);
        const trimmedCss = existingCss ? existingCss.trim() : "";

        const newCssBody = buildPreviewCss({
          primary: primaryColor,
          text: textColor,
          background: backgroundColor,
          floatingNavBg: floatingNavBgColor,
          floatingNavText: floatingNavTextColor,
          bg: bgUrl,
          logo: logoUrl,
          padW: logoPadWidth,
          padH: logoPadHeight,
          bgVert: bgVertical,
          prospectName,
        });

        const newBlock = `/* ⇢ REPLIFY START ⇠ */\n${newCssBody}\n/* ⇢ REPLIFY END ⇠ */`;
        const finalCss = blockRegex.test(trimmedCss)
          ? trimmedCss.replace(blockRegex, newBlock)
          : `${trimmedCss}\n\n${newBlock}`;

        const colorConfig = updateThemeColors
          ? {
              primary: primaryColor,
              text: textColor,
              background: backgroundColor,
              floatingNavText: floatingNavTextColor,
              floatingNavBg: floatingNavBgColor,
            }
          : null;

        await postUpdatedCSS(apiToken, branchId, finalCss, colorConfig);

        setBrandingExists(true);
        const successMessage = updateThemeColors
          ? "✅ Demo CSS and theme colors updated!"
          : "✅ Demo CSS updated!";
        setResponse(successMessage);
      }

      /* ---------- 2️⃣ LinkedIn articles ---------------------------------- */

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
        } catch {}
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
          totalPosts: linkedInPostsCount || 20,
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
        floatingNavBg: floatingNavBgColor,
        floatingNavText: floatingNavTextColor,
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
      if (!response.ok)
        throw new Error(`Failed to fetch users: ${response.statusText}`);
      const data = await response.json();
      const allUsers = data.data || [];
      const adminUser = allUsers.find(
        (user) => user.branchRole === "WeBranchAdminRole"
      );
      if (adminUser) {
        setAdminUserId(adminUser.id);
      } else {
        setAdminUserId(null);
        setResponse(
          (prev) => prev + "\n⚠️ No admin user found. Updates will be disabled."
        );
      }
      const cleanedUsers = allUsers.map((user) => {
        const cleanedUsername =
          typeof user.username === "string"
            ? user.username.replace(/^\(|\)$/g, "")
            : user.username;
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

  const fetchAllProfileFields = async (token, branchId) => {
    const fieldsToExclude = ["avatar", "profileHeaderImage", "apitoken"];
    try {
      console.log(localStorage.getItem("staffbaseTokens"));
      console.log("Using token:", token);
      console.log("Slug:", useOption?.slug);  
      const response = await fetch(
        `https://app.staffbase.com/api/branches/${branchId}/profilefields`,
        {
          headers: { Authorization: `Basic ${token}` },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch profile fields");
      const data = await response.json();
      const fields = Object.values(data.schema)
        .filter((field) => !field.readOnly)
        .map((field) => field.slug)
        .filter((slug) => !fieldsToExclude.includes(slug));
      setAllProfileFields(fields);
    } catch (err) {
      console.error(err.message);
      setResponse((prev) => prev + "\n⚠️ Could not fetch all profile fields.");
    }
  };

  /* ──────────────────────────────────────────────────────────────
   ENVIRONMENT CREATION (NEW IMPLEMENTATION)
   ────────────────────────────────────────────────────────────── */

  /**
   * Helper to get the CSRF token from the active tab.
   * This is required for POST/PUT requests to the Staffbase API.
   */
  const getCsrfToken = async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      const injectionResult = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // This function is executed in the page's context
          const el = document.querySelector('meta[name="csrf-token"]');
          return el ? el.content : null;
        },
      });

      const token = injectionResult?.[0]?.result;
      if (!token) {
        throw new Error(
          "CSRF token meta tag not found. Are you on a Staffbase admin page?"
        );
      }
      return token;
    } catch (e) {
      throw new Error(`Failed to get CSRF token: ${e.message}`);
    }
  };

   async function handleSetupNewEnv() {
    setResponse("Processing setup request...");
    setIsLoading(true);

    // Keep track of successes to build a final report
    const finalReport = {
      installations: null,
      customWidgets: null,
      mergeIntegration: null,
      emailTemplates: null,
    };

    const isInstallationSetupNeeded =
      chatEnabled ||
      microsoftEnabled ||
      (journeysEnabled && loggedInUserId) ||
      launchpadSel.length > 0 ||
      quickLinksEnabled;

    try {
      // 1. Chino's Endpoint
      if (isInstallationSetupNeeded) {
        setResponse("Setting up environment features...");
        const body = {
          chat: chatEnabled, microsoft: microsoftEnabled, campaigns: campaignsEnabled,
        };
        if (launchpadSel.length) body.launchpad = launchpadSel;
        if (journeysEnabled && loggedInUserId) body.journeys = { user: loggedInUserId, desired: ["all"] };
        if (quickLinksEnabled) {
          body.mobileQuickLinks = Object.fromEntries(
            mobileQuickLinks
              .filter((l) => l.name.trim())
              .map((l) => [l.name, { title: l.title, position: l.position }])
          );
        }
        
        const envResponse = await fetch("https://sb-news-generator.uc.r.appspot.com/api/v1/installations", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiToken}` },
          body: JSON.stringify(body),
        });
        
        finalReport.installations = envResponse.ok;
        if (!envResponse.ok) throw new Error(`Installations endpoint failed: ${envResponse.statusText}`);
      }

      // 2. NEW SETUP (DIRECT API CALLS FROM EXTENSION)
      const isNewFeatureSetupNeeded = customWidgetsChecked || mergeIntegrationsChecked;
      if (isNewFeatureSetupNeeded) {
        if (!isStaffbaseTab) throw new Error("Custom widgets/integrations require an active Staffbase tab.");

        setResponse((prev) => prev + "\nFetching CSRF token...");
        const discoverResponse = await fetch('https://app.staffbase.com/auth/discover', {
          method: 'GET',
          headers: { 'Accept': 'application/vnd.staffbase.auth.discovery.v2+json', 'Content-Type': 'application/json' }
        });
        if (!discoverResponse.ok) throw new Error(`CSRF Discovery failed: ${discoverResponse.status}`);
        const { csrfToken } = await discoverResponse.json();
        if (!csrfToken) throw new Error("Could not get CSRF token from discovery endpoint.");
        
        const staffbaseHeaders = {
          "Content-Type": "application/json",
          Authorization: `Basic ${apiToken}`,
          "x-csrf-token": csrfToken,
        };

        // 2a. Custom Widgets
        if (customWidgetsChecked) {
          setResponse((prev) => prev + "\nInstalling Custom Widgets...");
          const widgetPayloads = [
            { url: "https://eirastaffbase.github.io/weather-time/dist/eira.weather-time.js", elements: ["weather-time"], attributes: ["city", "allowcityoverride", "mobileview", "usenewimages"]},
            { url: "https://eirastaffbase.github.io/job-postings/dist/staffbase.job-postings.js", elements: ["job-postings"], attributes: ["postingsjson", "buttontext", "buttoncolor", "lefticon", "righticon"]},
            { url: "https://eirastaffbase.github.io/stock-ticker/dist/staffbase.stock-ticker.js", elements: ["stock-ticker"], attributes: ["symbol", "weeks", "logo", "stockgraphcolor"]},
          ];
          const results = await Promise.all(widgetPayloads.map(payload => fetch("https://app.staffbase.com/api/branch/widgets", { method: "POST", headers: staffbaseHeaders, body: JSON.stringify(payload) })));
          finalReport.customWidgets = results.every(res => res.ok);
          if (!finalReport.customWidgets) throw new Error("One or more custom widgets failed to install.");
        }

        // 2b. Merge/Workday Integration
        if (mergeIntegrationsChecked) {
          setResponse((prev) => prev + "\n🚀 Starting Workday Integration...");
          const mergeHeaders = { "Content-Type": "application/json;charset=UTF-8" };
          let linkToken, accountId;

          // Step 1: Initialize
          setResponse((prev) => prev + "\n1/8: Initializing with Staffbase...");
          const initRes = await fetch("https://app.staffbase.com/api/merge-dev/integrations/workday", { method: "POST", headers: staffbaseHeaders, body: JSON.stringify({ employeeIdentityMapping: { profileField: mergeField, remoteProperty: "work_email" }, name: "" }) });
          if (!initRes.ok) throw new Error(`Merge Step 1 (SB Init) failed: ${initRes.status}`);
          ({ linkToken, accountId } = await initRes.json());
          if (!linkToken) throw new Error("Did not receive linkToken from Step 1.");

          // Step 2: Eligibility Check
          setResponse((prev) => prev + "\n2/8: Checking eligibility with Merge...");
          const eligCheckRes = await fetch("https://api.merge.dev/api/integrations/link/eligibility-check", { method: "POST", headers: mergeHeaders, body: JSON.stringify({ link_token: linkToken }) });
          if (!eligCheckRes.ok) throw new Error(`Merge Step 2 (Eligibility Check) failed: ${eligCheckRes.status}`);

          // Step 3: Next Page (Initial Step)
          setResponse((prev) => prev + "\n3/8: Fetching initial linking flow...");
          const initialNextPageRes = await fetch("https://api.merge.dev/api/integrations/linking-flow/next-page", { method: "POST", headers: mergeHeaders, body: JSON.stringify({ link_token: linkToken, current_page: "INITIAL_STEP", form_data: { file_picker_config_sent: false } }) });
          if (!initialNextPageRes.ok) throw new Error(`Merge Step 3 (Initial Next Page) failed: ${initialNextPageRes.status}`);
          
          // Step 4: Next Page (Auth Choice)
          setResponse((prev) => prev + "\n4/8: Selecting auth choice...");
          const authChoiceData = await initialNextPageRes.json();
          const authChoiceRes = await fetch("https://api.merge.dev/api/integrations/linking-flow/next-page", { method: "POST", headers: mergeHeaders, body: JSON.stringify({ link_token: linkToken, current_page: "AUTH_CHOICE", form_data: { ...authChoiceData.linking_flow_payload, selected_step_path_id: "b5f16891-9bcf-49ad-a107-28a32e001933" } }) });
          if (!authChoiceRes.ok) throw new Error(`Merge Step 4 (Auth Choice) failed: ${authChoiceRes.status}`);

          // Step 5: Send Credentials
          setResponse((prev) => prev + "\n5/8: Submitting credentials to Merge...");
          const credentialsFormData = {
            customDomain: process.env.REACT_APP_WORKDAY_CUSTOM_DOMAIN, username: process.env.REACT_APP_WORKDAY_USERNAME, password: process.env.REACT_APP_WORKDAY_PASSWORD,
            oauthClientID: process.env.REACT_APP_WORKDAY_OAUTH_CLIENT_ID, oauthClientSecret: process.env.REACT_APP_WORKDAY_OAUTH_CLIENT_SECRET, oauthRefreshToken: process.env.REACT_APP_WORKDAY_OAUTH_REFRESH_TOKEN,
            overrideOAuthTokenUrl: process.env.REACT_APP_WORKDAY_OAUTH_TOKEN_URL, baseURL: process.env.REACT_APP_WORKDAY_BASE_URL,
          };
          const submitCredsRes = await fetch("https://api.merge.dev/api/integrations/linking-flow/next-page", {
            method: "POST", headers: mergeHeaders,
            body: JSON.stringify({ link_token: linkToken, current_page: "INTEGRATION_SETUP", form_data: { linked_account_form_data: credentialsFormData, selected_step_path_id: "b5f16891-9bcf-49ad-a107-28a32e001933" } }),
          });
          if (!submitCredsRes.ok) throw new Error(`Merge Step 5 (Submit Credentials) failed: ${submitCredsRes.status}`);
          const { linking_flow_payload } = await submitCredsRes.json();
          const { public_token } = linking_flow_payload?.linked_account;
          if (!public_token) throw new Error("Did not receive public_token from Step 5.");
          
          // Step 6: Confirm Connection
          setResponse((prev) => prev + "\n6/8: Confirming connection with Staffbase...");
          const confirmRes = await fetch(`https://app.staffbase.com/api/merge-dev/accounts/${accountId}/confirm-connection`, { method: "POST", headers: staffbaseHeaders, body: JSON.stringify({ publicToken: public_token }) });
          if (!confirmRes.ok) throw new Error(`Merge Step 6 (Confirm Connection) failed: ${confirmRes.status}`);

          // Step 7: Kick off Sync
          setResponse((prev) => prev + "\n7/8: Kicking off initial sync...");
          const syncRes = await fetch("https://api.merge.dev/api/integrations/linking-flow/end-linking-flow-and-kickoff-initial-sync", { method: "POST", headers: mergeHeaders, body: JSON.stringify({ link_token: linkToken }) });
          if (!syncRes.ok) throw new Error(`Merge Step 7 (Kickoff Sync) failed: ${syncRes.status}`);

          finalReport.mergeIntegration = true;
        }
      }

      // 3. Email Templates (Replify Backend)
      if (setupEmailChecked) {
        setResponse((prev) => prev + "\nSetting up email templates...");
        const emailResponse = await fetch("https://sb-news-generator.uc.r.appspot.com/api/v1/generate/email-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiToken}` },
          body: JSON.stringify({ domain: "app.staffbase.com" }),
        });
        finalReport.emailTemplates = emailResponse.ok;
        if (!emailResponse.ok) throw new Error(`Email template setup failed: ${emailResponse.statusText}`);
      }

      // Build final success message
      const successMessages = Object.entries(finalReport)
        .filter(([, success]) => success !== null)
        .map(([key, success]) => `${key}: ${success ? '✅' : '❌'}`);
      setResponse(`Setup Complete:\n${successMessages.join('\n')}`);

    } catch (err) {
      // Build final error message
      const errorMessages = Object.entries(finalReport)
        .filter(([, success]) => success !== null)
        .map(([key, success]) => `${key}: ${success ? '✅' : '❌'}`);
      setResponse(`Setup failed:\n${errorMessages.join('\n')}\n\nError: ${err.message}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  /* ──────────────────────────────────────────────────────────────
     UI UTILS & RENDER
  ────────────────────────────────────────────────────────────── */



  const renderBreadcrumbs = () => (
    <div style={{ marginBottom: 20 }}>
      <button style={{ background: "none", border: "none", color: colors.primary, cursor: "pointer", padding: 0, fontSize: 14 }}
        onClick={() => {
          setUseOption({ type: null });
          setUserManagementView("selection");
        }}
      >
        ← Back to Environments
      </button>
    </div>
  );

  const renderUserMgmtBreadcrumbs = () => (
    <div style={{ marginBottom: 20 }}>
      <button style={{ background: "none", border: "none", color: colors.primary, cursor: "pointer", padding: 0, fontSize: 14 }}
        onClick={() => setUserManagementView("selection")}
      >
        ← Back to User Options
      </button>
    </div>
  );

  const handleQuickLinkChange = (idx, field, val) => {
    setMobileQuickLinks((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      copy.forEach((l, i) => (l.position = i));
      return copy;
    });
  };

  const handleQuickLinkSwap = (aIdx, bIdx) => {
    setMobileQuickLinks((prev) => {
      const copy = [...prev];
      [copy[aIdx].position, copy[bIdx].position] = [copy[bIdx].position, copy[aIdx].position];
      return copy;
    });
  };

  const handleQuickLinkDelete = (idx) =>
    setMobileQuickLinks((prev) =>
      prev.filter((_, i) => i !== idx).map((l, i) => ({ ...l, position: i }))
    );

  const handleQuickLinkAdd = () =>
    setMobileQuickLinks((prev) => [...prev, { name: "", title: "", position: prev.length, enabled: true }]);

  return (
    <div style={containerStyle}>
      <img
        src="https://eirastaffbase.github.io/replify/replifyLogo.svg"
        alt="Replify Logo"
        style={logoStyle}
      />
      <FeedbackBanner />

      <SavedEnvironments
        savedTokens={savedTokens}
        showFull={showFullToken}
        selectedSlug={selectedSlug}
        onUse={({ slug, token, branchId }) => setUseOption({ type: "select", slug, token, branchId })}
        onCancel={() => setUseOption(null)}
        onToggle={handleShowFullToken}
        onDelete={handleDeleteToken}
        onAdd={() => setShowApiKeyInput((prev) => !prev)}
      />

      {!selectedSlug && (
        <RedirectAnalyticsForm
          open={redirectOpen}
          onToggleOpen={() => setRedirectOpen((o) => !o)}
          state={redirectState}
          onToggleType={handleToggleRedirect}
        />
      )}

      {useOption?.type && renderBreadcrumbs()}

      {!useOption?.type && !isAuthenticated && showApiKeyInput && (
        <ApiKeyForm
          value={apiToken}
          onChange={(e) => setApiToken(e.target.value)}
          onAuth={handleAuth}
        />
      )}

      {useOption?.type === "select" && (
        <UseEnvironmentOptions
          slug={useOption.slug}
          onChoose={(mode) => handleUseOptionClick({ mode, token: useOption.token, branchId: useOption.branchId })}
        />
      )}

      {isAuthenticated && useOption?.type === "users" && (
        <>
          {userManagementView !== "selection" && renderUserMgmtBreadcrumbs()}

          {userManagementView === "selection" && (
            <div style={{ marginTop: "10px" }}>
              <button style={brandingButtonStyle} onClick={() => setUserManagementView("automation")}>
                Automation
              </button>
              <p style={subDescriptionStyle}>Populate the platform with comments, reactions, chats, and survey responses.</p>
              <button style={{ ...brandingButtonStyle, marginTop: "20px" }} onClick={() => setUserManagementView("profile")}>
                Manage Users
              </button>
              <p style={subDescriptionStyle}>Update user profiles, change avatars/banners, or log in as a specific user.</p>
            </div>
          )}

{userManagementView === "automation" && (
            <AutomationForm
              users={usersList}
              isStaffbaseTab={isStaffbaseTab}
              onRun={handleRunAutomation}
              automationRunning={automationRunning}
              progressData={progressData}
            />
          )}
          {userManagementView === "profile" && (
            <UpdateUserForm
              users={usersList}
              selectedUserId={selectedUserId}
              onUserSelect={setSelectedUserId}
              userProfile={userProfile}
              isLoading={isLoading}
              onLoginAsUser={handleLoginAsUser}
              fieldToUpdate={fieldToUpdate}
              onFieldChange={setFieldToUpdate}
              newValue={newValue}
              onNewValueChange={setNewValue}
              allProfileFields={allProfileFields}
              selectedFile={selectedFile}
              onFileChange={setSelectedFile}
              imageType={imageType}
              onImageTypeChange={setImageType}
              onProfileUpdate={handleProfileUpdate}
            />
          )}
        </>
      )}
      {/* ─────────── BRAND EXISTING ENV ─────────── */}
      {isAuthenticated && useOption?.type === "existing" && (
        <BrandingForm
          /* flags & handlers */
          isStaffbaseTab={isStaffbaseTab}
          updateThemeColors={updateThemeColors}
          setUpdateThemeColors={setUpdateThemeColors}
          includeBranding={includeBranding}
          setIncludeBranding={setIncludeBranding}
          includeArticles={includeArticles}
          setIncludeArticles={setIncludeArticles}
          brandingExists={brandingExists}
          resetThemeOnDelete={resetThemeOnDelete}
          setResetThemeOnDelete={setResetThemeOnDelete}
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
          floatingNavBgColor={floatingNavBgColor}
          setFloatingNavBgColor={setFloatingNavBgColor}
          floatingNavTextColor={floatingNavTextColor}
          setFloatingNavTextColor={setFloatingNavTextColor}
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
          mergeField={mergeField}
          setMergeField={setMergeField}
          allProfileFields={allProfileFields}
          /* submit */
          onSetup={handleSetupNewEnv}
        />
      )}

      {/* ─────────── SERVER RESPONSES ─────────── */}
      {response && <pre style={responseStyle}>{response}</pre>}
    </div>
  );
}

export default App;