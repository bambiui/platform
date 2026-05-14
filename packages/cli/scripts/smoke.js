import { mkdtemp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const cliRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(cliRoot, "../..");
const cliEntry = path.join(cliRoot, "src/index.js");

// Implementation files expected inside componentDir/tabs/components/
const SHARED_IMPL = ["tabs.contract.ts", "tabs.controller.ts"];

const expectedImplFiles = {
  react:  [...SHARED_IMPL, "tabs.react.tsx"],
  vue:    [...SHARED_IMPL, "tabs.vue", "tabs-list.vue", "tabs-trigger.vue", "tabs-content.vue"],
  svelte: [...SHARED_IMPL, "tabs.svelte", "tabs-list.svelte", "tabs-trigger.svelte", "tabs-content.svelte"],
  solid:  [...SHARED_IMPL, "tabs.solid.tsx"],
  html:   [...SHARED_IMPL, "tabs.html.ts"],
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

    // Component CSS in styles/
    assertExists(path.join(cwd, "src/styles/tabs.css"));

    // Single barrel at componentDir/tabs/tabs.ts
    assertExists(path.join(cwd, "src/components/ui/tabs/tabs.ts"));

    // Implementation files inside componentDir/tabs/components/
    const implDir = path.join(cwd, "src/components/ui/tabs/components");
    for (const file of implFiles) {
      assertExists(path.join(implDir, file));
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

// Invalid framework should fail
const invalidDir = await mkdtemp(path.join(tmpdir(), "bambiui-invalid-"));
try {
  await runCli(
    ["init", "--yes", "--framework", "astro", "--cwd", invalidDir, "--registry-url", repoRoot],
    { expectFailure: true },
  );
} finally {
  await rm(invalidDir, { force: true, recursive: true });
}

process.stdout.write("CLI smoke tests passed.\n");
