#!/usr/bin/env node
import { addComponent, getImportHint } from "./commands/add.js";
import { initProject } from "./commands/init.js";
import { DEFAULT_COMPONENT_DIR, DEFAULT_TOKENS_FILE } from "./utils/framework.js";
import { printResults } from "./utils/files.js";

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  const [command, maybeComponent, ...tail] = argv;
  const hasComponent = maybeComponent && !maybeComponent.startsWith("-");
  const component = hasComponent ? maybeComponent : undefined;
  const rest = hasComponent ? tail : argv.slice(1);
  const flags = {
    componentDir: DEFAULT_COMPONENT_DIR,
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

  const { config, exportName, framework, results } = await addComponent(
    component,
    flags,
  );

  process.stdout.write(`\nAdded ${component} for ${framework}.\n`);
  printResults(results);
  process.stdout.write(
    `\nUse it with:\n  ${getImportHint(config.componentDir, exportName, component ?? "")}\n`,
  );
}

main().catch(async (error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
