#!/usr/bin/env node
// Maintainer-only refresh for generated public registry artifacts.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createArtifact } from "@bambiui/generator";
import { KNOWN_FRAMEWORKS, KNOWN_FRAMEWORK_SET } from "./frameworks.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const authoringPath = resolve(root, "registry.authoring.json");
const registryPath = resolve(root, "registry.json");

const authoring = JSON.parse(await readFile(authoringPath, "utf8"));
const publicRegistry = JSON.parse(await readFile(registryPath, "utf8"));

const globalForbiddenStrings = [
  "create-react-adapter",
  "create-react-part",
  "define-contract",
  "use-bambi-controller",
  "@bambiui/core",
  "@bambiui/generator",
  "@bambiui/adapters",
];

function assertSameFiles(actual, expected, context) {
  const sortedActual = [...(actual ?? [])].sort();
  const sortedExpected = [...(expected ?? [])].sort();

  if (sortedActual.join("\n") !== sortedExpected.join("\n")) {
    throw new Error(
      `${context} does not match public registry files.\nExpected:\n${sortedExpected.join("\n")}\nActual:\n${sortedActual.join("\n")}`,
    );
  }
}

function assertNoDuplicateBasenames(files, context) {
  const seen = new Map();
  for (const filePath of files) {
    const name = basename(filePath);
    const existing = seen.get(name);
    if (existing) {
      throw new Error(
        `${context}: duplicate generated basename "${name}".\n` +
        `  First:  ${existing}\n` +
        `  Second: ${filePath}`,
      );
    }
    seen.set(name, filePath);
  }
}

function forbiddenStringsFor(componentName) {
  return [
    ...globalForbiddenStrings,
    `${componentName}.contract`,
    `${componentName}.controller`,
  ];
}

function assertNoForbiddenStrings(content, filePath, componentName) {
  for (const forbidden of forbiddenStringsFor(componentName)) {
    if (content.includes(forbidden)) {
      throw new Error(`Generated artifact contains forbidden string "${forbidden}": ${filePath}`);
    }
  }
}

async function readExistingFile(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return undefined;
  }
}

async function writeGeneratedFile(filePath, content) {
  await mkdir(dirname(filePath), { recursive: true });
  const existing = await readExistingFile(filePath);
  if (existing === content) return false;
  await writeFile(filePath, content);
  return true;
}

function contractExportName(componentName) {
  return `${componentName.replace(/-([a-z0-9])/gu, (_match, char) => char.toUpperCase())}Contract`;
}

async function generateFramework(componentName, component, framework, publicComponent) {
  const generatedFiles = component.generatedFiles?.[framework] ?? [];

  // Non-CSS generated files: matched by basename to what the generator returns.
  const nonCssFiles = generatedFiles.filter((f) => !f.endsWith(".css"));
  if (nonCssFiles.length === 0) {
    throw new Error(`${componentName}/${framework} requires at least one non-CSS generated artifact.`);
  }
  assertNoDuplicateBasenames(nonCssFiles, `${componentName}/${framework}`);

  const contractSource = await readFile(resolve(root, component.contract), "utf8");
  const controllerSource = await readFile(resolve(root, component.controller), "utf8");
  const primitiveFiles = await Promise.all(
    (component.primitiveFiles ?? []).map((p) => readFile(resolve(root, p), "utf8")),
  );

  const { files, usedHelpers } = createArtifact({
    framework,
    contractSource,
    controllerSource,
    primitiveFiles,
    contractExportName: contractExportName(componentName),
    generatorOptions: component.generator?.[framework] ?? {},
  });

  const generatedNames = Object.keys(files).sort();
  const expectedNames = nonCssFiles.map((p) => basename(p)).sort();
  if (generatedNames.join("\n") !== expectedNames.join("\n")) {
    throw new Error(
      `${componentName}/${framework}: generator output must exactly match generatedFiles.\n` +
      `  Expected from manifest: ${expectedNames.join(", ")}\n` +
      `  Generated:              ${generatedNames.join(", ")}`,
    );
  }

  // Match each generated filename (key) to its full repo-relative path.
  for (const [fileName, content] of Object.entries(files)) {
    const fullPath = nonCssFiles.find((p) => basename(p) === fileName);
    if (!fullPath) {
      throw new Error(
        `${componentName}/${framework}: generator produced "${fileName}" but no matching path found in generatedFiles.\n` +
        `  generatedFiles (non-CSS): ${nonCssFiles.join(", ")}`,
      );
    }
    assertNoForbiddenStrings(content, fullPath, componentName);

    const changed = await writeGeneratedFile(resolve(root, fullPath), content);
    process.stdout.write(`${changed ? "generated" : "unchanged"} ${fullPath}\n`);
  }

  // Validate that registry.json's helpers[framework] matches what the generator detected.
  const declaredHelpers = [...(publicComponent.helpers?.[framework] ?? [])].sort().join(",");
  const detectedHelpers = [...usedHelpers].sort().join(",");
  if (declaredHelpers !== detectedHelpers) {
    throw new Error(
      `${componentName}/${framework}: helpers mismatch.\n` +
      `  registry.json declares: [${declaredHelpers || "(none)"}]\n` +
      `  generator detected:     [${detectedHelpers || "(none)"}]\n` +
      `  Set "helpers": { "${framework}": ${JSON.stringify(usedHelpers)} } in registry.json for "${componentName}".`,
    );
  }

  return usedHelpers;
}

for (const [componentName, component] of Object.entries(authoring.components ?? {})) {
  const publicComponent = publicRegistry.components?.[componentName];
  if (!publicComponent) {
    throw new Error(`Missing public registry component for "${componentName}".`);
  }

  for (const framework of Object.keys(component.generatedFiles ?? {})) {
    if (!KNOWN_FRAMEWORK_SET.has(framework)) {
      throw new Error(`${componentName}: unknown framework "${framework}". Expected one of: ${KNOWN_FRAMEWORKS.join(", ")}`);
    }
  }

  for (const [framework, files] of Object.entries(component.generatedFiles ?? {})) {
    assertSameFiles(files, publicComponent.files?.[framework], `${componentName}/${framework}`);
  }

  const componentUsedHelpers = new Set();
  for (const framework of KNOWN_FRAMEWORKS) {
    if (!component.generatedFiles?.[framework]) continue;
    const usedHelpers = await generateFramework(componentName, component, framework, publicComponent);
    for (const h of usedHelpers) componentUsedHelpers.add(h);
  }

  if (componentUsedHelpers.size > 0) {
    const shimPath = resolve(root, `packages/registry/generated/${componentName}/bambi-helpers.ts`);
    const shimContent = `// Workspace-only shim — not distributed. Satisfies the ../bambi-helpers import in all generated/${componentName}/{framework}/ files.\nexport * from "../shared/bambi-helpers";\n`;
    const shimChanged = await writeGeneratedFile(shimPath, shimContent);
    process.stdout.write(`${shimChanged ? "generated" : "unchanged"} packages/registry/generated/${componentName}/bambi-helpers.ts (workspace shim)\n`);
  }

  // Copy CSS from source to the single shared location (framework-agnostic).
  if (component.style && component.generatedCss) {
    const cssContent = await readFile(resolve(root, component.style), "utf8");
    assertNoForbiddenStrings(cssContent, component.generatedCss, componentName);
    const changed = await writeGeneratedFile(resolve(root, component.generatedCss), cssContent);
    process.stdout.write(`${changed ? "refreshed" : "unchanged"} ${component.generatedCss}\n`);
  }

  for (const [framework, files] of Object.entries(component.generatedFiles ?? {})) {
    for (const filePath of files) {
      const abs = resolve(root, filePath);
      if (!existsSync(abs)) {
        throw new Error(
          `Missing generated artifact for ${componentName}/${framework}: ${filePath}`,
        );
      }
    }
  }

  // Compute SHA-256 hashes for all public component files and write to registry.json.
  const componentHashes = {};
  for (const [framework, files] of Object.entries(component.generatedFiles ?? {})) {
    componentHashes[framework] = {};
    for (const filePath of files) {
      const fileContent = await readFile(resolve(root, filePath), "utf8");
      componentHashes[framework][filePath] = createHash("sha256").update(fileContent).digest("hex");
    }
  }
  if (Object.keys(componentHashes).length > 0) {
    publicRegistry.components[componentName].hashes = componentHashes;
  }

  // Compute SHA-256 hash for the shared component CSS and write to registry.json.
  if (component.generatedCss) {
    const abs = resolve(root, component.generatedCss);
    if (existsSync(abs)) {
      const cssContent = await readFile(abs, "utf8");
      publicRegistry.components[componentName].css = component.generatedCss;
      publicRegistry.components[componentName].cssHash = createHash("sha256").update(cssContent).digest("hex");
    }
  }
}

// Compute SHA-256 hash for the global style file and write to registry.json.
const globalStylePath = publicRegistry.styles?.global;
if (globalStylePath) {
  const abs = resolve(root, globalStylePath);
  if (existsSync(abs)) {
    const content = await readFile(abs, "utf8");
    publicRegistry.styles.globalHash = createHash("sha256").update(content).digest("hex");
  }
}

// Compute SHA-256 hash for the shared helper file and write to registry.json.
if (publicRegistry.shared && typeof publicRegistry.shared === "string") {
  const abs = resolve(root, publicRegistry.shared);
  if (existsSync(abs)) {
    const content = await readFile(abs, "utf8");
    publicRegistry.sharedHash = createHash("sha256").update(content).digest("hex");
  }
}

await writeFile(registryPath, `${JSON.stringify(publicRegistry, null, 2)}\n`);
process.stdout.write("Updated registry.json with file hashes.\n");

await new Promise((resolvePromise, reject) => {
  const child = spawn(process.execPath, ["scripts/check-registry.mjs"], {
    cwd: root,
    stdio: "inherit",
  });

  child.on("close", (code) => {
    if (code === 0) resolvePromise();
    else reject(new Error(`registry check failed with exit code ${code}`));
  });
});
