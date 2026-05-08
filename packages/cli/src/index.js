#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_REGISTRY_URL =
  "https://raw.githubusercontent.com/bambiui/platform/main";

const DEFAULT_COMPONENT_DIR = "src/components/ui";
const DEFAULT_TOKENS_FILE = "src/styles/bambi.css";

const components = {
  button: {
    style: {
      from: "packages/components/button/src/button.css",
      fileName: "button.css",
    },
    files: {
      react: [
        { kind: "react", from: "packages/components/button/src/react.tsx", to: "button.tsx" },
        { kind: "recipe", from: "packages/components/button/src/recipe.ts", to: "recipe.ts" },
        { kind: "types", from: "packages/components/button/src/types.ts", to: "types.ts" },
      ],
      svelte: [
        { kind: "svelte", from: "packages/components/button/src/svelte.svelte", to: "Button.svelte" },
        { kind: "recipe", from: "packages/components/button/src/recipe.ts", to: "recipe.ts" },
        { kind: "types", from: "packages/components/button/src/types.ts", to: "types.ts" },
      ],
      vue: [
        { kind: "vue", from: "packages/components/button/src/vue.vue", to: "Button.vue" },
        { kind: "recipe", from: "packages/components/button/src/recipe.ts", to: "recipe.ts" },
        { kind: "types", from: "packages/components/button/src/types.ts", to: "types.ts" },
      ],
      astro: [
        { kind: "astro", from: "packages/components/button/src/astro.astro", to: "Button.astro" },
        { kind: "recipe", from: "packages/components/button/src/recipe.ts", to: "recipe.ts" },
        { kind: "types", from: "packages/components/button/src/types.ts", to: "types.ts" },
      ],
    },
  },
};

const frameworkFiles = {
  react: ["vite.config.ts", "vite.config.js", "next.config.js", "next.config.mjs"],
  svelte: ["svelte.config.js", "svelte.config.ts"],
  vue: ["vite.config.ts", "vite.config.js", "nuxt.config.ts", "nuxt.config.js"],
  astro: ["astro.config.mjs", "astro.config.ts"],
};

function createDefaultConfig(framework, overrides = {}) {
  return {
    framework,
    registryUrl: overrides.registryUrl ?? DEFAULT_REGISTRY_URL,
    componentDir: overrides.componentDir ?? DEFAULT_COMPONENT_DIR,
    tokensFile: overrides.tokensFile ?? overrides.styleFile ?? DEFAULT_TOKENS_FILE,
    components: {
      button: {
        directory: "button",
        styleFile: "button.css",
        files: {
          react: "button.tsx",
          svelte: "Button.svelte",
          vue: "Button.vue",
          astro: "Button.astro",
          recipe: "recipe.ts",
          types: "types.ts",
        },
      },
    },
  };
}

function mergeConfig(config, defaults) {
  return {
    ...defaults,
    ...config,
    components: {
      ...defaults.components,
      ...config.components,
      button: {
        ...defaults.components.button,
        ...config.components?.button,
        files: {
          ...defaults.components.button.files,
          ...config.components?.button?.files,
        },
      },
    },
  };
}

function parseArgs(argv) {
  const [command, maybeComponent, ...tail] = argv;
  const hasComponent = maybeComponent && !maybeComponent.startsWith("-");
  const component = hasComponent ? maybeComponent : undefined;
  const rest = hasComponent ? tail : argv.slice(1);
  const flags = {
    componentDir: "src/components/ui",
    cwd: process.cwd(),
    force: false,
    framework: undefined,
    registryUrl: process.env.BAMBIUI_REGISTRY_URL,
    styleFile: DEFAULT_TOKENS_FILE,
    tokensFile: undefined,
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];

    if (arg === "--force") {
      flags.force = true;
      continue;
    }

    if (arg.startsWith("--")) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      const value = rest[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${arg}`);
      }
      flags[key] = value;
      index += 1;
    }
  }

  return { command, component, flags };
}

function help() {
  return `BambiUI

Usage:
  bambiui init
  bambiui add button

Options:
  --framework react|svelte|vue|astro   Framework override
  --component-dir <path>               Component destination (default: src/components/ui)
  --registry-url <url>                 Registry base URL (default: GitHub raw)
  --tokens-file <path>                 Global token CSS destination (default: src/styles/bambi.css)
  --style-file <path>                  Alias for --tokens-file
  --cwd <path>                         Target project (default: current directory)
  --force                              Overwrite existing files
`;
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return undefined;
  }
}

async function detectFramework(cwd) {
  const packageJson = await readJson(path.join(cwd, "package.json"));
  const deps = { ...packageJson?.dependencies, ...packageJson?.devDependencies };

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

async function readConfig(cwd) {
  const config = await readJson(path.join(cwd, "bambiui.config.json"));
  return config ?? {};
}

async function getConfig(cwd, flags = {}) {
  const detectedFramework = flags.framework ?? await detectFramework(cwd);
  const defaults = createDefaultConfig(detectedFramework, flags);
  const config = await readConfig(cwd);

  return {
    ...mergeConfig(config, defaults),
    ...(flags.framework ? { framework: flags.framework } : {}),
    ...(flags.registryUrl ? { registryUrl: flags.registryUrl } : {}),
    ...(flags.componentDir ? { componentDir: flags.componentDir } : {}),
    ...(flags.tokensFile ? { tokensFile: flags.tokensFile } : {}),
    ...(flags.styleFile ? { tokensFile: flags.styleFile } : {}),
  };
}

function getRegistryUrl(config) {
  return config.registryUrl ?? DEFAULT_REGISTRY_URL;
}

function getRegistryFileUrl(registryUrl, registryPath) {
  if (registryUrl.startsWith("http://") || registryUrl.startsWith("https://")) {
    return new URL(registryPath, `${registryUrl.replace(/\/$/, "")}/`).href;
  }

  if (registryUrl.startsWith("file://")) {
    return new URL(registryPath, `${registryUrl.replace(/\/$/, "")}/`);
  }

  return pathToFileURL(path.resolve(process.cwd(), registryUrl, registryPath));
}

async function readRegistryFile(registryUrl, registryPath) {
  const fileUrl = getRegistryFileUrl(registryUrl, registryPath);

  if (typeof fileUrl === "string") {
    const response = await fetch(fileUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch ${fileUrl}: ${response.status} ${response.statusText}`);
    }

    return response.text();
  }

  return readFile(fileURLToPath(fileUrl), "utf8");
}

function moduleSpecifier(fileName) {
  const parsed = path.parse(fileName);
  return `./${parsed.name}`;
}

function transformComponentSource(content, replacements = {}) {
  let next = content;

  if (replacements.recipe) {
    next = next.replace(/from "\.\/recipe"/g, `from "${moduleSpecifier(replacements.recipe)}"`);
  }

  if (replacements.types) {
    next = next.replace(/from "\.\/types"/g, `from "${moduleSpecifier(replacements.types)}"`);
  }

  if (replacements.style) {
    next = next.replace(/import "\.\/button\.css";/g, `import "./${replacements.style}";`);
  }

  return next;
}

async function copyRegistryFile(registryUrl, from, to, force, transform) {
  await mkdir(path.dirname(to), { recursive: true });

  if (existsSync(to) && !force) {
    return { skipped: true, path: to };
  }

  const content = await readRegistryFile(registryUrl, from);
  await writeFile(to, transform ? transform(content) : content);
  return { skipped: false, path: to };
}

async function addComponent(componentName, flags) {
  const component = components[componentName];

  if (!component) {
    throw new Error(`Unknown component "${componentName}". Available: ${Object.keys(components).join(", ")}`);
  }

  const cwd = path.resolve(flags.cwd);
  const config = await getConfig(cwd, flags);
  const framework = flags.framework ?? config.framework;
  const componentDir = flags.componentDir ?? config.componentDir;
  const registryUrl = getRegistryUrl(config);
  const componentConfig = config.components?.[componentName] ?? {};
  const componentDirectory = componentConfig.directory ?? componentName;
  const files = component.files[framework];

  if (!files) {
    throw new Error(`Unknown framework "${framework}". Use react, svelte, vue, or astro.`);
  }

  const targetDir = path.join(cwd, componentDir, componentDirectory);
  const fileNames = {
    react: componentConfig.files?.react ?? "button.tsx",
    svelte: componentConfig.files?.svelte ?? "Button.svelte",
    vue: componentConfig.files?.vue ?? "Button.vue",
    astro: componentConfig.files?.astro ?? "Button.astro",
    recipe: componentConfig.files?.recipe ?? "recipe.ts",
    types: componentConfig.files?.types ?? "types.ts",
    style: componentConfig.styleFile ?? component.style.fileName,
  };
  const results = [];

  for (const file of files) {
    const targetName = fileNames[file.kind] ?? file.to;
    const transform = file.kind === "recipe"
      ? (content) => transformComponentSource(content, { types: fileNames.types })
      : file.kind === framework
        ? (content) => transformComponentSource(content, fileNames)
        : undefined;

    results.push(await copyRegistryFile(registryUrl, file.from, path.join(targetDir, targetName), flags.force, transform));
  }

  results.push(await copyRegistryFile(
    registryUrl,
    component.style.from,
    path.join(targetDir, fileNames.style),
    flags.force,
  ));

  return results;
}

async function writeProjectFile(filePath, content, force) {
  await mkdir(path.dirname(filePath), { recursive: true });

  if (existsSync(filePath) && !force) {
    return { skipped: true, path: filePath };
  }

  await writeFile(filePath, content);
  return { skipped: false, path: filePath };
}

async function initProject(flags) {
  const cwd = path.resolve(flags.cwd);
  const framework = flags.framework ?? await detectFramework(cwd);
  const config = createDefaultConfig(framework, flags);
  const registryUrl = getRegistryUrl(config);

  return [
    await writeProjectFile(
      path.join(cwd, "bambiui.config.json"),
      `${JSON.stringify(config, null, 2)}\n`,
      flags.force,
    ),
    await copyRegistryFile(registryUrl, "packages/tokens/src/tokens.css", path.join(cwd, config.tokensFile), flags.force),
  ];
}

async function main() {
  const { command, component, flags } = parseArgs(process.argv.slice(2));

  if (!command || command === "--help" || command === "-h") {
    process.stdout.write(help());
    return;
  }

  if (command === "init") {
    const results = await initProject(flags);

    for (const result of results) {
      const label = result.skipped ? "skipped" : "created";
      process.stdout.write(`${label} ${path.relative(process.cwd(), result.path)}\n`);
    }

    return;
  }

  if (command !== "add") {
    throw new Error(`Unknown command "${command}".\n\n${help()}`);
  }

  const results = await addComponent(component, flags);

  for (const result of results) {
    const label = result.skipped ? "skipped" : "created";
    process.stdout.write(`${label} ${path.relative(process.cwd(), result.path)}\n`);
  }
}

main().catch(async (error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
