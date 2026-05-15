import { mkdtemp, rm, readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const cliRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(cliRoot, "../..");
const cliEntry = path.join(cliRoot, "src/index.js");

// Implementation files expected inside componentDir/tabs/component/
const CONTRACT_IMPL = ["types.ts", "define-contract.ts", "tabs.contract.ts", "tabs.controller.ts"];
const REACT_ADAPTER_IMPL = [
  "use-bambi-controller.ts",
  "create-react-part.tsx",
  "create-react-adapter.ts",
];

const expectedImplFiles = {
  react:  [...CONTRACT_IMPL, ...REACT_ADAPTER_IMPL, "tabs.react.tsx"],
};

// Expected barrel export names per framework (from registry exports metadata)
const expectedBarrelExports = {
  react:  ["Tabs", "TabsList", "TabsTrigger", "TabsContent"],
};

// Framework wrappers that must contain a CSS import
const frameworksRequiringCssImport = {
  react:  "tabs.react.tsx",
};

/**
 * @param {string[]} args
 * @param {{ cwd?: string, expectFailure?: boolean }} [options]
 */
async function runCli(args, options = {}) {
  const child = spawn(process.execPath, [cliEntry, ...args], {
    cwd: options.cwd ?? repoRoot,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });

  const code = await new Promise((resolve) => { child.on("close", resolve); });

  if (options.expectFailure) {
    if (code === 0) {
      throw new Error(`Expected failure for: bambiui ${args.join(" ")}`);
    }
  } else if (code !== 0) {
    throw new Error(`Command failed: bambiui ${args.join(" ")}\n${stdout}${stderr}`);
  }

  return { stdout, stderr };
}

/**
 * @param {string} filePath
 */
function assertExists(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Expected file to exist: ${filePath}`);
  }
}

/**
 * Recursively scan a directory and assert no file contains `@bambiui/`.
 * @param {string} dir
 */
async function assertNoAmbiguiImports(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await assertNoAmbiguiImports(full);
    } else if (entry.isFile()) {
      const content = await readFile(full, "utf8");
      if (content.includes("@bambiui/")) {
        throw new Error(`Generated output contains @bambiui/ import: ${full}`);
      }
    }
  }
}

/**
 * Assert that a file contains a CSS import (./tabs.css).
 * @param {string} filePath
 */
async function assertCssImport(filePath) {
  const content = await readFile(filePath, "utf8");
  if (!content.includes(`"./tabs.css"`) && !content.includes(`'./tabs.css'`)) {
    throw new Error(`Expected CSS import in ${filePath} but none found`);
  }
}

/**
 * Assert that the barrel file exports all expected names.
 * @param {string} barrelPath
 * @param {string[]} expectedNames
 */
async function assertBarrelExports(barrelPath, expectedNames) {
  const content = await readFile(barrelPath, "utf8");
  for (const name of expectedNames) {
    if (!content.includes(name)) {
      throw new Error(`Barrel at ${barrelPath} is missing export: ${name}`);
    }
  }
}

// Test each framework
for (const [framework, implFiles] of Object.entries(expectedImplFiles)) {
  const cwd = await mkdtemp(path.join(tmpdir(), `bambiui-${framework}-`));

  try {
    // Init
    await runCli(["init", "--yes", "--framework", framework, "--cwd", cwd, "--registry-url", repoRoot]);

    assertExists(path.join(cwd, "bambiui.config.json"));
    assertExists(path.join(cwd, "src/styles/bambi.css"));

    // Add tabs
    await runCli(["add", "tabs", "--framework", framework, "--cwd", cwd, "--registry-url", repoRoot]);

    // Component CSS inside component dir
    assertExists(path.join(cwd, "src/components/ui/tabs/component/tabs.css"));

    // Single barrel at componentDir/tabs/tabs.ts
    const barrelPath = path.join(cwd, "src/components/ui/tabs/tabs.ts");
    assertExists(barrelPath);

    // Implementation files inside componentDir/tabs/component/
    const implDir = path.join(cwd, "src/components/ui/tabs/component");
    for (const file of implFiles) {
      assertExists(path.join(implDir, file));
    }

    // Generated output must not contain @bambiui/ runtime imports
    await assertNoAmbiguiImports(implDir);

    // Barrel must export all expected names from registry exports metadata
    await assertBarrelExports(barrelPath, expectedBarrelExports[framework]);

    // Framework wrappers that must have a CSS import
    const wrapperFile = frameworksRequiringCssImport[framework];
    if (wrapperFile) {
      await assertCssImport(path.join(implDir, wrapperFile));
    }

    // Second add should skip existing files
    const secondAdd = await runCli([
      "add", "tabs", "--framework", framework, "--cwd", cwd, "--registry-url", repoRoot,
    ]);
    if (!secondAdd.stdout.includes("skipped")) {
      throw new Error(`Expected second add to skip existing ${framework} files.`);
    }

    // Forced add should update
    const forcedAdd = await runCli([
      "add", "tabs", "--framework", framework, "--cwd", cwd, "--registry-url", repoRoot, "--force",
    ]);
    if (!forcedAdd.stdout.includes("updated")) {
      throw new Error(`Expected forced add to update existing ${framework} files.`);
    }

    process.stdout.write(`  ✓ ${framework}\n`);
  } finally {
    await rm(cwd, { force: true, recursive: true });
  }
}

const reactOnlyMessage = "bambiui generic adapter migration is currently React-only.";

for (const framework of ["vue", "svelte", "solid", "astro"]) {
  const invalidDir = await mkdtemp(path.join(tmpdir(), `bambiui-${framework}-`));
  try {
    const result = await runCli(
      ["init", "--yes", "--framework", framework, "--cwd", invalidDir, "--registry-url", repoRoot],
      { expectFailure: true },
    );
    if (!result.stderr.includes(reactOnlyMessage)) {
      throw new Error(`Expected React-only migration message for ${framework}.`);
    }
  } finally {
    await rm(invalidDir, { force: true, recursive: true });
  }
}

process.stdout.write("CLI smoke tests passed.\n");
