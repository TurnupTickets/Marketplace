#!/usr/bin/env node
/**
 * Collects every static UI translation key used by the storefront and writes
 * the TurnupCms seeder fixture (StorefrontTranslationsSeeder).
 *
 *   node scripts/extract-i18n-keys.mjs <out.json>   # write the fixture
 *   node scripts/extract-i18n-keys.mjs --check <out.json>  # exit 1 if stale
 *
 * A key is any string literal inside the FIRST argument of a `t(...)` or
 * `translate(...)` call — so `t(cond ? "A" : "B")` and
 * `t(issue.message ?? "Błąd danych")` count. Keys that reach `t()` through a
 * variable (zod messages, status-label maps, dial-code countries) are
 * literals declared elsewhere, so they are listed explicitly via
 * `INDIRECT_KEY_SOURCES` below: every string literal in those declarations
 * is a key.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, "src");
// Must match STOREFRONT_GROUP in src/lib/i18n-store.ts.
const GROUP = "Strona - Storefront";
const CALLEES = new Set(["t", "translate"]);

/**
 * file (relative to src/) -> declarations whose string literals are all keys.
 * `message` = every `{ message: "..." }` zod option in the file.
 */
const INDIRECT_KEY_SOURCES = {
  "lib/dial-codes.ts": { properties: ["country"] },
  "routes/logowanie.tsx": { message: true, arrays: ["Bilety zawsze pod ręką"] },
  "routes/reset-password.tsx": { message: true },
  "routes/znajdz-bilet.tsx": {
    message: true,
    variables: ["TICKET_STATUS_LABEL"],
    arrays: ["Zamówienie"],
  },
  "routes/profil.tsx": {
    variables: ["ORDER_STATUS_LABEL", "TICKET_STATUS_LABEL"],
    properties: ["label"],
  },
  "routes/wydarzenia.$tagSlug.$eventSlug_.zamowienie.tsx": { message: true },
  "routes/wydarzenia.$tagSlug.$eventSlug_.potwierdzenie.tsx": {
    properties: ["title", "description"],
  },
  "components/turnup/SeatPicker.tsx": { variables: ["PAN_ZOOM_HINT"] },
};

function walkFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "ui" ? [] : walkFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) && !name.endsWith(".gen.ts")
      ? [path]
      : [];
  });
}

function stringLiterals(node, out) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    out.push(node.text);
    return;
  }
  // A nested t() is collected on its own visit; its options are not keys.
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
    if (CALLEES.has(node.expression.text)) return;
  }
  // Object keys / property names inside an argument are not keys.
  if (ts.isPropertyAssignment(node)) return stringLiterals(node.initializer, out);
  ts.forEachChild(node, (child) => stringLiterals(child, out));
}

function propertyName(node) {
  return node.name && (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name))
    ? node.name.text
    : null;
}

function collect(file) {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const rel = relative(SRC, file);
  const indirect = INDIRECT_KEY_SOURCES[rel];
  const keys = [];

  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      CALLEES.has(node.expression.text) &&
      node.arguments[0]
    ) {
      stringLiterals(node.arguments[0], keys);
    }
    if (indirect) {
      if (ts.isVariableDeclaration(node) && indirect.variables?.includes(node.name.getText())) {
        if (node.initializer) stringLiterals(node.initializer, keys);
      }
      if (ts.isPropertyAssignment(node)) {
        const name = propertyName(node);
        if (name && indirect.properties?.includes(name)) stringLiterals(node.initializer, keys);
        if (name === "message" && indirect.message) stringLiterals(node.initializer, keys);
      }
      if (
        ts.isArrayLiteralExpression(node) &&
        indirect.arrays?.some((first) => {
          const head = node.elements[0];
          return head && ts.isStringLiteral(head) && head.text === first;
        })
      ) {
        stringLiterals(node, keys);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return keys;
}

const args = process.argv.slice(2);
const check = args[0] === "--check";
const out = check ? args[1] : args[0];
if (!out) {
  console.error("usage: extract-i18n-keys.mjs [--check] <out.json>");
  process.exit(2);
}

const keys = [...new Set(walkFiles(SRC).flatMap(collect))]
  .filter((key) => key.trim() !== "" && key !== "—")
  .sort((a, b) => a.localeCompare(b, "pl"));

/**
 * `langs_keys` is UNIQUE(key_name, group_id) under utf8mb3_general_ci —
 * case- and accent-insensitive — and the CMS looks keys up the same way, so
 * `Miejsce` and `miejsce` would be ONE row there while the storefront looks
 * up case-sensitively. Folding case and diacritics here is a little stricter
 * than MySQL (it also folds `ó`, which the CMS stores as `&oacute;`), which is
 * the safe direction.
 */
const fold = (key) => key.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const byFold = new Map();
for (const key of keys) {
  const other = byFold.get(fold(key));
  if (other) {
    console.error(`keys collide in the CMS (case/accent-insensitive): "${other}" vs "${key}"`);
    process.exitCode = 1;
  }
  byFold.set(fold(key), key);
}
// key_name is varchar(255), stored HTML-entity-encoded (ó -> &oacute;).
const tooLong = keys.filter((key) => key.replace(/[óÓ"&<>]/g, "&xxxxxx;").length > 255);
for (const key of tooLong) console.error(`key longer than 255 chars once encoded: "${key}"`);
if (process.exitCode || tooLong.length) process.exit(1);

const fixture = `${JSON.stringify({ group: GROUP, keys }, null, 2)}\n`;

if (check) {
  let current = "";
  try {
    current = readFileSync(out, "utf8");
  } catch {
    /* missing → stale */
  }
  if (current !== fixture) {
    console.error(`${out} is stale — run: node scripts/extract-i18n-keys.mjs ${out}`);
    process.exit(1);
  }
  console.log(`${keys.length} keys, fixture up to date`);
} else {
  writeFileSync(out, fixture);
  console.log(`${keys.length} keys -> ${out}`);
}
