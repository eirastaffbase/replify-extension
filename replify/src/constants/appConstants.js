// constants/appConstants.js
// This file contains constants used throughout the application.

export const LAUNCHPAD_DICT = [
    "sharepoint",
    "teams",
    "outlook",
    "word",
    "powerpoint",
    "excel",
    "workday",
    "confluence",
    "salesforce",
    "slack",
    "zoom",
    "ukg",
    "servicenow",
    "drive",
    "docs",
    "slides",
    "sheets",
    "travelperk",
    "jira",
  ];

  export const blockRegex = /\/\*\s*⇢\s*REPLIFY START[\s\S]*?REPLIFY END\s*⇠\s*\*\//g;

  export const ANALYTICS_TYPES = [
    { id: "news",       label: "News"       },
    { id: "hashtags",   label: "Hashtags"   },
    { id: "campaigns",  label: "Campaigns"  },
    { id: "posts",      label: "Posts"      },
    { id: "email",      label: "Email"      },
  ];