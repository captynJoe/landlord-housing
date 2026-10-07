// Stamps local script/stylesheet references in public/ with a hash of the referenced
// file's contents (?v=<hash>), so browsers fetch a file again exactly when it changes.
// Runs after `tsc -p tsconfig.public.json` (see build:public).
//
// 1. module imports in JS:            from "./notifications.js" -> "./notifications.js?v=<hash>"
// 2. versioned paths inside JS:       "/users.js?v=old"         -> "/users.js?v=<hash>"
//    (e.g. the resident bundle's loader string; these may reference each other in
//    cycles, so their hashes ignore other versioned-path strings)
// 3. tags in HTML:                    src="/landlord.js?v=old"   -> src="/landlord.js?v=<hash>"
//
// Running it again on its own output changes nothing.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public");
const IMPORT_RE = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])(\.\/[^"'?]+\.js)(?:\?v=[^"']*)?\2/g;
const VERSIONED_PATH_RE = /([`"'])(\/[A-Za-z0-9_./-]+\.(?:js|css))\?v=[^`"']*\1/g;
const TAG_RE = /\b(src|href)=(["'])(\/[^"'?#]+\.(?:js|css))(?:\?v=[^"']*)?\2/g;

const hash = (text) => createHash("sha256").update(text).digest("hex").slice(0, 10);
const read = (file) => readFileSync(file, "utf8");
const write = (file, before, after) => after !== before && writeFileSync(file, after);
const publicFile = (publicPath) => {
  const file = path.join(publicDir, publicPath);
  return existsSync(file) && statSync(file).isFile() ? file : null;
};
// Content hash that ignores versioned-path stamps, so files that point at each other
// that way still get stable, non-circular hashes.
const basisHash = (file) => hash(read(file).replace(VERSIONED_PATH_RE, "$1$2?v=$1"));

function listFiles(dir, extension) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return listFiles(full, extension);
    }
    return entry.name.endsWith(extension) && !entry.name.includes(".bak") ? [full] : [];
  });
}

const jsFiles = listFiles(publicDir, ".js");

// Pass 1: relative module imports, children before parents.
const importDone = new Set();
const inProgress = new Set();
function stampImports(file) {
  if (importDone.has(file)) {
    return;
  }
  if (inProgress.has(file)) {
    throw new Error(`Import cycle through ${path.relative(publicDir, file)}`);
  }
  inProgress.add(file);
  const before = read(file);
  const after = before.replace(IMPORT_RE, (match, lead, quote, specifier) => {
    const target = path.resolve(path.dirname(file), specifier);
    if (!existsSync(target)) {
      return match;
    }
    stampImports(target);
    return `${lead}${quote}${specifier}?v=${basisHash(target)}${quote}`;
  });
  write(file, before, after);
  inProgress.delete(file);
  importDone.add(file);
}
jsFiles.forEach(stampImports);

// Pass 2: versioned absolute paths inside JS.
for (const file of jsFiles) {
  const before = read(file);
  const after = before.replace(VERSIONED_PATH_RE, (match, quote, publicPath) => {
    const target = publicFile(publicPath);
    return target ? `${quote}${publicPath}?v=${basisHash(target)}${quote}` : match;
  });
  write(file, before, after);
}

// Pass 3: <script>/<link> tags, using each file's final contents.
let stampedPages = 0;
for (const file of listFiles(publicDir, ".html")) {
  const before = read(file);
  const after = before.replace(TAG_RE, (match, attribute, quote, publicPath) => {
    const target = publicFile(publicPath);
    return target ? `${attribute}=${quote}${publicPath}?v=${hash(read(target))}${quote}` : match;
  });
  if (after !== before) {
    writeFileSync(file, after);
    stampedPages += 1;
  }
}

console.log(`Stamped asset versions in ${stampedPages} HTML file(s).`);
