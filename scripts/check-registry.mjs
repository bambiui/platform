#!/usr/bin/env node
// Validates registry.json against the v2 schema.

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const registryPath = resolve(root, "registry.json");

let errors = 0;

function fail(msg) {
  console.error(`  ✗ ${msg}`);
  errors++;
}

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}

function checkFileExists(filePath, context) {
  const abs = resolve(root, filePath);
  if (!existsSync(abs)) {
    fail(`${context}: file not found — ${filePath}`);
    return false;
  }
  return true;
}

// ── Parse ─────────────────────────────────────────────────────────────────

let registry;
try {
  registry = JSON.parse(readFileSync(registryPath, "utf-8"));
} catch {
  fail("registry.json is not valid JSON");
  process.exit(1);
}

console.log("Checking registry.json...\n");

// ── Version ───────────────────────────────────────────────────────────────

if (registry.version !== 2) {
  fail(`version must be 2, got ${registry.version}`);
} else {
  ok("version: 2");
}

// ── Global styles ─────────────────────────────────────────────────────────

if (!registry.styles || typeof registry.styles.global !== "string") {
  fail("missing styles.global path");
} else {
  checkFileExists(registry.styles.global, "styles.global");
  ok(`styles.global: ${registry.styles.global}`);
}

// ── Components ────────────────────────────────────────────────────────────

if (!registry.components || typeof registry.components !== "object") {
  fail("missing components object");
  process.exit(1);
}

const KNOWN_FRAMEWORKS = ["react", "vue", "svelte", "solid", "html"];

for (const [componentName, component] of Object.entries(registry.components)) {
  console.log(`\nComponent: ${componentName}`);

  if (component.name !== componentName) {
    fail(`name field "${component.name}" does not match key "${componentName}"`);
  } else {
    ok(`name: ${componentName}`);
  }

  for (const field of ["contract", "controller", "style"]) {
    if (typeof component[field] !== "string") {
      fail(`missing required field "${field}"`);
    } else {
      checkFileExists(component[field], field);
      ok(`${field}: ${component[field]}`);
    }
  }

  if (component.contractFiles !== undefined) {
    if (!Array.isArray(component.contractFiles)) {
      fail("contractFiles must be an array when present");
    } else {
      for (const filePath of component.contractFiles) {
        if (typeof filePath !== "string") {
          fail("contractFiles contains non-string entry");
          continue;
        }
        checkFileExists(filePath, "contractFiles");
      }
      ok(`contractFiles: ${component.contractFiles.length} file(s)`);
    }
  }

  if (component.adapter !== undefined) {
    if (!component.adapter || typeof component.adapter !== "object") {
      fail("adapter must be an object when present");
    } else {
      for (const [framework, files] of Object.entries(component.adapter)) {
        if (!KNOWN_FRAMEWORKS.includes(framework)) {
          fail(`adapter: unknown framework key "${framework}"`);
          continue;
        }
        if (!Array.isArray(files) || files.length === 0) {
          fail(`adapter.${framework} must be a non-empty array`);
          continue;
        }
        for (const filePath of files) {
          if (typeof filePath !== "string") {
            fail(`adapter.${framework} contains non-string entry`);
            continue;
          }
          checkFileExists(filePath, `adapter.${framework}`);
        }
        ok(`adapter.${framework}: ${files.length} file(s)`);
      }
    }
  }

  if (!component.files || typeof component.files !== "object") {
    fail("missing files object");
    continue;
  }

  for (const [framework, files] of Object.entries(component.files)) {
    if (!KNOWN_FRAMEWORKS.includes(framework)) {
      fail(`unknown framework key "${framework}" (expected: ${KNOWN_FRAMEWORKS.join(", ")})`);
      continue;
    }
    if (!Array.isArray(files) || files.length === 0) {
      fail(`files.${framework} must be a non-empty array`);
      continue;
    }
    for (const filePath of files) {
      if (typeof filePath !== "string") {
        fail(`files.${framework} contains non-string entry`);
        continue;
      }
      checkFileExists(filePath, `files.${framework}`);
    }
    ok(`files.${framework}: ${files.length} file(s)`);
  }

  // Validate exports metadata
  if (!component.exports || typeof component.exports !== "object") {
    fail(`missing exports object — add framework export names for CLI barrel generation`);
  } else {
    for (const [framework, names] of Object.entries(component.exports)) {
      if (!KNOWN_FRAMEWORKS.includes(framework)) {
        fail(`exports: unknown framework key "${framework}"`);
        continue;
      }
      if (!Array.isArray(names) || names.length === 0) {
        fail(`exports.${framework} must be a non-empty array of export names`);
        continue;
      }
      for (const name of names) {
        if (typeof name !== "string" || name.length === 0) {
          fail(`exports.${framework} contains invalid entry: ${JSON.stringify(name)}`);
        }
      }
      ok(`exports.${framework}: ${names.join(", ")}`);
    }

    // Warn if files has a framework that exports doesn't cover
    for (const framework of Object.keys(component.files)) {
      if (!(framework in component.exports)) {
        fail(`exports missing entry for framework "${framework}" (present in files)`);
      }
    }
  }
}

// ── Result ────────────────────────────────────────────────────────────────

console.log("");
if (errors > 0) {
  console.error(`Registry check failed with ${errors} error(s).`);
  process.exit(1);
} else {
  console.log("Registry OK.");
}
