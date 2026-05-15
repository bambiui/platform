#!/usr/bin/env node
// Maintainer-only refresh for generated public registry artifacts.

import { copyFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const authoringPath = resolve(root, "registry.authoring.json");

const authoring = JSON.parse(await readFile(authoringPath, "utf8"));

for (const [componentName, component] of Object.entries(authoring.components ?? {})) {
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

  const reactGenerated = component.generatedFiles?.react ?? [];
  const generatedCss = reactGenerated.find((filePath) => filePath.endsWith(".css"));
  if (component.style && generatedCss) {
    await copyFile(resolve(root, component.style), resolve(root, generatedCss));
    process.stdout.write(`refreshed ${generatedCss}\n`);
  }
}

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
