#!/usr/bin/env node
// Maintainer-only refresh for generated public registry artifacts.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createArtifact } from "@bambiui/generator";

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

  for (const [framework, files] of Object.entries(component.generatedFiles ?? {})) {
    assertSameFiles(files, publicComponent.files?.[framework], `${componentName}/${framework}`);
  }

  const componentUsedHelpers = new Set();
  for (const framework of Object.keys(component.generatedFiles ?? {})) {
    const usedHelpers = await generateFramework(componentName, component, framework, publicComponent);
    for (const h of usedHelpers) componentUsedHelpers.add(h);
  }

  if (componentUsedHelpers.size > 0) {
    const shimPath = resolve(root, `packages/registry/generated/${componentName}/bambi-helpers.ts`);
    const shimContent = `// Workspace-only shim — not distributed. Satisfies the ../bambi-helpers import in all generated/${componentName}/{framework}/ files.\nexport * from "../shared/react/bambi-helpers";\n`;
    const shimChanged = await writeGeneratedFile(shimPath, shimContent);
    process.stdout.write(`${shimChanged ? "generated" : "unchanged"} packages/registry/generated/${componentName}/bambi-helpers.ts (workspace shim)\n`);
  }

  // Copy CSS from source to all framework output directories (before existence check).
  for (const [, files] of Object.entries(component.generatedFiles ?? {})) {
    const generatedCss = files.find((filePath) => filePath.endsWith(".css"));
    if (component.style && generatedCss) {
      const cssContent = await readFile(resolve(root, component.style), "utf8");
      assertNoForbiddenStrings(cssContent, generatedCss, componentName);
      const changed = await writeGeneratedFile(resolve(root, generatedCss), cssContent);
      process.stdout.write(`${changed ? "refreshed" : "unchanged"} ${generatedCss}\n`);
    }
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
}

// Compute SHA-256 hashes for shared helper files and write to registry.json.
if (publicRegistry.shared && typeof publicRegistry.shared === "object") {
  const sharedHashes = {};
  for (const [framework, sharedPath] of Object.entries(publicRegistry.shared)) {
    const abs = resolve(root, sharedPath);
    if (existsSync(abs)) {
      const content = await readFile(abs, "utf8");
      sharedHashes[framework] = createHash("sha256").update(content).digest("hex");
    }
  }
  if (Object.keys(sharedHashes).length > 0) {
    publicRegistry.sharedHashes = sharedHashes;
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
