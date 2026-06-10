import { addComponent, createAddPlan, getImportHint } from "./commands/add";
import { formatDoctorResult, runDoctor } from "./commands/doctor";
import { initProject } from "./commands/init";
import { listComponents } from "./commands/list";
import { parseArgs } from "./utils/args";
import { printResults } from "./utils/files";
import { getConfig } from "./utils/framework";
import { didYouMean } from "./utils/suggest";

function help(): string {
  return `bambi

Usage:
  bambi init
  bambi doctor
  bambi doctor --json
  bambi list
  bambi list --json
  bambi add button
  bambi add tabs --framework react
  bambi add tabs --dry-run
  bambi add tabs --plan

Options:
  --framework vanilla|react|solid|svelte|vue Framework override
  --out-dir <path>                           Generated file destination (default: generated)
  --style-file <path>                        CSS entry destination (default: generated/styles/index.css)
  --registry-url <url-or-path>               Registry host (default: https://bambiui.com)
  --cwd <path>                               Target project (default: current directory)
  --dry-run                                  Print planned file operations without writing
  --force                                    Overwrite existing files
  --json                                     Print machine-readable output when supported
  --plan                                     Print add install plan without writing
  --yes, -y                                  Accept detected defaults without prompts
`;
}

async function main(): Promise<void> {
  const { command, component, flags } = parseArgs(process.argv.slice(2));

  if (!command || command === "--help" || command === "-h") {
    process.stdout.write(help());
    return;
  }

  if (command === "init") {
    const results = await initProject(flags);

    process.stdout.write("\nbambi is ready.\n");
    printResults(results);
    return;
  }

  if (command === "doctor") {
    const result = await runDoctor(flags);
    process.stdout.write(
      flags.json
        ? `${JSON.stringify(result, null, 2)}\n`
        : formatDoctorResult(result),
    );
    if (!result.ok) process.exitCode = 1;
    return;
  }

  if (command === "list") {
    process.stdout.write(listComponents({ json: flags.json }));
    return;
  }

  if (command !== "add") {
    const commands = ["init", "doctor", "list", "add"];
    throw new Error(
      `Unknown command "${command}".${didYouMean(command, commands)}\n\n${help()}`,
    );
  }

  if (flags.plan) {
    process.stdout.write(
      `${JSON.stringify(await createAddPlan(component, flags), null, 2)}\n`,
    );
    return;
  }

  const result = await addComponent(component, flags);
  const config = await getConfig(flags.cwd, flags);

  process.stdout.write(
    result.dryRun
      ? `\nWould add ${result.componentName} for ${result.framework}.\n`
      : `\nAdded ${result.componentName} for ${result.framework}.\n`,
  );
  printResults(result.results);
  process.stdout.write(
    `\nUse it with:\n  ${getImportHint(config.outDir, result.framework, result.componentName)}\n`,
  );
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
