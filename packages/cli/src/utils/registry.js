import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { writeProjectFile } from "./files.js";

export const DEFAULT_REGISTRY_URL =
  "https://raw.githubusercontent.com/bambiui/platform/main";

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
    const response = await fetch(fileUrl);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${fileUrl}: ${response.status} ${response.statusText}`,
      );
    }

    return response.text();
  }

  return readFile(fileURLToPath(fileUrl), "utf8");
}

/**
 * @param {string} registryUrl
 */
export async function readRegistryManifest(registryUrl) {
  const content = await readRegistryFile(registryUrl, DEFAULT_MANIFEST_PATH);
  return JSON.parse(content);
}

/**
 * @param {string} registryUrl
 * @param {string} from
 * @param {string} to
 * @param {boolean} force
 * @param {(content: string) => string} [transform]
 */
export async function copyRegistryFile(registryUrl, from, to, force, transform) {
  const content = await readRegistryFile(registryUrl, from);
  return writeProjectFile(to, transform ? transform(content) : content, force);
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
      `Unknown component "${componentName}". Available: ${available}`,
    );
  }

  return component;
}

/**
 * @param {{ tokens?: { css?: string } }} manifest
 */
export function getTokensPath(manifest) {
  return manifest.tokens?.css ?? "packages/tokens/src/tokens.css";
}
