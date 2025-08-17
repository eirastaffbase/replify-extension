// utils/helpers.js

  /** Helper: ensure the LinkedIn URL ends with `/posts/?feedView=images`. */
  export const normaliseLinkedInUrl = (raw) =>
    raw.replace(/\/posts.*$/i, "").replace(/\/$/, "") + "/posts/?feedView=images";

/**
* Builds the image payload. Original URL has no transforms.
* Thumbs and icons use a standard fill-crop.
*/

export const buildImagePayload = (fileId) => {
    const baseUrl = `https://app.staffbase.com/api/media/secure/external/v2/image/upload/`;
    return {
        original: {
            url: `${baseUrl}${fileId}`,
            size: 100000,
            width: 1920,
            height: 1080,
            created: String(Date.now()),
            format: "jpg",
            mimeType: "image/jpeg",
        },
        icon: {
            url: `${baseUrl}c_fill,w_70,h_70/${fileId}`,
            format: "jpg",
            mimeType: "image/jpeg",
        },
        thumb: {
            url: `${baseUrl}c_fill,w_200,h_200/${fileId}`,
            format: "jpg",
            mimeType: "image/jpeg",
        },
    };
};