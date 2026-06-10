import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const colors = {
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  reset: "\x1b[0m",
  yellow: "\x1b[33m",
};

export interface WriteResult {
  path: string;
  reason?: string;
  skipped: boolean;
  status: "created" | "updated" | "skipped";
}

export function color(value: string, tone: keyof typeof colors): string {
  return `${colors[tone]}${value}${colors.reset}`;
}

export async function readJson(filePath: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return undefined;
  }
}

export function normalizeRelativePath(value: string): string {
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

export async function writeProjectFile(
  filePath: string,
  content: string,
  force: boolean,
): Promise<WriteResult> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const exists = existsSync(filePath);

  if (exists && !force) {
    return {
      path: filePath,
      reason: "exists",
      skipped: true,
      status: "skipped",
    };
  }

  await writeFile(filePath, content);

  return {
    path: filePath,
    skipped: false,
    status: exists ? "updated" : "created",
  };
}

export function printResults(results: WriteResult[]): void {
  let skippedExisting = false;

  for (const result of results) {
    skippedExisting ||= result.reason === "exists";
    process.stdout.write(
      `  ${result.status} ${path.relative(process.cwd(), result.path)}\n`,
    );
  }

  if (skippedExisting) {
    process.stdout.write("  Tip: use --force to overwrite skipped files.\n");
  }
}
