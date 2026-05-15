import { readFile, copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const wwwDir = path.join(repoRoot, "apps/www");
const distDir = path.join(wwwDir, "dist");
const registryJsonSrc = path.join(repoRoot, "registry.json");
const registrySchemaSrc = path.join(repoRoot, "registry.schema.json");

async function run(command, cwd) {
  const child = spawn(command[0], command.slice(1), { cwd, stdio: "inherit" });
  const code = await new Promise((resolve) => { child.on("close", resolve); });
  if (code !== 0) throw new Error(`Command failed: ${command.join(" ")}`);
}

process.stdout.write("Building apps/www...\n");
await run(["pnpm", "build"], wwwDir);

process.stdout.write("Injecting registry into dist...\n");
const manifest = JSON.parse(await readFile(registryJsonSrc, "utf8"));

await copyFile(registryJsonSrc, path.join(distDir, "registry.json"));
await copyFile(registrySchemaSrc, path.join(distDir, "registry.schema.json"));

const filePaths = new Set();
if (manifest.styles?.global) filePaths.add(manifest.styles.global);
for (const component of Object.values(manifest.components ?? {})) {
  if (component.contract) filePaths.add(component.contract);
  for (const file of component.contractFiles ?? []) filePaths.add(file);
  if (component.controller) filePaths.add(component.controller);
  if (component.style) filePaths.add(component.style);
  for (const file of component.primitiveFiles ?? []) filePaths.add(file);
  for (const files of Object.values(component.adapter ?? {})) {
    for (const file of files) filePaths.add(file);
  }
  for (const files of Object.values(component.files ?? {})) {
    for (const file of files) filePaths.add(file);
  }
}

for (const filePath of filePaths) {
  const src = path.join(repoRoot, filePath);
  const dest = path.join(distDir, filePath);
  await mkdir(path.dirname(dest), { recursive: true });
  await copyFile(src, dest);
}

process.stdout.write(`Registry injected: ${filePaths.size + 2} files → dist/\n`);
process.stdout.write("Static build complete.\n");
