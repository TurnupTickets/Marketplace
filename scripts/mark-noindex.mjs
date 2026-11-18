// Beta build step: keep search engines from indexing the beta host.
// Run after `vite build`; appends a catch-all X-Robots-Tag rule to the
// Workers Static Assets `_headers` file in dist/client.
import { appendFileSync, existsSync } from "node:fs";

const headersPath = "dist/client/_headers";
if (!existsSync(headersPath)) {
  console.error(`${headersPath} not found — run the vite build first`);
  process.exit(1);
}

appendFileSync(
  headersPath,
  "\n# Beta only (scripts/mark-noindex.mjs)\n/*\n  X-Robots-Tag: noindex, nofollow\n",
);
console.log(`noindex header added to ${headersPath}`);
