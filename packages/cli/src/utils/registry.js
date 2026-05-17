import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { getExistingFileResult, writeProjectFile } from "./files.js";

export const DEFAULT_REGISTRY_URL =
  "https://bambiui.com";

export const DEFAULT_MANIFEST_PATH = "registry.json";

/**
 * @param {Record<string, string | undefined>} flags
 */
export function getRegistryUrl(flags) {
  return flags.registryUrl ?? DEFAULT_REGISTRY_URL;
}

/**
 * @param {string} registryUrl
 * @param {string} registryPath
 */
export function getRegistryFileUrl(registryUrl, registryPath) {
  if (registryUrl.startsWith("http://") || registryUrl.startsWith("https://")) {
    return new URL(registryPath, `${registryUrl.replace(/\/$/, "")}/`).href;
  }

  if (registryUrl.startsWith("file://")) {
    return new URL(registryPath, `${registryUrl.replace(/\/$/, "")}/`);
  }

  return pathToFileURL(path.resolve(process.cwd(), registryUrl, registryPath));
}

/**
 * @param {string} registryUrl
 * @param {string} registryPath
 */
export async function readRegistryFile(registryUrl, registryPath) {
  const fileUrl = getRegistryFileUrl(registryUrl, registryPath);

  if (typeof fileUrl === "string") {
    let response;

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

const SHA256_RE = /^[a-f0-9]{64}$/;

/**
 * Minimal runtime validation of a parsed registry manifest.
 * Hash fields are format-checked when present but not required, to preserve
 * compatibility with external registries that may omit them. The production
 * bambiui registry always includes all hash fields.
 * @param {unknown} manifest
 */
function validateManifest(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error("Invalid registry manifest: expected a JSON object.");
  }

  const m = /** @type {Record<string, unknown>} */ (manifest);

  if (!m.styles || typeof m.styles !== "object" || Array.isArray(m.styles)) {
    throw new Error("Invalid registry manifest: missing or invalid 'styles' object.");
  }
  const styles = /** @type {Record<string, unknown>} */ (m.styles);
  if (typeof styles.global !== "string" || styles.global.length === 0) {
    throw new Error("Invalid registry manifest: 'styles.global' must be a non-empty string.");
  }
  if (styles.globalHash !== undefined && !SHA256_RE.test(String(styles.globalHash))) {
    throw new Error("Invalid registry manifest: 'styles.globalHash' must be a 64-character lowercase hex string.");
  }

  if (m.sharedHash !== undefined && !SHA256_RE.test(String(m.sharedHash))) {
    throw new Error("Invalid registry manifest: 'sharedHash' must be a 64-character lowercase hex string.");
  }

  if (!m.components || typeof m.components !== "object" || Array.isArray(m.components)) {
    throw new Error("Invalid registry manifest: missing or invalid 'components' object.");
  }

  for (const [name, component] of Object.entries(/** @type {Record<string, unknown>} */ (m.components))) {
    if (!component || typeof component !== "object" || Array.isArray(component)) {
      throw new Error(`Invalid registry manifest: component "${name}" must be an object.`);
    }
    const c = /** @type {Record<string, unknown>} */ (component);

    if (!c.files || typeof c.files !== "object" || Array.isArray(c.files)) {
      throw new Error(`Invalid registry manifest: component "${name}" missing or invalid 'files' object.`);
    }

    if (c.cssHash !== undefined && !SHA256_RE.test(String(c.cssHash))) {
      throw new Error(`Invalid registry manifest: component "${name}.cssHash" must be a 64-character lowercase hex string.`);
    }

    if (c.hashes !== undefined) {
      if (typeof c.hashes !== "object" || Array.isArray(c.hashes)) {
        throw new Error(`Invalid registry manifest: component "${name}.hashes" must be an object.`);
      }
      for (const [framework, frameworkHashes] of Object.entries(/** @type {Record<string, unknown>} */ (c.hashes))) {
        if (!frameworkHashes || typeof frameworkHashes !== "object" || Array.isArray(frameworkHashes)) {
          throw new Error(`Invalid registry manifest: component "${name}.hashes.${framework}" must be an object.`);
        }
        for (const [filePath, hash] of Object.entries(/** @type {Record<string, unknown>} */ (frameworkHashes))) {
          if (!SHA256_RE.test(String(hash))) {
            throw new Error(`Invalid registry manifest: hash for "${name}/${framework}/${filePath}" must be a 64-character lowercase hex string.`);
          }
        }
      }
    }
  }
}

/**
 * @param {string} registryUrl
 */
export async function readRegistryManifest(registryUrl) {
  const content = await readRegistryFile(registryUrl, DEFAULT_MANIFEST_PATH);

  let manifest;
  try {
    manifest = JSON.parse(content);
  } catch (error) {
    throw new Error(
      `Invalid registry manifest at ${DEFAULT_MANIFEST_PATH}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (manifest.version !== 2) {
    throw new Error(
      `Unsupported registry version ${manifest.version}. Expected version 2.`,
    );
  }

  validateManifest(manifest);

  return manifest;
}

/**
 * @param {string} registryUrl
 * @param {string} from
 * @param {string} to
 * @param {boolean} force
 * @param {{ expectedHash?: string, transform?: (content: string) => string }} [options]
 */
export async function copyRegistryFile(registryUrl, from, to, force, options = {}) {
  const existing = getExistingFileResult(to, force);
  if (existing) {
    return existing;
  }

  const content = await readRegistryFile(registryUrl, from);

  if (options.expectedHash) {
    const actual = createHash("sha256").update(content).digest("hex");
    if (actual !== options.expectedHash) {
      throw new Error(
        `Integrity check failed for "${from}".\n  Expected: ${options.expectedHash}\n  Received: ${actual}`,
      );
    }
  }

  return writeProjectFile(to, options.transform ? options.transform(content) : content, force);
}

/**
 * @param {{ components?: Record<string, unknown> }} manifest
 * @param {string} componentName
 */
export function getRegistryComponent(manifest, componentName) {
  const component = manifest.components?.[componentName];

  if (!component) {
    const available = Object.keys(manifest.components ?? {}).join(", ");
    throw new Error(
      `Unknown component "${componentName}". Available: ${available || "none"}`,
    );
  }

  return component;
}

/**
 * @param {{ styles?: { global?: string } }} manifest
 */
export function getStylePath(manifest) {
  return manifest.styles?.global ?? "packages/registry/src/styles/bambi.css";
}
