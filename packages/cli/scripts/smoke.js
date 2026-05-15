import { mkdtemp, rm, readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const cliRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(cliRoot, "../..");
const cliEntry = path.join(cliRoot, "src/index.js");

const expectedFiles = {
  react: ["index.tsx", "tabs.css"],
};

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
    if (code === 0) throw new Error(`Expected failure for: bambiui ${args.join(" ")}`);
  } else if (code !== 0) {
    throw new Error(`Command failed: bambiui ${args.join(" ")}\n${stdout}${stderr}`);
  }

  return { stdout, stderr };
}

function assertExists(filePath) {
  if (!existsSync(filePath)) throw new Error(`Expected file to exist: ${filePath}`);
}

async function walkFiles(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

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
      throw new Error(`Generated output contains forbidden file: ${filePath}`);
    }

    const content = await readFile(filePath, "utf8");
    for (const forbidden of forbiddenStrings) {
      if (content.includes(forbidden)) {
        throw new Error(`Generated output contains forbidden string "${forbidden}": ${filePath}`);
      }
    }
  }
}

async function assertOnlyExpectedFiles(dir, expected) {
  const files = (await walkFiles(dir)).map((filePath) => path.relative(dir, filePath)).sort();
  const expectedSorted = [...expected].sort();
  if (files.join("\n") !== expectedSorted.join("\n")) {
    throw new Error(`Unexpected component output.\nExpected:\n${expectedSorted.join("\n")}\nActual:\n${files.join("\n")}`);
  }
}

for (const [framework, files] of Object.entries(expectedFiles)) {
  const cwd = await mkdtemp(path.join(tmpdir(), `bambiui-${framework}-`));

  try {
    await runCli(["init", "--yes", "--framework", framework, "--cwd", cwd, "--registry-url", repoRoot]);

    assertExists(path.join(cwd, "bambiui.config.json"));
    assertExists(path.join(cwd, "src/styles/bambi.css"));

    await runCli(["add", "tabs", "--framework", framework, "--cwd", cwd, "--registry-url", repoRoot]);

    const componentDir = path.join(cwd, "src/components/ui/tabs");
    for (const file of files) assertExists(path.join(componentDir, file));
    await assertOnlyExpectedFiles(componentDir, files);
    await assertNoForbiddenOutput(componentDir);

    const wrapper = await readFile(path.join(componentDir, "index.tsx"), "utf8");
    if (!wrapper.includes(`"./tabs.css"`)) {
      throw new Error("Expected index.tsx to import ./tabs.css");
    }

    const secondAdd = await runCli([
      "add", "tabs", "--framework", framework, "--cwd", cwd, "--registry-url", repoRoot,
    ]);
    if (!secondAdd.stdout.includes("skipped")) {
      throw new Error(`Expected second add to skip existing ${framework} files.`);
    }

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

const reactOnlyMessage = "bambiui is currently React-only.";

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

const addOnlyDir = await mkdtemp(path.join(tmpdir(), "bambiui-add-only-"));
try {
  await runCli(["add", "tabs", "--cwd", addOnlyDir, "--registry-url", repoRoot]);
  assertExists(path.join(addOnlyDir, "src/styles/bambi.css"));
  await assertOnlyExpectedFiles(path.join(addOnlyDir, "src/components/ui/tabs"), expectedFiles.react);
  await assertNoForbiddenOutput(path.join(addOnlyDir, "src/components/ui/tabs"));
} finally {
  await rm(addOnlyDir, { force: true, recursive: true });
}

const mockRegistryDir = await mkdtemp(path.join(tmpdir(), "bambiui-public-registry-"));
const mockProjectDir = await mkdtemp(path.join(tmpdir(), "bambiui-public-test-"));

try {
  await mkdir(path.join(mockRegistryDir, "generated", "demo", "react"), { recursive: true });
  await mkdir(path.join(mockRegistryDir, "styles"), { recursive: true });

  await writeFile(path.join(mockRegistryDir, "styles", "bambi.css"), "/* mock global */\n");
  await writeFile(
    path.join(mockRegistryDir, "generated", "demo", "react", "index.tsx"),
    `import "./demo.css";\nexport function Demo() { return <div data-demo="" />; }\n`,
  );
  await writeFile(path.join(mockRegistryDir, "generated", "demo", "react", "demo.css"), "[data-demo] {}\n");
  await writeFile(
    path.join(mockRegistryDir, "registry.json"),
    JSON.stringify(
      {
        version: 2,
        styles: { global: "styles/bambi.css" },
        components: {
          demo: {
            name: "demo",
            files: {
              react: [
                "generated/demo/react/index.tsx",
                "generated/demo/react/demo.css",
              ],
            },
            exports: { react: ["Demo"] },
          },
        },
      },
      null,
      2,
    ),
  );

  await runCli([
    "add",
    "demo",
    "--framework",
    "react",
    "--cwd",
    mockProjectDir,
    "--registry-url",
    mockRegistryDir,
  ]);

  const demoDir = path.join(mockProjectDir, "src/components/ui/demo");
  await assertOnlyExpectedFiles(demoDir, ["index.tsx", "demo.css"]);
  await assertNoForbiddenOutput(demoDir);
  process.stdout.write("  ✓ public registry artifact copy\n");
} finally {
  await rm(mockRegistryDir, { force: true, recursive: true });
  await rm(mockProjectDir, { force: true, recursive: true });
}

process.stdout.write("CLI smoke tests passed.\n");
