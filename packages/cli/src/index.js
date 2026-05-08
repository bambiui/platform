#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_REGISTRY_URL =
  "https://raw.githubusercontent.com/bambiui/platform/main";

const components = {
  button: {
    style: {
      from: "packages/components/button/src/button.css",
      fileName: "bambi-button.css",
    },
    files: {
      react: [
        { from: "packages/components/button/src/react.tsx", to: "button.tsx" },
        { from: "packages/components/button/src/recipe.ts", to: "recipe.ts" },
        { from: "packages/components/button/src/types.ts", to: "types.ts" },
      ],
      svelte: [
        { from: "packages/components/button/src/svelte.svelte", to: "Button.svelte" },
        { from: "packages/components/button/src/recipe.ts", to: "recipe.ts" },
        { from: "packages/components/button/src/types.ts", to: "types.ts" },
      ],
      vue: [
        { from: "packages/components/button/src/vue.vue", to: "Button.vue" },
        { from: "packages/components/button/src/recipe.ts", to: "recipe.ts" },
        { from: "packages/components/button/src/types.ts", to: "types.ts" },
      ],
      astro: [
        { from: "packages/components/button/src/astro.astro", to: "Button.astro" },
        { from: "packages/components/button/src/recipe.ts", to: "recipe.ts" },
        { from: "packages/components/button/src/types.ts", to: "types.ts" },
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
    styleDir: "src/styles",
    styleFile: "src/styles/bambi.css",
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
  --style-dir <path>                   Component CSS destination directory (default: src/styles)
  --style-file <path>                  Global token CSS destination for init (default: src/styles/bambi.css)
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

function getRegistryUrl(flags, config) {
  return flags.registryUrl ?? config.registryUrl ?? DEFAULT_REGISTRY_URL;
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

async function copyRegistryFile(registryUrl, from, to, force) {
  await mkdir(path.dirname(to), { recursive: true });

  if (existsSync(to) && !force) {
    return { skipped: true, path: to };
  }

  await writeFile(to, await readRegistryFile(registryUrl, from));
  return { skipped: false, path: to };
}

async function addComponent(componentName, flags) {
  const component = components[componentName];

  if (!component) {
    throw new Error(`Unknown component "${componentName}". Available: ${Object.keys(components).join(", ")}`);
  }

  const cwd = path.resolve(flags.cwd);
  const config = await readConfig(cwd);
  const framework = flags.framework ?? config.framework ?? await detectFramework(cwd);
  const componentDir = flags.componentDir ?? config.componentDir ?? "src/components/ui";
  const registryUrl = getRegistryUrl(flags, config);
  const styleDir = flags.styleDir ?? config.styleDir ?? "src/styles";
  const files = component.files[framework];

  if (!files) {
    throw new Error(`Unknown framework "${framework}". Use react, svelte, vue, or astro.`);
  }

  const results = [];

  for (const file of files) {
    results.push(await copyRegistryFile(registryUrl, file.from, path.join(cwd, componentDir, file.to), flags.force));
  }

  results.push(await copyRegistryFile(
    registryUrl,
    component.style.from,
    path.join(cwd, styleDir, component.style.fileName),
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
  const registryUrl = flags.registryUrl ?? DEFAULT_REGISTRY_URL;
  const config = {
    framework,
    componentDir: flags.componentDir,
    registryUrl,
    styleDir: flags.styleDir,
    styleFile: flags.styleFile,
  };

  return [
    await writeProjectFile(
      path.join(cwd, "bambiui.config.json"),
      `${JSON.stringify(config, null, 2)}\n`,
      flags.force,
    ),
    await copyRegistryFile(registryUrl, "packages/tokens/src/tokens.css", path.join(cwd, flags.styleFile), flags.force),
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
