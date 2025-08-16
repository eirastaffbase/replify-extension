// utils/helpers.js
export const normaliseLinkedInUrl = (raw) =>
    raw.replace(/\/posts.*$/i, "").replace(/\/$/, "") + "/posts/?feedView=images";
