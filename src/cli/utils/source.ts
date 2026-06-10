import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cliDir = path.dirname(fileURLToPath(import.meta.url));
const sourceRootCandidates = [
  path.resolve(cliDir, "../src"),
  path.resolve(cliDir, "../.."),
];

let cachedSourceRoot: string | undefined;

function findSourceRoot(): string {
  if (cachedSourceRoot) return cachedSourceRoot;

  const sourceRoot = sourceRootCandidates.find((candidate) =>
    existsSync(path.join(candidate, "core")),
  );

  if (!sourceRoot) {
    throw new Error("Could not locate bambi source files for CLI install.");
  }

  cachedSourceRoot = sourceRoot;
  return sourceRoot;
}

export function resolveLocalSource(source: string): string {
  if (path.isAbsolute(source) || source.split("/").includes("..")) {
    throw new Error(`Unsafe source path "${source}".`);
  }

  return readFileSync(path.join(findSourceRoot(), source), "utf8");
}
