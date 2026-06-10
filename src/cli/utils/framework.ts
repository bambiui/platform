import { existsSync } from "node:fs";
import path from "node:path";
import { normalizeRelativePath, readJson } from "./files";
import { didYouMean } from "./suggest";

export const DEFAULT_OUT_DIR = "generated";
export const DEFAULT_STYLE_FILE = "generated/styles/index.css";

export const frameworkOptions = [
  "vanilla",
  "react",
  "solid",
  "svelte",
  "vue",
] as const;
export type CliFramework = (typeof frameworkOptions)[number];

export interface BambiConfig {
  framework: CliFramework;
  outDir: string;
  styleFile: string;
}

const knownFrameworks = new Set<string>(frameworkOptions);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function assertSupportedFramework(
  framework: string,
): asserts framework is CliFramework {
  if (knownFrameworks.has(framework)) return;

  throw new Error(
    `Unknown framework "${framework}".${didYouMean(framework, frameworkOptions)} Supported frameworks: ${frameworkOptions.join(", ")}.`,
  );
}

export function createDefaultConfig(
  framework: string,
  overrides: Partial<Record<"outDir" | "styleFile", string>> = {},
): BambiConfig {
  assertSupportedFramework(framework);

  return {
    framework,
    outDir: normalizeRelativePath(overrides.outDir ?? DEFAULT_OUT_DIR),
    styleFile: normalizeRelativePath(overrides.styleFile ?? DEFAULT_STYLE_FILE),
  };
}

export async function detectFramework(cwd: string): Promise<CliFramework> {
  const packageJson = await readJson(path.join(cwd, "package.json"));
  const deps = isRecord(packageJson)
    ? {
        ...(isRecord(packageJson.dependencies) ? packageJson.dependencies : {}),
        ...(isRecord(packageJson.devDependencies)
          ? packageJson.devDependencies
          : {}),
      }
    : {};

  if (
    "solid-js" in deps ||
    (existsSync(path.join(cwd, "vite.config.ts")) &&
      "vite-plugin-solid" in deps)
  ) {
    return "solid";
  }

  if (
    "svelte" in deps ||
    "@sveltejs/kit" in deps ||
    existsSync(path.join(cwd, "svelte.config.js")) ||
    existsSync(path.join(cwd, "svelte.config.ts"))
  ) {
    return "svelte";
  }

  if (
    "vue" in deps ||
    "nuxt" in deps ||
    existsSync(path.join(cwd, "nuxt.config.js")) ||
    existsSync(path.join(cwd, "nuxt.config.ts"))
  ) {
    return "vue";
  }

  if (
    "react" in deps ||
    "next" in deps ||
    existsSync(path.join(cwd, "next.config.js")) ||
    existsSync(path.join(cwd, "next.config.mjs")) ||
    existsSync(path.join(cwd, "next.config.ts"))
  ) {
    return "react";
  }

  return "vanilla";
}

export async function readConfig(cwd: string): Promise<Partial<BambiConfig>> {
  const config = await readJson(path.join(cwd, "bambi.config.json"));

  if (!isRecord(config)) return {};

  return {
    framework: asString(config.framework) as CliFramework | undefined,
    outDir: asString(config.outDir),
    styleFile: asString(config.styleFile),
  };
}

export async function getConfig(
  cwd: string,
  flags: Partial<Record<"framework" | "outDir" | "styleFile", string>> = {},
): Promise<BambiConfig> {
  const detectedFramework = flags.framework ?? (await detectFramework(cwd));
  const defaults = createDefaultConfig(detectedFramework, flags);
  const config = await readConfig(cwd);
  const framework = flags.framework ?? config.framework ?? defaults.framework;

  assertSupportedFramework(framework);

  return {
    framework,
    outDir: normalizeRelativePath(
      flags.outDir ?? config.outDir ?? defaults.outDir,
    ),
    styleFile: normalizeRelativePath(
      flags.styleFile ?? config.styleFile ?? defaults.styleFile,
    ),
  };
}
