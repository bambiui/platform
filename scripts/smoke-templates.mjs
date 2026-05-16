import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const cliEntry = path.join(repoRoot, "packages/cli/src/index.js");
const shouldInstall = process.argv.includes("--install");

const forbiddenFileNames = new Set([
  "define-contract.ts",
  "types.ts",
  "tabs.contract.ts",
  "tabs.controller.ts",
  "create-react-adapter.ts",
  "create-react-part.tsx",
  "use-bambi-controller.ts",
]);

const forbiddenStrings = [
  "create-react-adapter",
  "create-react-part",
  "define-contract",
  "use-bambi-controller",
  "@bambiui/core",
  "@bambiui/adapters",
  "tabs.contract",
  "tabs.controller",
];

const templates = [
  {
    name: "bambi-react",
    framework: "react",
    dir: "apps/templates/bambi-react",
    check: ["npm", "exec", "tsc", "--", "--noEmit"],
    expectedFiles: [
      "bambiui.config.json",
      "src/styles/bambi.css",
      "src/components/ui/tabs/tabs.css",
      "src/components/ui/tabs/index.tsx",
      "src/components/ui/bambi-helpers.ts",
    ],
  },
  {
    name: "bambi-solid",
    framework: "solid",
    dir: "apps/templates/bambi-solid",
    check: ["npm", "run", "typecheck"],
    expectedFiles: [
      "bambiui.config.json",
      "src/styles/bambi.css",
      "src/components/ui/tabs/tabs.css",
      "src/components/ui/tabs/index.tsx",
      "src/components/ui/bambi-helpers.ts",
    ],
  },
  {
    name: "bambi-svelte",
    framework: "svelte",
    dir: "apps/templates/bambi-svelte",
    check: ["npm", "run", "typecheck"],
    expectedFiles: [
      "bambiui.config.json",
      "src/styles/bambi.css",
      "src/components/ui/tabs/tabs.css",
      "src/components/ui/tabs/Tabs.svelte",
      "src/components/ui/tabs/TabsList.svelte",
      "src/components/ui/tabs/TabsTrigger.svelte",
      "src/components/ui/tabs/TabsContent.svelte",
      "src/components/ui/tabs/index.ts",
      "src/components/ui/bambi-helpers.ts",
    ],
  },
  {
    name: "bambi-vue",
    framework: "vue",
    dir: "apps/templates/bambi-vue",
    check: ["npm", "run", "typecheck"],
    expectedFiles: [
      "bambiui.config.json",
      "src/styles/bambi.css",
      "src/components/ui/tabs/tabs.css",
      "src/components/ui/tabs/Tabs.vue",
      "src/components/ui/tabs/TabsList.vue",
      "src/components/ui/tabs/TabsTrigger.vue",
      "src/components/ui/tabs/TabsContent.vue",
      "src/components/ui/tabs/index.ts",
      "src/components/ui/bambi-helpers.ts",
    ],
  },
];

function getChildEnv() {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.toLowerCase().includes("bambiui")) delete env[key];
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
  const code = await new Promise((resolve) => { child.on("close", resolve); });
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

async function walkFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walkFiles(full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

async function assertNoForbiddenOutput(dir) {
  for (const filePath of await walkFiles(dir)) {
    if (forbiddenFileNames.has(path.basename(filePath))) {
      throw new Error(`Template output contains forbidden file: ${filePath}`);
    }

    const content = await readFile(filePath, "utf8");
    for (const forbidden of forbiddenStrings) {
      if (content.includes(forbidden)) {
        throw new Error(`Template output contains forbidden string "${forbidden}": ${filePath}`);
      }
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

  await run([process.execPath, cliEntry, "init", "--yes",
    "--framework", template.framework, "--cwd", templateDir, "--registry-url", repoRoot]);

  await run([process.execPath, cliEntry, "add", "tabs", "--force",
    "--framework", template.framework, "--cwd", templateDir, "--registry-url", repoRoot]);

  assertFiles(templateDir, template.expectedFiles);
  await assertNoForbiddenOutput(path.join(templateDir, "src/components/ui"));
  await run(template.check, { cwd: templateDir });
}

process.stdout.write("\nTemplate smoke tests passed.\n");
