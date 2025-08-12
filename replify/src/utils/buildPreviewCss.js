/* utils/buildPreviewCss.js
    ------------------------------------------------------------
    Generate a **single giant CSS string** that can be injected
    into a Staffbase page for live-preview or permanent branding.
    ------------------------------------------------------------
    @param {Object} o  “options” object
      {
        primary        : "#RRGGBB",     // main brand colour
        text           : "#RRGGBB",     // text colour for nav / icons
        background     : "#RRGGBB",     // neutral card-background colour
        floatingNavBg  : "#RRGGBB",     // floating nav background colour
        floatingNavText: "#RRGGBB",     // floating nav text colour
        bg             : "url|string",  // hero/cover photo (optional)
        logo           : "url|string",  // custom logo        (optional)
        padW, padH     : Number (px)    // logo padding
        bgVert         : Number (0-100) // bg vertical %
        logoH          : Number (px)    // logo height (rarely used)
      }
    @returns {String} – fully-formed CSS ready for <style> injection
*/

export default function buildPreviewCss(o) {
  /* ════════════════════════════════════════════
     1.  Helper functions
     ════════════════════════════════════════════ */
  const hexToRgba = (hex, alpha) =>
    `rgba(${parseInt(hex.slice(1, 3), 16)},` +
    `${parseInt(hex.slice(3, 5), 16)},` +
    `${parseInt(hex.slice(5, 7), 16)},${alpha})`;

  const isDarkColor = (hex) => {
    if (!hex || hex.length < 7) return false; // Basic validation
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    /* ITU-R BT.601 luma formula */
    return 0.299 * r + 0.587 * g + 0.114 * b < 128;
  };

  const hexToHsl = (hex) => {
    if (!hex || hex.length < 7) return { h: 0, s: 0, l: 0 };
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  };

  /* --------------------------------------------------
    Persist the prospect name so we can read it later
    -------------------------------------------------- */
  const prospectComment = o.prospectName
    ? `/* prospect:${o.prospectName.trim()} */\n`
    : "";

  /* ════════════════════════════════════════════
     2.  Derived colours
     ════════════════════════════════════════════ */
  const primaryInverse = isDarkColor(o.primary) ? "#fff" : "rgba(0,0,0,.7)";
  const widgetTextColor = isDarkColor(o.background) ? "#fff" : "#000";
  const headerBgTranslucent = hexToRgba(o.primary, 0.7);
  const textOpposite = isDarkColor(o.text) ? "#fff" : "#000";
  const metaTextColor = isDarkColor(o.background)
    ? "rgba(255,255,255,0.7)"
    : "rgba(0,0,0,0.7)";

  // A "safe" color for surveys/buttons that prioritizes darkness, then saturation.
  const getSurveyColor = () => {
    const primaryIsDark = isDarkColor(o.primary);
    const textIsDark = isDarkColor(o.text);

    if (primaryIsDark) return o.primary;
    if (textIsDark) return o.text;

    // If both are light, compare saturation and pick the higher one.
    const primaryHsl = hexToHsl(o.primary);
    const textHsl = hexToHsl(o.text);
    return (primaryHsl.s >= textHsl.s) ? o.primary : o.text;
  };

  const surveyColor = getSurveyColor();
  const surveyColorInverse = isDarkColor(surveyColor) ? '#fff' : 'rgba(0,0,0,0.7)';


  /* ════════════════════════════════════════════
     3.  Base CSS (root tokens, header, widgets…)
     ════════════════════════════════════════════ */
  let css = `
      ${prospectComment}
      /* ================= root tokens ================= */
      :root{
        --color-client-primary : ${o.primary} !important;
        --color-client-text    : ${o.text}    !important;
        --sb-text-nav-appintranet : ${o.text} !important;
        --color-client-background : ${o.background} !important;
        --color-floating-nav-bg   : ${o.floatingNavBg || '#FFFFFF'} !important;
        --color-floating-nav-text : ${o.floatingNavText || '#000000'} !important;
        --bg-image            : url("${o.bg || ""}");
        --logo-url            : url("${o.logo || ""}");
        --padding-logo-size   : ${o.padH || 0}px ${o.padW || 0}px;
        --bg-image-position   : 25% ${o.bgVert || 50}%;
        --logo-height         : ${o.logoH || 32}px;
      }

      /* ================= header ================= */
      .desktop.wow-header-activated .header-left-container{
        position   : relative;
        display    : flex;
        align-items: center;
        padding    : var(--padding-logo-size) !important;
      }

      /* hide the title text and its divider */
      .desktop.wow-header-activated .header-title,
      .desktop.wow-header-activated .header-title::before,
      .desktop.wow-header-activated .header-title::after{
        display: none !important;
      }

      /* translucent coloured bar behind the header */
      .desktop.wow-header-activated .app-header{
        --desktop-app-header-bg-color: ${headerBgTranslucent} !important;
        background-color             : ${headerBgTranslucent} !important;
      }

      /* Override for newer envs to ensure primary color is used */
      html.with-floating-menu.desktop.desktop .app-header::before {
        background: ${headerBgTranslucent} !important;
        content: "" !important;
      }

      /* Newer env header background */
      .bg-header-appintranet {
        background-color: ${o.primary} !important;
      }

      /* Newer env header text */
      .text-header-appintranet {
        color: ${primaryInverse} !important;
      }

      /* ================= mobile ================= */
      static-content-block[background-color="#d3e6ec"] {
        background-color: ${o.background} !important;
      }

      static-content-block[background-color="#d3e6ec"] p {
        color: ${widgetTextColor} !important;
      }


      /* ================= menu / icons ================= */
      .desktop.wow-header-activated .header-title,
      .desktop.wow-header-activated .header-title .css-1wac6i9-TitleWrapper{
        color:${o.text}!important;
      }
      .desktop.wow-header-activated .wow-app-header .css-8jz3c5-UserSettingsContainer > .user-menu-btn::after { /* Added this line */
        color:${o.text}!important;
      }
      .wow-header-activated .css-4557aa-StyledMegaMenuItem>a::before,
      .desktop.wow-header-activated #mega-menu li>a.item:before{
        background-color:${hexToRgba(o.primary, 0.3)}!important;
      }
      .wow-header-activated #menu  .we-icon,
      .desktop.wow-header-activated .wow-app-header .css-dgi6rr-Link::after,
      .wow-header-activated #menu .css-1ccn5tk-IconStyled,
      .desktop.wow-header-activated .wow-app-header .css-ol0i66-StyledLaunchpadIcon .we-icon::after { /* Added this line */
        color: ${o.text}!important;
      }

      /* ================= floating nav ================= */
      div#mega-menu {
        outline: none !important;
      }
      /* Text color for TOP-LEVEL items only in older envs */
      [data-testid="mega-menu-list"] > li > a .item-text,
      [data-testid="mega-menu-list"] > li > a .we-icon {
          color: var(--color-floating-nav-text) !important;
      }          
      /* Older env nav container background */
      .desktop.wow-header-activated .css-sps0ey-MegaMenuContainer {
        background-color: var(--color-floating-nav-bg) !important;
      }
      /* Newer env nav container background */
      .bg-menubar-intranet {
        background-color: var(--color-floating-nav-bg) !important;
      }

      /* Text color for TOP-LEVEL items only in older envs */
      .wow-header-activated .css-1kyaah4-StyledMegaMenuItem > a,
      .wow-header-activated .css-1kyaah4-StyledMegaMenuItem > div > a,
      .wow-header-activated .css-6pdc2t-StyledMegaMenuItem > a,
      .wow-header-activated .css-6pdc2t-StyledMegaMenuItem > div > a {
        color: var(--color-floating-nav-text) !important;
      }

      /* Force text color for TOP-LEVEL items in newer envs */
      a[class~="!text-menubar-intranet"],
      a[class~="!text-menubar-intranet"] svg {
          color: var(--color-floating-nav-text) !important;
      }


      /* ================= Surveys, Polls & Buttons ================= */
      .survey-custom survey-plugin-employee-block label svg {
        fill: ${surveyColor} !important;
      }
      .survey-custom form > div > div:nth-of-type(3) button {
        background-color: ${surveyColor} !important;
        border-color: ${surveyColor} !important;
        color: ${surveyColorInverse} !important;
      }
      .bg-primary-vivid {
        background-color: ${surveyColor} !important;
      }
      .ds-pill.ds-pill--blue {
        background-color: color-mix(in srgb, ${surveyColor} 30%, white 70%) !important;
        color: ${surveyColor} !important;
      }

      /* ================= Quick Links & Specific Buttons ================= */
      /* "Design 2" Tiled Quick Links */
      .quick-links-widget.design-2.type-tiles .quick-links-widget__item:not([style*="background-color"]) {
          background-color: ${o.primary} !important;
      }
      .quick-links-widget.design-2.type-tiles .quick-links-widget__item:not([style*="background-color"]) a,
      .quick-links-widget.design-2.type-tiles .quick-links-widget__item:not([style*="background-color"]) .we-icon {
          color: ${primaryInverse} !important;
      }

      /* Tiled Layout-3 Quick Links */
      .quick-links-widget.type-tiles .quick-links-widget__list--layout-3 .quick-links-widget__item:not([style*="background-color"]) {
          background-color: ${o.primary} !important;
      }
      .quick-links-widget.type-tiles .quick-links-widget__list--layout-3 .quick-links-widget__item:not([style*="background-color"]) a,
      .quick-links-widget.type-tiles .quick-links-widget__list--layout-3 .quick-links-widget__item:not([style*="background-color"]) .we-icon {
          color: ${primaryInverse} !important;
      }

      /* General .sb-button styling */
      button.sb-button {
          background-color: ${o.text} !important;
          color: ${textOpposite} !important;
          border-color: ${o.text} !important;
      }

      /* ================= card widgets ================= */

      /* first static-content card (no .counter) — */
      .content-widget-wrapper.static-content-wrapper.widget-on-card.no-shadow-border:not(.counter) .news-articles-plain .news-feed-post {
        background-color: ${o.background} !important;
      }

      .static-content-wrapper.widget-on-card.no-shadow-border
        :not(.counter):not(.full-width-bg.page-footer) {
        /* headline */
        .news-articles-plain .news-feed-post-headline,
        /* teaser text */
        .news-articles-plain .news-feed-post-teaser span,
        /* “read more” link */
        .news-articles-plain .read-more {
          color: ${widgetTextColor} !important;
        }
        .content-widget-wrapper:has(a[href*="6813d9141acf7c2a0cf77cb3"]) > h2.content-widget-title span {
          color: ${widgetTextColor} !important;
        }


        /* publish‐date & channel link */
        .news-articles-plain .news-feed-post-meta,
        .news-articles-plain .news-feed-post-meta a,
        .news-articles-plain .news-feed-post-meta .separator {
          color: ${metaTextColor} !important;
        }
      }

      .full-width-bg:not(.page-footer)
        > .content-widget-wrapper.static-content-wrapper.widget-on-card.no-shadow-border {
        background-color: ${o.background} !important;
      }

      .full-width-bg:not(.page-footer)
        > .static-content-wrapper.widget-on-card.no-shadow-border
        .ui-commons__section__column > h2 {
        color: ${widgetTextColor} !important;
      }

      .full-width-bg.page-footer
        > .content-widget-wrapper.static-content-wrapper.widget-on-card.no-shadow-border {
        background-color: ${o.primary} !important;
        color: ${primaryInverse} !important;
      }

      /* only the real text spans/headings inside the footer card */
      .full-width-bg.page-footer
        .content-widget-wrapper.static-content-wrapper.widget-on-card.no-shadow-border
        h3 span,
      .full-width-bg.page-footer
        .content-widget-wrapper.static-content-wrapper.widget-on-card.no-shadow-border
        p span,
      .full-width-bg.page-footer
        .content-widget-wrapper.static-content-wrapper.widget-on-card.no-shadow-border
        strong span {
        color: ${primaryInverse} !important;
      }


      /* ================= audio player (API-hosted only) ================= */
      div.audio-player:has(audio[src*="/api/media/"]) .audio-player__play-button.audio-player__play-button {
        background-color: var(--color-client-primary) !important;
      }

      div.audio-player:has(audio[src*="/api/media/"]) .audio-player__meta {
        background-color: var(--color-client-primary) !important;
        border-radius: 9px;
      }

      div.audio-player:has(audio[src*="/api/media/"]) {
        background-color: var(--color-client-primary) !important;
      }

      div.audio-player:has(audio[src*="/api/media/"]) .audio-player__play-button.audio-player__play-button > svg {
        fill: var(--color-client-text) !important;
      }

      div.audio-player:has(audio[src*="/api/media/"]) .audio-player__meta .audio-player__title,
      div.audio-player:has(audio[src*="/api/media/"]) .audio-player__meta .audio-player__duration,
      div.audio-player:has(audio[src*="/api/media/"]) .audio-player__file-size {
        color: ${primaryInverse} !important;
      }

      /* ================= homepage hero / .home-social ================= */
        html[data-plugin-id="page"].desktop:not(.without-page-background):has(.home-social)::before{
        background-image     : var(--bg-image) !important;
        background-repeat    : no-repeat !important;
        background-size      : cover       !important;
        background-position  : var(--bg-image-position) !important;
        background-color     : #f4f9fb     !important;
      }

      /* ================= jobs widget buttons ================= */
      .content-widget-wrapper.static-content-wrapper.widget-on-card.jobs
        a.clickable.external-link {
        /* make the button background your text colour */
        background-color: ${o.text} !important;
        /* and make the label the inverse of that */
        color: ${textOpposite} !important;
        border-color: ${o.text} !important;
      }

      /* ================= counter widget ================= */

      /* 1 — the card itself */
      .content-widget-wrapper.static-content-wrapper.widget-on-card.no-shadow-border.counter{
        /* primary background */
        background-color: var(--color-client-primary) !important;
      }

      /* 2 — every “real” text bit that lives in the widget card */
      .content-widget-wrapper.static-content-wrapper.widget-on-card.no-shadow-border.counter
        h1 span,
      .content-widget-wrapper.static-content-wrapper.widget-on-card.no-shadow-border.counter
        h2 span,
      .content-widget-wrapper.static-content-wrapper.widget-on-card.no-shadow-border.counter
        h3 span,
      .content-widget-wrapper.static-content-wrapper.widget-on-card.no-shadow-border.counter
        p  span,
      .content-widget-wrapper.static-content-wrapper.widget-on-card.no-shadow-border.counter
        strong span{
        /* inverse of primary */
        color: ${primaryInverse} !important;
      }

      /* 3 — the subscribe / register button */
      .content-widget-wrapper.static-content-wrapper.widget-on-card.no-shadow-border.counter
        .group-subscription-block-button{
        /* button background → text colour */
        background-color: var(--color-client-text) !important;
        border-color     : var(--color-client-text) !important;
        /* label + icon → inverse of text colour */
        color            : ${textOpposite} !important;
      }

      /* 4 — SVG icon inside the button needs its own fill */
      .content-widget-wrapper.static-content-wrapper.widget-on-card.no-shadow-border.counter
        .group-subscription-block-button svg path{
        fill: ${textOpposite} !important;
      }

      /* 5 — “button-text” span inside the button */
      .content-widget-wrapper.static-content-wrapper.widget-on-card.no-shadow-border.counter
        .group-subscription-block-button .button-text{
        color: ${textOpposite} !important;
      }

      /* ================= standalone button‐wrapper ================= */
      .content-widget-wrapper.button-wrapper
        .button-block-link {
        background-color: ${o.text} !important;
        color: ${textOpposite} !important;
        border-color: ${o.text} !important;
      }

    `;

  // Add specific header styles
  css += `
    /* ================= specific header ================= */
    .desktop.wow-header-activated .css-1brf39v-HeaderBody {
      background-color: var(--color-client-primary) !important;
      color: var(--color-client-text) !important;
    }

    .desktop.wow-header-activated .css-8a35lc-Title {
      color: var(--color-client-text) !important;
      display: none !important; /* Hide the title text */
    }

    .mobile .header-container {
      background-color: var(--color-client-primary) !important;
      color: var(--color-client-text) !important;
    }

    .mobile .header-container .header-button {
      color: var(--color-client-text) !important;
    }
    `;

  // Conditionally replace logo
  if (o.logo) {
    css += `
      /* ================= logo/header ================= */
        /* ---- DESKTOP LOGO (WOW HEADER) ---- */
        .desktop.wow-header-activated .header-left-container img.header-logo{
          opacity: 0 !important;                                /* keep layout, hide pixels */
        }
        .desktop.wow-header-activated .header-left-container::after{
          content: "" !important;
          position: absolute;
          inset: 0;
          background-image   : var(--logo-url);
          background-repeat  : no-repeat;
          background-size    : contain;
          background-position: left center;
          pointer-events     : none;                            /* logo stays decorative */
        }

        /* ---- MOBILE HEADER LOGO ---- */
        .header-container.with-logo .header-logo.css-v852x2-LogoImage {
            content: var(--logo-url) !important;
        }
        `;
  } else {
    // If no logo is provided, ensure the original logo is visible (though it should be by default)
    css += `
        .desktop.wow-header-activated .header-left-container img.header-logo{
          opacity: 1 !important;
        }
        `;
  }
  return css;
}