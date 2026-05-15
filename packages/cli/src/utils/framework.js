import { existsSync } from "node:fs";
import path from "node:path";
import { normalizeRelativePath, readJson } from "./files.js";

export const DEFAULT_COMPONENT_DIR = "src/components/ui";
export const DEFAULT_STYLE_FILE = "src/styles/bambi.css";
export const REACT_ONLY_MIGRATION_MESSAGE =
  "bambiui is currently React-only. Use --framework react.";

export const frameworkFiles = {
  svelte: ["svelte.config.js", "svelte.config.ts"],
  vue: ["nuxt.config.ts", "nuxt.config.js"],
  react: ["next.config.js", "next.config.mjs", "next.config.ts"],
};

export const frameworkOptions = ["react"];
const knownUnsupportedFrameworks = new Set(["vue", "svelte", "solid"]);

/**
 * @param {string} framework
 */
export function assertSupportedFramework(framework) {
  if (framework === "react" || framework === "unknown") {
    return;
  }

  if (knownUnsupportedFrameworks.has(framework)) {
    throw new Error(
      `${REACT_ONLY_MIGRATION_MESSAGE}\nRequested: ${framework}.`,
    );
  }

  throw new Error(
    `Unknown framework "${framework}". Defaulting is only used for auto-detection.\n${REACT_ONLY_MIGRATION_MESSAGE}`,
  );
}

/**
 * @param {string} framework
 * @param {Record<string, string | undefined>} [overrides]
 */
export function createDefaultConfig(framework, overrides = {}) {
  assertSupportedFramework(framework);
  const resolvedFramework = framework === "unknown" ? "react" : framework;

  return {
    framework: resolvedFramework,
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
  const resolvedFramework = framework === "unknown" ? "react" : framework;

  return {
    framework: resolvedFramework,
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

  if (deps["solid-js"]) return "solid";

  for (const framework of ["svelte", "vue", "react"]) {
    if (deps[framework] || deps[`@${framework}js/kit`]) {
      return framework;
    }
  }

  for (const [framework, files] of Object.entries(frameworkFiles)) {
    if (files.some((file) => existsSync(path.join(cwd, file)))) {
      return framework;
    }
  }

  return "unknown";
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
 * @param {string[]} [exports] - export names from registry metadata
 */
export function getIndexContent(framework, componentName, exports) {
  const c = `./component`;

  /** @type {Record<string, string[]>} */
  const defaultExports = {
    react: ["Tabs", "TabsList", "TabsTrigger", "TabsContent"],
  };

  const names = exports ?? defaultExports[framework] ?? [];

  switch (framework) {
    case "react":
      return `export { ${names.join(", ")} } from "${c}/${componentName}.react";\n`;
    default:
      return `// bambiui ${componentName}\n`;
  }
}
