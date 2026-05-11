import { copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(repoRoot, "apps/www/dist");
const registryPath = path.join(repoRoot, "registry.json");
const schemaPath = path.join(repoRoot, "registry.schema.json");
const registry = JSON.parse(await readFile(registryPath, "utf8"));

/**
 * @param {string} sourcePath
 */
async function copyIntoDist(sourcePath) {
  const from = path.join(repoRoot, sourcePath);
  const to = path.join(distRoot, sourcePath);

  await mkdir(path.dirname(to), { recursive: true });
  await copyFile(from, to);
}

await copyIntoDist("registry.json");
await copyIntoDist("registry.schema.json");

const files = [registry.tokens?.css];

for (const component of Object.values(registry.components ?? {})) {
  const entry = /** @type {{ style?: { from?: string }, shared?: Array<{ from?: string }>, files?: Record<string, Array<{ from?: string }>> }} */ (component);
  files.push(entry.style?.from);

  for (const file of entry.shared ?? []) {
    files.push(file.from);
  }

  for (const frameworkFiles of Object.values(entry.files ?? {})) {
    for (const file of frameworkFiles) {
      files.push(file.from);
    }
  }
}

for (const file of files.filter(Boolean)) {
  await copyIntoDist(/** @type {string} */ (file));
}

process.stdout.write("Registry assets copied into apps/www/dist.\n");
