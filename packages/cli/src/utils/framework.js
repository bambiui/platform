import { existsSync } from "node:fs";
import path from "node:path";
import { moduleSpecifier, normalizeRelativePath, readJson } from "./files.js";

export const DEFAULT_COMPONENT_DIR = "src/components/ui";
export const DEFAULT_TOKENS_FILE = "src/styles/bambi.css";

export const frameworkFiles = {
  astro: ["astro.config.mjs", "astro.config.ts"],
  svelte: ["svelte.config.js", "svelte.config.ts"],
  vue: ["nuxt.config.ts", "nuxt.config.js"],
  react: ["next.config.js", "next.config.mjs", "next.config.ts"],
};

export const frameworkOptions = ["react", "svelte", "vue", "astro"];

/**
 * @param {string} framework
 */
export function assertSupportedFramework(framework) {
  if (!frameworkOptions.includes(framework)) {
    throw new Error(
      `Unknown framework "${framework}". Use ${frameworkOptions.join(", ")}.`,
    );
  }
}

/**
 * @param {string} framework
 * @param {Record<string, string | undefined>} [overrides]
 */
export function createDefaultConfig(framework, overrides = {}) {
  assertSupportedFramework(framework);

  return {
    framework,
    componentDir: normalizeRelativePath(
      overrides.componentDir ?? DEFAULT_COMPONENT_DIR,
    ),
    tokensFile: normalizeRelativePath(
      overrides.tokensFile ?? overrides.styleFile ?? DEFAULT_TOKENS_FILE,
    ),
  };
}

/**
 * @param {Record<string, string | undefined>} config
 * @param {{ framework: string, componentDir: string, tokensFile: string }} defaults
 * @param {Record<string, string | undefined>} [flags]
 */
export function mergeConfig(config, defaults, flags = {}) {
  const framework = flags.framework ?? config.framework ?? defaults.framework;
  assertSupportedFramework(framework);

  return {
    framework,
    componentDir: normalizeRelativePath(
      flags.componentDir ?? config.componentDir ?? defaults.componentDir,
    ),
    tokensFile: normalizeRelativePath(
      flags.tokensFile ??
        flags.styleFile ??
        config.tokensFile ??
        config.styleFile ??
        defaults.tokensFile,
    ),
  };
}

/**
 * @param {string} cwd
 */
export async function detectFramework(cwd) {
  const packageJson = await readJson(path.join(cwd, "package.json"));
  const deps = {
    ...packageJson?.dependencies,
    ...packageJson?.devDependencies,
  };

  for (const framework of ["astro", "svelte", "vue", "react"]) {
    if (deps[framework] || deps[`@${framework}js/kit`]) {
      return framework;
    }
  }

  for (const [framework, files] of Object.entries(frameworkFiles)) {
    if (files.some((file) => existsSync(path.join(cwd, file)))) {
      return framework;
    }
  }

  return "react";
}

/**
 * @param {string} cwd
 */
export async function readConfig(cwd) {
  const config = await readJson(path.join(cwd, "bambiui.config.json"));
  return config ?? {};
}

/**
 * @param {string} cwd
 * @param {Record<string, string | undefined>} [flags]
 */
export async function getConfig(cwd, flags = {}) {
  const detectedFramework = flags.framework ?? (await detectFramework(cwd));
  const defaults = createDefaultConfig(detectedFramework, flags);
  const config = await readConfig(cwd);

  return mergeConfig(config, defaults, flags);
}

/**
 * @param {string} framework
 * @param {string} exportName
 * @param {Record<string, string>} fileNames
 * @param {string[]} typeExports
 */
export function getIndexContent(framework, exportName, fileNames, typeExports) {
  const typeExportList = typeExports.join(", ");

  if (framework === "react") {
    const componentModule = moduleSpecifier(fileNames[framework]);
    const typeLine = typeExportList
      ? `export type { ${typeExportList} } from "${componentModule}";\n`
      : "";

    return `export { ${exportName} } from "${componentModule}";\n${typeLine}`;
  }

  const typeLine = typeExportList
    ? `export type { ${typeExportList} } from "${moduleSpecifier(fileNames.types)}";\n`
    : "";

  return `export { default as ${exportName} } from "${componentSpecifier(framework, fileNames[framework])}";\n${typeLine}`;
}

/**
 * @param {string} framework
 * @param {string} fileName
 */
function componentSpecifier(framework, fileName) {
  if (["astro", "svelte", "vue"].includes(framework)) {
    return `./${fileName}`;
  }

  return moduleSpecifier(fileName);
}

/**
 * @param {string} framework
 */
export function getFrameworkSupportFiles(framework) {
  if (framework === "svelte") {
    return [
      {
        fileName: "svelte.d.ts",
        content: `declare module "*.svelte" {
  import type { Component } from "svelte";

  const component: Component<Record<string, unknown>>;
  export default component;
}
`,
      },
    ];
  }

  return [];
}
