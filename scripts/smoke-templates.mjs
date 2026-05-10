import { existsSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const cliEntry = path.join(repoRoot, "packages/cli/src/index.js");
const shouldInstall = process.argv.includes("--install");

const templates = [
  {
    name: "bambi-next",
    framework: "react",
    dir: "apps/templates/bambi-next",
    check: ["npm", "exec", "tsc", "--", "--noEmit"],
    expectedFiles: [
      "bambiui.config.json",
      "src/styles/bambi.css",
      "src/components/ui/button/button.tsx",
      "src/components/ui/button/button.css",
      "src/components/ui/button/index.ts",
      "src/components/ui/button/recipe.ts",
      "src/components/ui/button/types.ts",
    ],
  },
  {
    name: "bambi-svelte",
    framework: "svelte",
    dir: "apps/templates/bambi-svelte",
    check: ["npm", "run", "check"],
    expectedFiles: [
      "bambiui.config.json",
      "src/styles/bambi.css",
      "src/components/ui/button/Button.svelte",
      "src/components/ui/button/button.css",
      "src/components/ui/button/index.ts",
      "src/components/ui/button/recipe.ts",
      "src/components/ui/button/svelte.d.ts",
      "src/components/ui/button/types.ts",
    ],
  },
  {
    name: "bambi-vue",
    framework: "vue",
    dir: "apps/templates/bambi-vue",
    check: ["npm", "run", "build"],
    expectedFiles: [
      "bambiui.config.json",
      "src/styles/bambi.css",
      "src/components/ui/button/Button.vue",
      "src/components/ui/button/button.css",
      "src/components/ui/button/index.ts",
      "src/components/ui/button/recipe.ts",
      "src/components/ui/button/types.ts",
    ],
  },
];

function getChildEnv() {
  const env = { ...process.env };

  for (const key of Object.keys(env)) {
    if (key.toLowerCase().includes("bambiui")) {
      delete env[key];
    }
  }

  return env;
}

/**
 * @param {string[]} command
 * @param {{ cwd?: string }} [options]
 */
async function run(command, options = {}) {
  const child = spawn(command[0], command.slice(1), {
    cwd: options.cwd ?? repoRoot,
    env: getChildEnv(),
    stdio: "inherit",
  });

  const code = await new Promise((resolve) => {
    child.on("close", resolve);
  });

  if (code !== 0) {
    throw new Error(`Command failed in ${options.cwd ?? repoRoot}: ${command.join(" ")}`);
  }
}

/**
 * @param {string} templateDir
 * @param {string[]} files
 */
function assertFiles(templateDir, files) {
  for (const file of files) {
    const absolutePath = path.join(templateDir, file);

    if (!existsSync(absolutePath)) {
      throw new Error(`Expected generated file to exist: ${absolutePath}`);
    }
  }
}

for (const template of templates) {
  const templateDir = path.join(repoRoot, template.dir);

  process.stdout.write(`\nSmoke testing ${template.name}...\n`);

  if (shouldInstall) {
    await run(["npm", "ci"], { cwd: templateDir });
  } else if (!existsSync(path.join(templateDir, "node_modules"))) {
    throw new Error(
      `${template.name} has no node_modules. Run pnpm smoke:templates -- --install first.`,
    );
  }

  await run([
    process.execPath,
    cliEntry,
    "init",
    "--yes",
    "--framework",
    template.framework,
    "--cwd",
    templateDir,
    "--registry-url",
    repoRoot,
  ]);

  await run([
    process.execPath,
    cliEntry,
    "add",
    "button",
    "--framework",
    template.framework,
    "--cwd",
    templateDir,
    "--registry-url",
    repoRoot,
    "--force",
  ]);

  assertFiles(templateDir, template.expectedFiles);
  await run(template.check, { cwd: templateDir });
}

process.stdout.write("\nTemplate smoke tests passed.\n");
