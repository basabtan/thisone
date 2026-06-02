#!/usr/bin/env node
/**
 * Static smoke checks for Sabtan Knowledge Base Vault pages.
 * Run from vault root:  node tools/check-vault.mjs
 *
 * Catches common regressions (duplicate nav, missing shared nav, bundler nav wipe).
 * For layout/runtime issues, use the manual checklist printed at the end or add Playwright.
 */

import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const vaultRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Canonical pages — keep in sync with PAGES.md (alias: navbar = vault nav strip / nav-strip.*) */
const PAGES = [
  { path: "index.html", nav: "optional" },
  { path: "najd-roadmap.html", nav: "required", layers: ["overview", "phase2", "phase3"] },
  { path: "phase-1-papers.html", nav: "required", active: "phase1" },
  { path: "research-ideas-dev.html", nav: "required", active: "ideas" },
  { path: "research-ideas.html", nav: "bundled", active: "ideas" },
  { path: "Sabtan Knowledge Base/index.html", nav: "required", active: "knowledge" },
  { path: "paper-1-guide.html", nav: "required", active: "paper1guide" },
  { path: "Najd Fault System Dashboard.html", nav: "required", active: "knowledge" },
];

const SHARED = ["shared/nav-strip.js", "shared/nav-strip.css", "shared/kb-board.js"];

const errors = [];
const warnings = [];

function err(page, msg) {
  errors.push(`[FAIL] ${page}: ${msg}`);
}
function warn(page, msg) {
  warnings.push(`[WARN] ${page}: ${msg}`);
}

function read(pagePath) {
  const full = join(vaultRoot, pagePath);
  if (!existsSync(full)) {
    err(pagePath, "file missing");
    return null;
  }
  return readFileSync(full, "utf8");
}

for (const rel of SHARED) {
  if (!existsSync(join(vaultRoot, rel))) err(rel, "shared asset missing");
}

const seen = new Set();
for (const page of PAGES) {
  if (seen.has(page.path)) continue;
  seen.add(page.path);

  const html = read(page.path);
  if (!html) continue;

  if (/<div[^>]+id=["']navstrip["']/i.test(html)) {
    err(page.path, "hardcoded #navstrip div — blocks shared/nav-strip.js from mounting");
  }

  if (page.nav === "required") {
    if (!html.includes("nav-strip.js")) {
      err(page.path, "missing script: shared/nav-strip.js");
    }
    if (!html.includes("nav-strip.css")) {
      err(page.path, "missing stylesheet: shared/nav-strip.css");
    }
    if (page.active && !html.includes(`data-nav-active="${page.active}"`)) {
      warn(page.path, `expected data-nav-active="${page.active}" on nav script`);
    }
  }

  if (page.nav === "bundled") {
    const hasInject =
      html.includes("nav-strip.js") &&
      (html.includes("document.body.appendChild(navJs)") ||
        html.includes("mountVaultNav"));
    if (!hasInject) {
      err(
        page.path,
        "bundled page must inject nav after documentElement.replaceWith (nav is wiped on unpack)"
      );
    }
  }

  if (/#navstrip\s*\{/.test(html) && page.path !== "shared/nav-strip.css") {
    warn(page.path, "inline #navstrip CSS — may conflict with shared/nav-strip.css");
  }

  if (/id=["']ns-(landing|overview|phase1)["']/i.test(html)) {
    err(page.path, "legacy inline nav buttons (ns-landing etc.) still present");
  }
}

console.log("Sabtan Knowledge Base Vault — static checks\n");

if (errors.length) {
  console.log("Errors:");
  errors.forEach((e) => console.log("  " + e));
}
if (warnings.length) {
  console.log("\nWarnings:");
  warnings.forEach((w) => console.log("  " + w));
}

if (!errors.length && !warnings.length) {
  console.log("All static checks passed.\n");
} else if (!errors.length) {
  console.log("\nNo errors (warnings only).\n");
} else {
  console.log("");
}

console.log("Manual smoke test (5 min, after starting a local server on the vault root):");
console.log("  python -m http.server 8766");
console.log("  Then open each URL and confirm ONE bottom nav bar (search + KB + Najd menu):");
[
  "http://127.0.0.1:8766/",
  "http://127.0.0.1:8766/Sabtan%20Knowledge%20Base/index.html",
  "http://127.0.0.1:8766/najd-roadmap.html",
  "http://127.0.0.1:8766/najd-roadmap.html?layer=overview",
  "http://127.0.0.1:8766/najd-roadmap.html?layer=phase2",
  "http://127.0.0.1:8766/phase-1-papers.html",
  "http://127.0.0.1:8766/research-ideas.html  (wait for Unpacking… to finish)",
  "http://127.0.0.1:8766/research-ideas-dev.html",
].forEach((u) => console.log("    " + u));

console.log("\nOptional next step: Playwright can automate the above (nav visible, no console errors).");

process.exit(errors.length ? 1 : 0);
