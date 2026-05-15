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
 * Convert PascalCase to kebab-case (e.g. TabsList → tabs-list).
 * @param {string} name
 */
function pascalToKebab(name) {
  return name.replace(/([A-Z])/g, (char, _, offset) =>
    (offset > 0 ? "-" : "") + char.toLowerCase(),
  );
}

/**
 * Generate the index.ts barrel content for an installed component.
 *
 * @param {string} framework
 * @param {string} componentName
 * @param {string[]} [exports] - export names from registry metadata
 */
export function getIndexContent(framework, componentName, exports) {
  const c = `./component`;

  /** @type {Record<string, string[]>} */
  const defaultExports = {
    react: ["Tabs", "TabsList", "TabsTrigger", "TabsContent"],
    vue: ["Tabs", "TabsList", "TabsTrigger", "TabsContent"],
    svelte: ["Tabs", "TabsList", "TabsTrigger", "TabsContent"],
    solid: ["Tabs", "TabsList", "TabsTrigger", "TabsContent"],
    html: ["mount", "unmount"],
  };

  const names = exports ?? defaultExports[framework] ?? [];

  switch (framework) {
    case "react":
      return `export { ${names.join(", ")} } from "${c}/${componentName}.react";\n`;
    case "solid":
      return `export { ${names.join(", ")} } from "${c}/${componentName}.solid";\n`;
    case "html":
      return `export { ${names.join(", ")} } from "${c}/${componentName}.html";\n`;
    case "vue":
      return names
        .map((/** @type {string} */ n) => `export { default as ${n} } from "${c}/${pascalToKebab(n)}.vue";\n`)
        .join("");
    case "svelte":
      return names
        .map((/** @type {string} */ n) => `export { default as ${n} } from "${c}/${pascalToKebab(n)}.svelte";\n`)
        .join("");
    default:
      return `// bambiui ${componentName}\n`;
  }
}
