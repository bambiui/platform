import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const cliPath = path.join(root, "dist-cli/index.js");

const templates = [
  { name: "bambi-react", framework: "react" },
  { name: "bambi-solid", framework: "solid" },
  { name: "bambi-svelte", framework: "svelte" },
  { name: "bambi-vue", framework: "vue" },
];

async function runCli(args) {
  try {
    const result = await execFileAsync(process.execPath, [cliPath, ...args], {
      cwd: root,
    });
    return `${result.stdout}${result.stderr}`;
  } catch (error) {
    const output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
    throw new Error(`Command failed: bambi ${args.join(" ")}\n${output}`);
  }
}

for (const template of templates) {
  const templateDir = path.join(root, "apps/templates", template.name);
  process.stdout.write(`Updating ${template.name}...\n`);

  await runCli([
    "init",
    "--cwd",
    templateDir,
    "--framework",
    template.framework,
    "--out-dir",
    "src/components/ui",
    "--style-file",
    "src/styles/bambi.css",
    "--yes",
    "--force",
  ]);

  for (const component of ["button", "tabs"]) {
    await runCli([
      "add",
      component,
      "--cwd",
      templateDir,
      "--framework",
      template.framework,
      "--force",
    ]);
  }
}

process.stdout.write("Template fixtures updated.\n");
