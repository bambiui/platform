import { mkdtemp, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const cliRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(cliRoot, "../..");
const cliEntry = path.join(cliRoot, "src/index.js");

const expectedComponentFiles = {
  astro: "Button.astro",
  react: "button.tsx",
  svelte: "Button.svelte",
  vue: "Button.vue",
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
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  const code = await new Promise((resolve) => {
    child.on("close", resolve);
  });

  if (options.expectFailure) {
    if (code === 0) {
      throw new Error(`Expected failure for: bambiui ${args.join(" ")}`);
    }
  } else if (code !== 0) {
    throw new Error(
      `Command failed: bambiui ${args.join(" ")}\n${stdout}${stderr}`,
    );
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

for (const [framework, componentFile] of Object.entries(expectedComponentFiles)) {
  const cwd = await mkdtemp(path.join(tmpdir(), `bambiui-${framework}-`));

  try {
    await runCli([
      "init",
      "--yes",
      "--framework",
      framework,
      "--cwd",
      cwd,
      "--registry-url",
      repoRoot,
    ]);

    await runCli([
      "add",
      "button",
      "--framework",
      framework,
      "--cwd",
      cwd,
      "--registry-url",
      repoRoot,
    ]);

    const buttonDir = path.join(cwd, "src/components/ui/button");
    assertExists(path.join(cwd, "bambiui.config.json"));
    assertExists(path.join(cwd, "src/styles/bambi.css"));
    assertExists(path.join(buttonDir, componentFile));
    assertExists(path.join(buttonDir, "button.css"));
    assertExists(path.join(buttonDir, "index.ts"));
    assertExists(path.join(buttonDir, "recipe.ts"));
    assertExists(path.join(buttonDir, "types.ts"));

    const secondAdd = await runCli([
      "add",
      "button",
      "--framework",
      framework,
      "--cwd",
      cwd,
      "--registry-url",
      repoRoot,
    ]);

    if (!secondAdd.stdout.includes("skipped")) {
      throw new Error(`Expected second add to skip existing ${framework} files.`);
    }

    const forcedAdd = await runCli([
      "add",
      "button",
      "--framework",
      framework,
      "--cwd",
      cwd,
      "--registry-url",
      repoRoot,
      "--force",
    ]);

    if (!forcedAdd.stdout.includes("updated")) {
      throw new Error(`Expected forced add to update existing ${framework} files.`);
    }

    const types = await readFile(path.join(buttonDir, "types.ts"), "utf8");
    if (types.includes("@bambiui/")) {
      throw new Error(`Generated ${framework} types are not self-contained.`);
    }
  } finally {
    await rm(cwd, { force: true, recursive: true });
  }
}

const invalidFrameworkDir = await mkdtemp(path.join(tmpdir(), "bambiui-invalid-"));
try {
  const result = await runCli(
    [
      "init",
      "--yes",
      "--framework",
      "solid",
      "--cwd",
      invalidFrameworkDir,
      "--registry-url",
      repoRoot,
    ],
    { expectFailure: true },
  );

  if (!result.stderr.includes("Unknown framework")) {
    throw new Error("Expected invalid framework error message.");
  }
} finally {
  await rm(invalidFrameworkDir, { force: true, recursive: true });
}

process.stdout.write("CLI smoke tests passed.\n");
