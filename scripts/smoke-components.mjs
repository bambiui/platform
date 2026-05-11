/**
 * smoke-components.mjs
 *
 * Validates that every component exported from @bambiui/components is
 * properly wired: files exist, registry coverage is complete, docs and
 * studio previews are present, and a11y-sensitive implementation patterns
 * are intact.
 *
 * Intentional exceptions are documented inline so the script stays
 * accurate as the codebase grows.
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

// ── Helpers ────────────────────────────────────────────────────────────────

/** @param {string} rel */
function abs(rel) {
  return path.join(repoRoot, rel);
}

/** @param {string} rel */
function exists(rel) {
  return existsSync(abs(rel));
}

/** @param {string} filePath */
async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

const failures = /** @type {string[]} */ ([]);
const warnings = /** @type {string[]} */ ([]);
let passCount = 0;

/**
 * @param {string} label
 * @param {boolean} ok
 * @param {string} [detail]
 */
function check(label, ok, detail = "") {
  if (ok) {
    passCount++;
  } else {
    failures.push(detail ? `${label}: ${detail}` : label);
  }
}

/**
 * @param {string} label
 * @param {string} detail
 */
function warn(label, detail) {
  warnings.push(`${label}: ${detail}`);
}

// ── Load manifests ─────────────────────────────────────────────────────────

const componentsPkg = await readJson(abs("packages/components/package.json"));
const registry = await readJson(abs("registry.json"));

/** @type {Record<string, string>} */
const pkgExports = componentsPkg.exports ?? {};

// Derive component names from package exports (keys like "./button", "./button/react", "./button.css")
const componentNames = new Set(
  Object.keys(pkgExports)
    .map((key) => key.replace(/^\.\//, "").split("/")[0].replace(/\.css$/, ""))
    .filter(
      (name) =>
        name &&
        !name.includes(".") &&
        exists(`packages/components/${name}/src`),
    ),
);

process.stdout.write(
  `Discovered components: ${[...componentNames].join(", ")}\n\n`,
);

// ── 1. Package export → file existence ────────────────────────────────────

process.stdout.write("1. Checking package.json exports resolve to files…\n");

for (const [exportKey, target] of Object.entries(pkgExports)) {
  const rel = `packages/components/${/** @type {string} */ (target).replace(/^\.\//, "")}`;
  check(`exports["${exportKey}"] → ${rel}`, exists(rel));
}

// ── 2. Registry coverage ───────────────────────────────────────────────────

process.stdout.write("2. Checking registry coverage for each component…\n");

const registryComponents = Object.keys(registry.components ?? {});

for (const name of componentNames) {
  check(
    `registry has entry for "${name}"`,
    registryComponents.includes(name),
  );
}

// Reverse: every registry component has a package export
for (const name of registryComponents) {
  check(
    `package exports base entrypoint for registry component "${name}"`,
    `./${name}` in pkgExports,
  );
}

// ── 3. Entrypoint coverage per component ──────────────────────────────────

process.stdout.write("3. Checking per-component entrypoints…\n");

// Input has framework-sub-field exports instead of a single framework entrypoint
// for svelte/vue/astro (input/svelte, input/vue, input/astro all exist in pkg but
// also ship inputfield.* sub-files via separate exports). This is intentional.
const standardFrameworks = ["react", "svelte", "vue", "astro"];

for (const name of componentNames) {
  // base
  check(
    `${name}: base export`,
    `./${name}` in pkgExports &&
      exists(pkgExports[`./${name}`].replace(/^\.\//, "packages/components/")),
  );

  // css
  check(
    `${name}: css export`,
    `./${name}.css` in pkgExports &&
      exists(
        pkgExports[`./${name}.css`].replace(/^\.\//, "packages/components/"),
      ),
  );

  // recipe
  check(
    `${name}: recipe export`,
    `./${name}/recipe` in pkgExports &&
      exists(
        pkgExports[`./${name}/recipe`].replace(
          /^\.\//,
          "packages/components/",
        ),
      ),
  );

  // framework files
  for (const fw of standardFrameworks) {
    const key = `./${name}/${fw}`;
    // input uses ./input/svelte not ./input/svelte/index — check both patterns
    const hasKey = key in pkgExports;
    const hasSubKey = Object.keys(pkgExports).some((k) =>
      k.startsWith(`${key}/`),
    );
    check(
      `${name}: ${fw} export`,
      hasKey || hasSubKey,
      hasKey
        ? ""
        : hasSubKey
          ? ""
          : `missing ${key} (and no ${key}/* sub-exports)`,
    );
  }
}

// ── 4. Docs coverage ──────────────────────────────────────────────────────

process.stdout.write("4. Checking docs pages…\n");

for (const name of componentNames) {
  check(
    `${name}: docs page exists`,
    exists(`apps/docs/src/content/docs/components/${name}.mdx`),
  );
}

// ── 5. Studio preview coverage ────────────────────────────────────────────

process.stdout.write("5. Checking studio preview components…\n");

// Studio uses named preview files. CardButtons.astro covers button + buttongroup.
// Map component → expected preview file(s).
/** @type {Record<string, string[]>} */
const studioPreviewMap = {
  button: ["apps/studio/src/components/builder/CardButtons.astro"],
  buttongroup: ["apps/studio/src/components/builder/CardButtons.astro"],
  card: ["apps/studio/src/components/builder/CardPreview.astro"],
  drawer: ["apps/studio/src/components/builder/DrawerPreview.astro"],
  sidebar: ["apps/studio/src/components/builder/SidebarPreview.astro"],
  input: ["apps/studio/src/components/builder/InputPreview.astro"],
};

for (const name of componentNames) {
  const previewFiles = studioPreviewMap[name];

  if (!previewFiles) {
    warn(`${name}: studio preview`, "no preview mapping defined — add to studioPreviewMap in smoke-components.mjs");
    continue;
  }

  for (const previewFile of previewFiles) {
    check(`${name}: studio preview file "${previewFile}"`, exists(previewFile));
  }
}

// ── 6. A11y-sensitive patterns ────────────────────────────────────────────

process.stdout.write("6. Checking a11y-sensitive patterns in React source…\n");

/**
 * @param {string} componentName
 * @param {string} pattern
 * @param {string} description
 */
async function checkA11yPattern(componentName, pattern, description) {
  const reactPath = `packages/components/${componentName}/src/react.tsx`;

  if (!exists(reactPath)) {
    failures.push(`${componentName}: react.tsx missing — cannot check "${description}"`);
    return;
  }

  const source = await readFile(abs(reactPath), "utf8");
  check(
    `${componentName}: ${description}`,
    new RegExp(pattern).test(source),
    `pattern not found: ${pattern}`,
  );
}

// Button: disabled and loading set aria-* attributes
await checkA11yPattern("button", "aria-busy", "loading sets aria-busy");
await checkA11yPattern("button", "aria-disabled", "loading/disabled sets aria-disabled");
await checkA11yPattern("button", 'disabled={isDisabled}', "disabled prop wired to native disabled");
await checkA11yPattern("button", "data-loading", "loading sets data-loading attribute");

// Input: label wiring and aria-invalid
await checkA11yPattern("input", "htmlFor", "InputLabel uses htmlFor");
await checkA11yPattern("input", "aria-invalid", "Input sets aria-invalid");
await checkA11yPattern("input", "aria-describedby", "Input wires aria-describedby");

// Drawer: dialog role and aria attributes
await checkA11yPattern("drawer", 'role="dialog"', 'DrawerContent has role="dialog"');
await checkA11yPattern("drawer", "aria-modal", "DrawerContent sets aria-modal");
await checkA11yPattern("drawer", "aria-labelledby", "DrawerContent sets aria-labelledby");
await checkA11yPattern("drawer", "useFocusTrap", "Drawer implements focus trap");
await checkA11yPattern("drawer", 'key === "Escape"', "Drawer closes on Escape");

// Sidebar: navigation landmark
await checkA11yPattern("sidebar", "nav|role.*navigation|<nav", "Sidebar uses nav or navigation landmark");

// ── 7. Core contracts export check ────────────────────────────────────────

process.stdout.write("7. Checking core contracts file…\n");

check(
  "packages/core/src/contracts.ts exists",
  exists("packages/core/src/contracts.ts"),
);

const coreSource = await readFile(abs("packages/core/src/contracts.ts"), "utf8");

for (const constName of ["bambiIntents", "bambiAppearances", "bambiSizes"]) {
  check(
    `contracts.ts exports ${constName}`,
    coreSource.includes(`export const ${constName}`),
  );
}

// ── Report ─────────────────────────────────────────────────────────────────

process.stdout.write("\n");

if (warnings.length > 0) {
  process.stdout.write(`Warnings (${warnings.length}):\n`);

  for (const w of warnings) {
    process.stdout.write(`  ⚠  ${w}\n`);
  }

  process.stdout.write("\n");
}

if (failures.length > 0) {
  process.stderr.write(`Component smoke checks FAILED (${failures.length} failure(s), ${passCount} passed):\n`);

  for (const f of failures) {
    process.stderr.write(`  ✗  ${f}\n`);
  }

  process.exit(1);
}

process.stdout.write(
  `Component smoke checks passed. ${passCount} checks OK${warnings.length > 0 ? `, ${warnings.length} warning(s)` : ""}.\n`,
);
