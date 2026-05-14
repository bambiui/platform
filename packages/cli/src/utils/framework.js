import { existsSync } from "node:fs";
import path from "node:path";
import { normalizeRelativePath, readJson } from "./files.js";

export const DEFAULT_COMPONENT_DIR = "src/components/ui";
export const DEFAULT_STYLE_FILE = "src/styles/bambi.css";

export const frameworkFiles = {
  solid: ["vite.config.ts", "vite.config.js"],
  svelte: ["svelte.config.js", "svelte.config.ts"],
  vue: ["nuxt.config.ts", "nuxt.config.js"],
  react: ["next.config.js", "next.config.mjs", "next.config.ts"],
};

export const frameworkOptions = ["react", "svelte", "vue", "solid", "html"];

/**
 * @param {string} framework
 */
export function assertSupportedFramework(framework) {
  if (!frameworkOptions.includes(framework)) {
    throw new Error(
      `Unknown framework "${framework}". Supported: ${frameworkOptions.join(", ")}.`,
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
    styleFile: normalizeRelativePath(
      overrides.styleFile ?? DEFAULT_STYLE_FILE,
    ),
  };
}

/**
 * @param {Record<string, string | undefined>} config
 * @param {{ framework: string, componentDir: string, styleFile: string }} defaults
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
    styleFile: normalizeRelativePath(
      flags.styleFile ??
        config.styleFile ??
        config.tokensFile ??
        defaults.styleFile,
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

  // Check for solid-js
  if (deps["solid-js"]) return "solid";

  for (const framework of ["svelte", "vue", "react"]) {
    if (deps[framework] || deps[`@${framework}js/kit`]) {
      return framework;
    }
  }

  for (const [framework, files] of Object.entries(frameworkFiles)) {
    if (files.some((file) => existsSync(path.join(cwd, file)))) {
      // For vite.config, check if solid-js is referenced
      if (framework === "solid") {
        try {
          const vitePath = files.find((f) => existsSync(path.join(cwd, f)));
          if (vitePath) {
            const { readFileSync } = await import("node:fs");
            const content = readFileSync(path.join(cwd, vitePath), "utf-8");
            if (!content.includes("solid")) continue;
          }
        } catch {
          continue;
        }
      }
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
 * Generate the index.ts barrel content for an installed component.
 *
 * @param {string} framework
 * @param {string} componentName
 */
export function getIndexContent(framework, componentName) {
  const c = `./components`;
  switch (framework) {
    case "react":
      return `export { Tabs, TabsList, TabsTrigger, TabsContent } from "${c}/${componentName}.react";\n`;
    case "vue":
      return (
        `export { default as Tabs } from "${c}/${componentName}.vue";\n` +
        `export { default as TabsList } from "${c}/${componentName}-list.vue";\n` +
        `export { default as TabsTrigger } from "${c}/${componentName}-trigger.vue";\n` +
        `export { default as TabsContent } from "${c}/${componentName}-content.vue";\n`
      );
    case "svelte":
      return (
        `export { default as Tabs } from "${c}/${componentName}.svelte";\n` +
        `export { default as TabsList } from "${c}/${componentName}-list.svelte";\n` +
        `export { default as TabsTrigger } from "${c}/${componentName}-trigger.svelte";\n` +
        `export { default as TabsContent } from "${c}/${componentName}-content.svelte";\n`
      );
    case "solid":
      return `export { Tabs, TabsList, TabsTrigger, TabsContent } from "${c}/${componentName}.solid";\n`;
    case "html":
      return `export { mount, unmount } from "${c}/${componentName}.html";\n`;
    default:
      return `// bambiui ${componentName}\n`;
  }
}
