import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const DEFAULT_REGISTRY_URL = "https://bambiui.com";
export const DEFAULT_REGISTRY_MANIFEST = "registry.json";

export interface RegistryFileEntry {
  path: string;
  hash: string;
  size: number;
}

export interface RemoteRegistryManifest {
  version: 1;
  name: string;
  source: string;
  components: string[];
  frameworks: string[];
  entrypoints: {
    manifest: string;
    generated: string;
  };
  files: RegistryFileEntry[];
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/g, "");
}

function assertSafeRegistryPath(registryPath: string): void {
  if (
    path.isAbsolute(registryPath) ||
    registryPath.split("/").includes("..") ||
    registryPath.startsWith(".")
  ) {
    throw new Error(`Unsafe registry path "${registryPath}".`);
  }
}

export function getRegistryUrl(flags: { registryUrl?: string }): string {
  return flags.registryUrl ?? process.env.BAMBI_REGISTRY_URL ?? DEFAULT_REGISTRY_URL;
}

export function getRegistryFileUrl(
  registryUrl: string,
  registryPath: string,
): string | URL {
  assertSafeRegistryPath(registryPath);

  if (registryUrl.startsWith("http://") || registryUrl.startsWith("https://")) {
    return new URL(registryPath, `${trimTrailingSlash(registryUrl)}/`).href;
  }

  if (registryUrl.startsWith("file://")) {
    return new URL(registryPath, `${trimTrailingSlash(registryUrl)}/`);
  }

  return pathToFileURL(path.resolve(process.cwd(), registryUrl, registryPath));
}

export async function readRegistryFile(
  registryUrl: string,
  registryPath: string,
): Promise<string> {
  const fileUrl = getRegistryFileUrl(registryUrl, registryPath);

  if (typeof fileUrl === "string") {
    let response: Response;

    try {
      response = await fetch(fileUrl);
    } catch (error) {
      throw new Error(
        `Failed to fetch ${fileUrl}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${fileUrl}: ${response.status} ${response.statusText}`,
      );
    }

    return response.text();
  }

  try {
    return await readFile(fileURLToPath(fileUrl), "utf8");
  } catch (error) {
    throw new Error(
      `Failed to read ${fileURLToPath(fileUrl)}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function validateManifest(value: unknown): asserts value is RemoteRegistryManifest {
  if (!isRecord(value)) {
    throw new Error("Invalid registry manifest: expected an object.");
  }

  if (value.version !== 1) {
    throw new Error(
      `Unsupported registry version ${String(value.version)}. Expected version 1.`,
    );
  }

  if (value.name !== "bambiui") {
    throw new Error("Invalid registry manifest: expected name to be bambiui.");
  }

  if (!Array.isArray(value.components) || !Array.isArray(value.frameworks)) {
    throw new Error(
      "Invalid registry manifest: expected components and frameworks arrays.",
    );
  }

  if (!isRecord(value.entrypoints) || typeof value.entrypoints.generated !== "string") {
    throw new Error("Invalid registry manifest: missing entrypoints.generated.");
  }

  if (!Array.isArray(value.files)) {
    throw new Error("Invalid registry manifest: missing files array.");
  }

  for (const file of value.files) {
    if (!isRecord(file)) {
      throw new Error("Invalid registry manifest: file entries must be objects.");
    }

    if (
      typeof file.path !== "string" ||
      typeof file.hash !== "string" ||
      typeof file.size !== "number"
    ) {
      throw new Error(
        "Invalid registry manifest: file entries require path, hash, and size.",
      );
    }
  }
}

export async function readRegistryManifest(
  registryUrl: string,
): Promise<RemoteRegistryManifest> {
  const content = await readRegistryFile(registryUrl, DEFAULT_REGISTRY_MANIFEST);
  let manifest: unknown;

  try {
    manifest = JSON.parse(content);
  } catch (error) {
    throw new Error(
      `Invalid registry manifest at ${DEFAULT_REGISTRY_MANIFEST}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  validateManifest(manifest);
  return manifest;
}

export function createRegistryFileIndex(
  manifest: RemoteRegistryManifest,
): Map<string, RegistryFileEntry> {
  return new Map(manifest.files.map((file) => [file.path, file]));
}

export function verifyRegistryFile(
  registryPath: string,
  content: string,
  expected?: RegistryFileEntry,
): void {
  if (!expected) {
    throw new Error(`Registry manifest does not include "${registryPath}".`);
  }

  const actualHash = createHash("sha256").update(content).digest("hex");
  if (actualHash !== expected.hash) {
    throw new Error(
      `Integrity check failed for "${registryPath}".\n  Expected: ${expected.hash}\n  Received: ${actualHash}`,
    );
  }

  const actualSize = Buffer.byteLength(content);
  if (actualSize !== expected.size) {
    throw new Error(
      `Size check failed for "${registryPath}".\n  Expected: ${expected.size}\n  Received: ${actualSize}`,
    );
  }
}
