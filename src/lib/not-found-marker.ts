/**
 * Response header the root route sets when it renders the 404 page itself
 * (unknown language prefix); src/server.ts strips it and turns the
 * response into a real HTTP 404.
 */
export const NOT_FOUND_MARKER_HEADER = "x-turnup-not-found";
