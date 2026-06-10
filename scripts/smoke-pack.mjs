import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const workRoot = path.join(root, ".tmp-pack-smoke");
const packDir = path.join(workRoot, "pack");
const projectDir = path.join(workRoot, "project");

async function run(command, args, options = {}) {
  try {
    const result = await execFileAsync(command, args, {
      cwd: options.cwd ?? root,
      env: {
        ...process.env,
        npm_config_audit: "false",
        npm_config_fund: "false",
      },
    });

    return `${result.stdout}${result.stderr}`;
  } catch (error) {
    const output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
    throw new Error(`Command failed: ${command} ${args.join(" ")}\n${output}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function packedTarballPath() {
  const files = await readdir(packDir);
  const tarballs = files.filter((file) => file.endsWith(".tgz"));

  assert(tarballs.length === 1, `Expected exactly one packed tarball, found ${tarballs.length}.`);
  return path.join(packDir, tarballs[0]);
}

function binPath(name) {
  return path.join(projectDir, "node_modules", ".bin", name);
}

await rm(workRoot, { force: true, recursive: true });
await mkdir(packDir, { recursive: true });
await mkdir(projectDir, { recursive: true });

process.stdout.write("Packing bambiui...\n");
await run("pnpm", ["pack", "--pack-destination", packDir]);
const tarball = await packedTarballPath();

process.stdout.write(`Installing ${path.basename(tarball)} into smoke project...\n`);
await writeFile(
  path.join(projectDir, "package.json"),
  `${JSON.stringify({ name: "bambi-pack-smoke", private: true, type: "module" }, null, 2)}\n`,
);
await run("npm", ["install", "--no-audit", "--no-fund", tarball], {
  cwd: projectDir,
});

assert(existsSync(binPath("bambi")), "Expected installed bambi binary to exist.");
assert(existsSync(binPath("bambiui")), "Expected installed bambiui binary to exist.");

const helpOutput = await run(binPath("bambi"), ["--help"], {
  cwd: projectDir,
});
assert(helpOutput.includes("bambi add tabs"), "Installed bambi binary should print help output.");

await run(binPath("bambi"), ["init", "--yes", "--framework", "react"], {
  cwd: projectDir,
});
await run(binPath("bambi"), ["add", "button", "--framework", "react"], {
  cwd: projectDir,
});
await run(binPath("bambi"), ["add", "tabs", "--framework", "react"], {
  cwd: projectDir,
});

const generatedFiles = [
  "generated/components/button.ts",
  "generated/components/tabs.ts",
  "generated/shared/define-component.ts",
  "generated/styles/button.css",
  "generated/styles/tabs.css",
  "generated/react/button.tsx",
  "generated/react/tabs.tsx",
  "generated/auto-init.ts",
];

for (const file of generatedFiles) {
  assert(existsSync(path.join(projectDir, file)), `Expected packed CLI to generate ${file}.`);
}

const generatedButton = await readFile(
  path.join(projectDir, "generated/components/button.ts"),
  "utf8",
);
assert(
  !generatedButton.includes("../../core") && !generatedButton.includes("@bambiui"),
  "Packed CLI generated output should not leak internal package imports.",
);

await rm(workRoot, { force: true, recursive: true });
process.stdout.write("Pack smoke passed.\n");
