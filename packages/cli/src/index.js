#!/usr/bin/env node
import { addComponent, getImportHint } from "./commands/add.js";
import { initProject } from "./commands/init.js";
import { parseArgs } from "./utils/args.js";
import { printResults } from "./utils/files.js";

function help() {
  return `bambiui

Usage:
  bambiui init
  bambiui add tabs

Options:
  --framework react                         Framework override
  --component-dir <path>                    Component destination (default: src/components/ui)
  --registry-url <url>                      Registry base URL (default: https://bambiui.com)
  --style-file <path>                       Global CSS destination (default: src/styles/bambi.css)
  --cwd <path>                              Target project (default: current directory)
  --force                                   Overwrite existing files
  --yes, -y                                 Accept detected defaults without prompts
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

    process.stdout.write("\nbambiui is ready.\n");
    printResults(results);
    process.stdout.write(
      "\nImport the global CSS file once in your global stylesheet or app entry.\n",
    );

    return;
  }

  if (command !== "add") {
    throw new Error(`Unknown command "${command}".\n\n${help()}`);
  }

  const { config, framework, componentName, results, exports: componentExports } = await addComponent(
    component,
    flags,
  );

  process.stdout.write(`\nAdded ${componentName} for ${framework}.\n`);
  printResults(results);
  process.stdout.write(
    `\nUse it with:\n  ${getImportHint(config.componentDir, componentName ?? "", componentExports)}\n`,
  );
}

main().catch(async (error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
