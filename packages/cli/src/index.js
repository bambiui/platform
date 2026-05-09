#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_REGISTRY_URL =
  "https://raw.githubusercontent.com/bambiui/platform/main";

const DEFAULT_COMPONENT_DIR = "src/components/ui";
const DEFAULT_TOKENS_FILE = "src/styles/bambi.css";

const colors = {
  blue: "\x1b[34m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  reset: "\x1b[0m",
  yellow: "\x1b[33m",
};

function color(value, tone) {
  return `${colors[tone]}${value}${colors.reset}`;
}

const components = {
  button: {
    style: {
      from: "packages/components/button/src/button.css",
      fileName: "button.css",
    },
    shared: [
      {
        kind: "recipe",
        from: "packages/components/button/src/recipe.ts",
        to: "recipe.ts",
      },
      {
        kind: "types",
        from: "packages/core/src/button.ts",
        to: "types.ts",
      },
    ],
    files: {
      react: [
        {
          kind: "react",
          from: "packages/components/button/src/react.tsx",
          to: "button.tsx",
        },
      ],
      svelte: [
        {
          kind: "svelte",
          from: "packages/components/button/src/svelte.svelte",
          to: "Button.svelte",
        },
      ],
      vue: [
        {
          kind: "vue",
          from: "packages/components/button/src/vue.vue",
          to: "Button.vue",
        },
      ],
      astro: [
        {
          kind: "astro",
          from: "packages/components/button/src/astro.astro",
          to: "Button.astro",
        },
      ],
    },
  },
};

const frameworkFiles = {
  astro: ["astro.config.mjs", "astro.config.ts"],
  svelte: ["svelte.config.js", "svelte.config.ts"],
  vue: ["nuxt.config.ts", "nuxt.config.js"],
  react: ["next.config.js", "next.config.mjs", "next.config.ts"],
};

const frameworkOptions = ["react", "svelte", "vue", "astro"];

function createDefaultConfig(framework, overrides = {}) {
  return {
    framework,
    componentDir: overrides.componentDir ?? DEFAULT_COMPONENT_DIR,
    tokensFile:
      overrides.tokensFile ?? overrides.styleFile ?? DEFAULT_TOKENS_FILE,
  };
}

function mergeConfig(config, defaults, flags = {}) {
  return {
    framework: flags.framework ?? config.framework ?? defaults.framework,
    componentDir:
      flags.componentDir ?? config.componentDir ?? defaults.componentDir,
    tokensFile:
      flags.tokensFile ??
      flags.styleFile ??
      config.tokensFile ??
      config.styleFile ??
      defaults.tokensFile,
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
    yes: false,
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

    if (arg === "--yes" || arg === "-y") {
      flags.yes = true;
      continue;
    }

    if (arg.startsWith("--")) {
      const key = arg
        .slice(2)
        .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
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
  --yes, -y                            Accept detected defaults without prompts
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

async function readConfig(cwd) {
  const config = await readJson(path.join(cwd, "bambiui.config.json"));
  return config ?? {};
}

async function getConfig(cwd, flags = {}) {
  const detectedFramework = flags.framework ?? (await detectFramework(cwd));
  const defaults = createDefaultConfig(detectedFramework, flags);
  const config = await readConfig(cwd);

  return mergeConfig(config, defaults, flags);
}

function getRegistryUrl(flags) {
  return flags.registryUrl ?? DEFAULT_REGISTRY_URL;
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
      throw new Error(
        `Failed to fetch ${fileUrl}: ${response.status} ${response.statusText}`,
      );
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
    next = next.replace(
      /from "\.\/recipe"/g,
      `from "${moduleSpecifier(replacements.recipe)}"`,
    );
  }

  if (replacements.types) {
    next = next.replace(
      /from "\.\/types"/g,
      `from "${moduleSpecifier(replacements.types)}"`,
    );
    next = next.replace(
      /from "@bambiui\/core\/button"/g,
      `from "${moduleSpecifier(replacements.types)}"`,
    );
  }

  if (replacements.style) {
    next = next.replace(
      /import "\.\/button\.css";/g,
      `import "./${replacements.style}";`,
    );
  }

  return next;
}

function transformButtonTypesSource(content) {
  return content.replace(
    /import \{\n  bambiAppearances,\n  bambiIntents,\n  bambiSizes,\n  type BambiAppearance,\n  type BambiIntent,\n  type BambiSize,\n\} from "\.\/contracts";/,
    `export const bambiIntents = [
  "primary",
  "secondary",
  "danger",
  "success",
  "warning",
] as const;

export const bambiAppearances = ["solid", "outline", "ghost", "link"] as const;

export const bambiSizes = ["sm", "md", "lg", "icon"] as const;

export type BambiIntent = (typeof bambiIntents)[number];

export type BambiAppearance = (typeof bambiAppearances)[number];

export type BambiSize = (typeof bambiSizes)[number];`,
  );
}

function getFrameworkFileName(framework) {
  return {
    react: "button.tsx",
    svelte: "Button.svelte",
    vue: "Button.vue",
    astro: "Button.astro",
  }[framework];
}

function getIndexContent(framework) {
  if (framework === "react") {
    return `export { Button } from "./button";\nexport type { ButtonAppearance, ButtonBaseProps, ButtonIntent, ButtonSize } from "./button";\n`;
  }

  return `export { default as Button } from "./${getFrameworkFileName(framework)}";\nexport type { ButtonAppearance, ButtonBaseProps, ButtonIntent, ButtonSize } from "./types";\n`;
}

function getFrameworkSupportFiles(framework) {
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

async function copyRegistryFile(registryUrl, from, to, force, transform) {
  await mkdir(path.dirname(to), { recursive: true });

  if (existsSync(to) && !force) {
    return { skipped: true, path: to };
  }

  const content = await readRegistryFile(registryUrl, from);
  await writeFile(to, transform ? transform(content) : content);
  return { skipped: false, path: to };
}

async function writeGeneratedFile(filePath, content, force) {
  await mkdir(path.dirname(filePath), { recursive: true });

  if (existsSync(filePath) && !force) {
    return { skipped: true, path: filePath };
  }

  await writeFile(filePath, content);
  return { skipped: false, path: filePath };
}

function printResults(results) {
  for (const result of results) {
    const label = result.skipped ? "skipped" : "created";
    process.stdout.write(
      `  ${label} ${path.relative(process.cwd(), result.path)}\n`,
    );
  }
}

async function addComponent(componentName, flags) {
  const component =
    components[/** @type {keyof typeof components} */ (componentName)];

  if (!component) {
    throw new Error(
      `Unknown component "${componentName}". Available: ${Object.keys(components).join(", ")}`,
    );
  }

  const cwd = path.resolve(flags.cwd);
  const config = await getConfig(cwd, flags);
  const framework = flags.framework ?? config.framework;
  const componentDir = flags.componentDir ?? config.componentDir;
  const registryUrl = getRegistryUrl(flags);
  const componentDirectory = componentName;
  const files = [
    ...(component.shared ?? []),
    ...(component.files[
      /** @type {keyof typeof component.files} */ (framework)
    ] ?? []),
  ];

  if (!files) {
    throw new Error(
      `Unknown framework "${framework}". Use react, svelte, vue, or astro.`,
    );
  }

  const targetDir = path.join(cwd, componentDir, componentDirectory);
  const fileNames = {
    react: "button.tsx",
    svelte: "Button.svelte",
    vue: "Button.vue",
    astro: "Button.astro",
    recipe: "recipe.ts",
    types: "types.ts",
    style: component.style.fileName,
  };
  const results = [];

  for (const file of files) {
    const targetName =
      fileNames[/** @type {keyof typeof fileNames} */ (file.kind)] ?? file.to;
    const transform =
      file.kind === "types"
        ? transformButtonTypesSource
        : file.kind === "recipe"
          ? (content) =>
              transformComponentSource(content, { types: fileNames.types })
          : file.kind === framework
            ? (content) => transformComponentSource(content, fileNames)
            : undefined;

    results.push(
      await copyRegistryFile(
        registryUrl,
        file.from,
        path.join(targetDir, targetName),
        flags.force,
        transform,
      ),
    );
  }

  results.push(
    await copyRegistryFile(
      registryUrl,
      component.style.from,
      path.join(targetDir, fileNames.style),
      flags.force,
    ),
  );

  results.push(
    await writeGeneratedFile(
      path.join(targetDir, "index.ts"),
      getIndexContent(framework),
      flags.force,
    ),
  );

  for (const supportFile of getFrameworkSupportFiles(framework)) {
    results.push(
      await writeGeneratedFile(
        path.join(targetDir, supportFile.fileName),
        supportFile.content,
        flags.force,
      ),
    );
  }

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
  const framework = flags.framework ?? (await detectFramework(cwd));
  const defaults = createDefaultConfig(framework, flags);
  const config = await promptForConfig(defaults, flags);
  const registryUrl = getRegistryUrl(flags);

  return [
    await writeProjectFile(
      path.join(cwd, "bambiui.config.json"),
      `${JSON.stringify(config, null, 2)}\n`,
      flags.force,
    ),
    await copyRegistryFile(
      registryUrl,
      "packages/tokens/src/tokens.css",
      path.join(cwd, config.tokensFile),
      flags.force,
    ),
  ];
}

async function promptForConfig(defaults, flags) {
  if (flags.yes || !process.stdin.isTTY) {
    return defaults;
  }

  const { createInterface } = await import("node:readline/promises");

  process.stdout.write(
    `${color("Bambi UI", "bold")} ${color("setup", "cyan")}\n`,
  );
  process.stdout.write(`${color("Detected defaults", "green")}\n\n`);
  process.stdout.write(
    `  ${color("framework", "dim")}    ${color(defaults.framework, "yellow")}\n`,
  );
  process.stdout.write(
    `  ${color("componentDir", "dim")} ${color(defaults.componentDir, "yellow")}\n`,
  );
  process.stdout.write(
    `  ${color("tokensFile", "dim")}   ${color(defaults.tokensFile, "yellow")}\n\n`,
  );

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const useDefaults = await rl.question(
    `Use these defaults? ${color("(Y/n)", "dim")} `,
  );
  rl.close();

  if (!useDefaults.trim() || useDefaults.trim().toLowerCase().startsWith("y")) {
    return defaults;
  }

  process.stdout.write(`\n${color("Customize config", "green")}\n`);
  process.stdout.write(
    `${color("Press enter to keep the shown value.", "dim")}\n\n`,
  );

  process.stdin.resume();
  const framework = await selectFramework(defaults.framework);

  process.stdin.resume();
  const customRl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const componentDir = await customRl.question(
      `Component directory (${defaults.componentDir}): `,
    );
    const tokensFile = await customRl.question(
      `Tokens file (${defaults.tokensFile}): `,
    );

    return {
      framework,
      componentDir: componentDir.trim() || defaults.componentDir,
      tokensFile: tokensFile.trim() || defaults.tokensFile,
    };
  } finally {
    customRl.close();
  }
}

async function selectFramework(defaultFramework) {
  const readline = await import("node:readline");
  const input = process.stdin;
  const output = process.stdout;
  const startIndex = Math.max(0, frameworkOptions.indexOf(defaultFramework));
  let selectedIndex = startIndex;

  readline.emitKeypressEvents(input);

  if (input.isTTY) {
    input.setRawMode(true);
  }

  function render() {
    const choices = frameworkOptions
      .map((framework, index) => {
        const label =
          framework === selectedIndexFramework()
            ? color(framework, "yellow")
            : framework;
        return index === selectedIndex
          ? `${color("›", "cyan")} ${label}`
          : `  ${color(framework, "dim")}`;
      })
      .join("  ");

    output.write(
      `\rFramework ${color("(use ←/→, enter)", "dim")} ${choices}\x1b[K`,
    );
  }

  function selectedIndexFramework() {
    return frameworkOptions[selectedIndex];
  }

  render();

  return new Promise((resolve) => {
    function cleanup() {
      input.off("keypress", onKeypress);
      if (input.isTTY) {
        input.setRawMode(false);
      }
      output.write("\n");
    }

    function onKeypress(_, key) {
      if (key?.name === "return" || key?.name === "enter") {
        const framework = selectedIndexFramework();
        cleanup();
        resolve(framework);
        return;
      }

      if (key?.name === "left" || key?.name === "up") {
        selectedIndex =
          (selectedIndex - 1 + frameworkOptions.length) %
          frameworkOptions.length;
        render();
        return;
      }

      if (key?.name === "right" || key?.name === "down") {
        selectedIndex = (selectedIndex + 1) % frameworkOptions.length;
        render();
        return;
      }

      if (key?.ctrl && key.name === "c") {
        cleanup();
        process.exitCode = 130;
        resolve(selectedIndexFramework());
      }
    }

    input.on("keypress", onKeypress);
  });
}

function getImportHint(componentDir, componentName) {
  const sourceRelativeDir = componentDir.startsWith("src/")
    ? componentDir.slice("src/".length)
    : componentDir;

  return `import { Button } from "./${path.posix.join(sourceRelativeDir, componentName)}";`;
}

async function main() {
  const { command, component, flags } = parseArgs(process.argv.slice(2));

  if (!command || command === "--help" || command === "-h") {
    process.stdout.write(help());
    return;
  }

  if (command === "init") {
    const results = await initProject(flags);

    process.stdout.write("\nBambi UI is ready.\n");
    printResults(results);
    process.stdout.write(
      "\nImport the token file once in your global stylesheet or app entry.\n",
    );

    return;
  }

  if (command !== "add") {
    throw new Error(`Unknown command "${command}".\n\n${help()}`);
  }

  const cwd = path.resolve(flags.cwd);
  const config = await getConfig(cwd, flags);
  const framework = flags.framework ?? config.framework;
  const results = await addComponent(component, flags);

  process.stdout.write(`\nAdded ${component} for ${framework}.\n`);
  printResults(results);
  process.stdout.write(
    `\nUse it with:\n  ${getImportHint(config.componentDir, component)}\n`,
  );
}

main().catch(async (error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
