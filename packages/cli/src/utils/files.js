import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const colors = {
  blue: "\x1b[34m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  reset: "\x1b[0m",
  yellow: "\x1b[33m",
};

/**
 * @param {string} value
 * @param {keyof typeof colors} tone
 */
export function color(value, tone) {
  return `${colors[tone]}${value}${colors.reset}`;
}

/**
 * @param {string} filePath
 */
export async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return undefined;
  }
}

/**
 * @param {string} value
 */
export function normalizeRelativePath(value) {
  const normalized = value
    .trim()
    .replaceAll("\\", "/")
    .replace(/^\.\/+/, "");

  if (!normalized) {
    throw new Error("Expected a non-empty relative path.");
  }

  if (path.isAbsolute(normalized) || normalized.split("/").includes("..")) {
    throw new Error(`Path must stay inside the target project: ${value}`);
  }

  return normalized.replace(/\/+$/g, "");
}

/**
 * @param {string} filePath
 * @param {boolean} force
 */
export function getExistingFileResult(filePath, force) {
  if (!existsSync(filePath) || force) {
    return undefined;
  }

  return {
    path: filePath,
    reason: "exists",
    skipped: true,
    status: "skipped",
  };
}

/**
 * @param {string} filePath
 * @param {string} content
 * @param {boolean} force
 */
export async function writeProjectFile(filePath, content, force) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const exists = existsSync(filePath);

  const existing = getExistingFileResult(filePath, force);
  if (existing) {
    return existing;
  }

  await writeFile(filePath, content);
  return {
    path: filePath,
    skipped: false,
    status: exists ? "updated" : "created",
  };
}

/**
 * @param {Array<{ skipped: boolean, path: string, reason?: string, status?: string }>} results
 */
export function printResults(results) {
  let skippedExisting = false;

  for (const result of results) {
    const label = result.status ?? (result.skipped ? "skipped" : "created");
    skippedExisting ||= result.reason === "exists";
    process.stdout.write(
      `  ${label} ${path.relative(process.cwd(), result.path)}\n`,
    );
  }

  if (skippedExisting) {
    process.stdout.write("  Tip: use --force to overwrite skipped files.\n");
  }
}

/**
 * @param {string} fileName
 */
export function moduleSpecifier(fileName) {
  const parsed = path.parse(fileName);
  return `./${parsed.name}`;
}

