#!/usr/bin/env node
// Verifies package import boundaries for the active core -> generator -> registry -> cli flow.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const packagesRoot = resolve(root, "packages");
const packageNames = ["core", "generator", "registry", "cli"];
const checkedExtensions = new Set([".js", ".mjs", ".ts", ".tsx", ".vue", ".svelte"]);

const allowedPackageImports = {
  core: new Set(["@bambiui/core"]),
  generator: new Set([]),
  registry: new Set(["@bambiui/core", "@bambiui/registry"]),
  cli: new Set([]),
};

let errors = 0;

function fail(message) {
  console.error(`  x ${message}`);
  errors++;
}

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(fullPath));
    else if (entry.isFile() && checkedExtensions.has(extname(entry.name))) files.push(fullPath);
  }
  return files;
}

function packageForPath(filePath) {
  const rel = relative(packagesRoot, filePath).replaceAll("\\", "/");
  return rel.split("/")[0];
}

function staticSpecifiers(source) {
  const codeOnly = source.replace(/`(?:\\[\s\S]|[^`])*`/gu, '""');
  const specifiers = [];
  const patterns = [
    /\bimport\s+(?:[^"'()]+?\s+from\s+)?["']([^"']+)["']/gu,
    /\bexport\s+(?:[^"']+?\s+from\s+)?["']([^"']+)["']/gu,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/gu,
  ];

  for (const pattern of patterns) {
    for (const match of codeOnly.matchAll(pattern)) {
      specifiers.push(match[1]);
    }
  }

  return specifiers;
}

function resolveRelativePackage(fromFile, specifier) {
  if (!specifier.startsWith(".")) return undefined;
  const resolved = resolve(join(fromFile, ".."), specifier);
  if (!resolved.startsWith(`${packagesRoot}/`)) return undefined;
  return packageForPath(resolved);
}

console.log("Checking package boundaries...\n");

for (const packageName of packageNames) {
  const packageDir = resolve(packagesRoot, packageName);
  for (const filePath of walk(packageDir)) {
    const relFile = relative(root, filePath).replaceAll("\\", "/");
    const source = readFileSync(filePath, "utf8");

    for (const specifier of staticSpecifiers(source)) {
      if (specifier.startsWith("@bambiui/")) {
        const importedPackage = specifier.split("/").slice(0, 2).join("/");
        if (!allowedPackageImports[packageName].has(importedPackage)) {
          fail(`${relFile}: ${packageName} must not import ${importedPackage}`);
        }
      }

      const targetPackage = resolveRelativePackage(filePath, specifier);
      if (targetPackage && targetPackage !== packageName) {
        fail(`${relFile}: relative import crosses package boundary into packages/${targetPackage}`);
      }
    }
  }
}

if (errors > 0) {
  console.error(`\nPackage boundary check failed with ${errors} error(s).`);
  process.exit(1);
}

console.log("Package boundaries OK.");
