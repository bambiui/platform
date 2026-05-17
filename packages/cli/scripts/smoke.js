import { mkdtemp, rm, readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const cliRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(cliRoot, "../..");
const cliEntry = path.join(cliRoot, "src/index.js");
const registry = JSON.parse(await readFile(path.join(repoRoot, "registry.json"), "utf8"));

const frameworks = ["react", "solid", "svelte", "vue"];

const forbiddenFileNames = new Set([
  "define-contract.ts",
  "types.ts",
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
  "@bambiui/generator",
  "@bambiui/adapters",
];

function expectedFilesFor(component, framework) {
  const files = new Set((component.files?.[framework] ?? []).map((filePath) => path.basename(filePath)));
  if (component.css) files.add(path.basename(component.css));
  return [...files].sort();
}

function cssBasenameFor(component) {
  return component.css ? path.basename(component.css) : undefined;
}

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

async function assertNoForbiddenOutput(dir, componentName) {
  const componentForbiddenFileNames = new Set([
    ...forbiddenFileNames,
    `${componentName}.contract.ts`,
    `${componentName}.controller.ts`,
  ]);
  const componentForbiddenStrings = [
    ...forbiddenStrings,
    `${componentName}.contract`,
    `${componentName}.controller`,
  ];

  for (const filePath of await walkFiles(dir)) {
    if (componentForbiddenFileNames.has(path.basename(filePath))) {
      throw new Error(`Generated output contains forbidden file: ${filePath}`);
    }

    const content = await readFile(filePath, "utf8");
    for (const forbidden of componentForbiddenStrings) {
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

for (const [componentName, component] of Object.entries(registry.components)) {
  for (const framework of frameworks) {
    const files = expectedFilesFor(component, framework);
    const cwd = await mkdtemp(path.join(tmpdir(), `bambiui-${componentName}-${framework}-`));

    try {
      await runCli(["init", "--yes", "--framework", framework, "--cwd", cwd, "--registry-url", repoRoot]);

      assertExists(path.join(cwd, "bambiui.config.json"));
      assertExists(path.join(cwd, "src/styles/bambi.css"));

      await runCli(["add", componentName, "--framework", framework, "--cwd", cwd, "--registry-url", repoRoot]);

      const componentDir = path.join(cwd, "src/components/ui", componentName);
      for (const file of files) assertExists(path.join(componentDir, file));
      await assertOnlyExpectedFiles(componentDir, files);
      await assertNoForbiddenOutput(componentDir, componentName);

      if ((component.helpers?.[framework] ?? []).length > 0) {
        assertExists(path.join(cwd, "src/components/ui/bambi-helpers.ts"));
      }

      const cssFile = cssBasenameFor(component);
      if (cssFile) {
        const componentFiles = await walkFiles(componentDir);
        const importsCss = await Promise.all(
          componentFiles
            .filter((filePath) => !filePath.endsWith(".css"))
            .map((filePath) => readFile(filePath, "utf8")),
        );
        if (!importsCss.some((content) => content.includes(`"./${cssFile}"`))) {
          throw new Error(`Expected ${componentName}/${framework} output to import ./${cssFile}`);
        }
      }

      const secondAdd = await runCli([
        "add", componentName, "--framework", framework, "--cwd", cwd, "--registry-url", repoRoot,
      ]);
      if (!secondAdd.stdout.includes("skipped")) {
        throw new Error(`Expected second add to skip existing ${componentName}/${framework} files.`);
      }

      const forcedAdd = await runCli([
        "add", componentName, "--framework", framework, "--cwd", cwd, "--registry-url", repoRoot, "--force",
      ]);
      if (!forcedAdd.stdout.includes("updated")) {
        throw new Error(`Expected forced add to update existing ${componentName}/${framework} files.`);
      }

      process.stdout.write(`  ✓ ${componentName}/${framework}\n`);
    } finally {
      await rm(cwd, { force: true, recursive: true });
    }
  }
}

const unknownFrameworkMessage = "Unknown framework";

for (const framework of ["astro"]) {
  const invalidDir = await mkdtemp(path.join(tmpdir(), `bambiui-${framework}-`));
  try {
    const result = await runCli(
      ["init", "--yes", "--framework", framework, "--cwd", invalidDir, "--registry-url", repoRoot],
      { expectFailure: true },
    );
    if (!result.stderr.includes(unknownFrameworkMessage)) {
      throw new Error(`Expected unknown framework error for ${framework}, got: ${result.stderr}`);
    }
  } finally {
    await rm(invalidDir, { force: true, recursive: true });
  }
}

const addOnlyDir = await mkdtemp(path.join(tmpdir(), "bambiui-add-only-"));
try {
  await runCli(["add", "tabs", "--cwd", addOnlyDir, "--registry-url", repoRoot]);
  assertExists(path.join(addOnlyDir, "src/styles/bambi.css"));
  await assertOnlyExpectedFiles(path.join(addOnlyDir, "src/components/ui/tabs"), expectedFilesFor(registry.components.tabs, "react"));
  await assertNoForbiddenOutput(path.join(addOnlyDir, "src/components/ui/tabs"), "tabs");
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
  await assertNoForbiddenOutput(demoDir, "demo");
  process.stdout.write("  ✓ public registry artifact copy\n");
} finally {
  await rm(mockRegistryDir, { force: true, recursive: true });
  await rm(mockProjectDir, { force: true, recursive: true });
}

// Test: mock registry with correct SHA-256 hashes passes integrity check
const hashCheckRegistryDir = await mkdtemp(path.join(tmpdir(), "bambiui-hash-ok-registry-"));
const hashCheckProjectDir = await mkdtemp(path.join(tmpdir(), "bambiui-hash-ok-project-"));
try {
  await mkdir(path.join(hashCheckRegistryDir, "generated", "demo", "react"), { recursive: true });
  await mkdir(path.join(hashCheckRegistryDir, "styles"), { recursive: true });

  const globalCssContent = "/* hash-ok global */\n";
  const componentContent = `import "./demo.css";\nexport function Demo() { return <div data-demo="" />; }\n`;
  const componentCssContent = "[data-demo-hash-ok] {}\n";

  await writeFile(path.join(hashCheckRegistryDir, "styles", "bambi.css"), globalCssContent);
  await writeFile(path.join(hashCheckRegistryDir, "generated", "demo", "react", "index.tsx"), componentContent);
  await writeFile(path.join(hashCheckRegistryDir, "generated", "demo", "react", "demo.css"), componentCssContent);

  const globalHash = createHash("sha256").update(globalCssContent).digest("hex");
  const componentHash = createHash("sha256").update(componentContent).digest("hex");
  const componentCssHash = createHash("sha256").update(componentCssContent).digest("hex");

  await writeFile(
    path.join(hashCheckRegistryDir, "registry.json"),
    JSON.stringify({
      version: 2,
      styles: { global: "styles/bambi.css", globalHash },
      components: {
        demo: {
          name: "demo",
          css: "generated/demo/react/demo.css",
          cssHash: componentCssHash,
          files: { react: ["generated/demo/react/index.tsx"] },
          exports: { react: ["Demo"] },
          hashes: { react: { "generated/demo/react/index.tsx": componentHash } },
        },
      },
    }, null, 2),
  );

  await runCli(["add", "demo", "--framework", "react", "--cwd", hashCheckProjectDir, "--registry-url", hashCheckRegistryDir]);
  process.stdout.write("  ✓ hash integrity check (correct hashes accepted)\n");
} finally {
  await rm(hashCheckRegistryDir, { force: true, recursive: true });
  await rm(hashCheckProjectDir, { force: true, recursive: true });
}

// Test: mock registry with wrong globalHash is rejected
const badHashRegistryDir = await mkdtemp(path.join(tmpdir(), "bambiui-bad-hash-registry-"));
const badHashProjectDir = await mkdtemp(path.join(tmpdir(), "bambiui-bad-hash-project-"));
try {
  await mkdir(path.join(badHashRegistryDir, "generated", "demo", "react"), { recursive: true });
  await mkdir(path.join(badHashRegistryDir, "styles"), { recursive: true });

  const globalCssContent = "/* bad-hash global */\n";
  const componentContent = `import "./demo.css";\nexport function Demo() { return <div data-demo="" />; }\n`;
  const componentCssContent = "[data-demo-bad] {}\n";
  const wrongHash = "a".repeat(64);

  await writeFile(path.join(badHashRegistryDir, "styles", "bambi.css"), globalCssContent);
  await writeFile(path.join(badHashRegistryDir, "generated", "demo", "react", "index.tsx"), componentContent);
  await writeFile(path.join(badHashRegistryDir, "generated", "demo", "react", "demo.css"), componentCssContent);

  const componentHash = createHash("sha256").update(componentContent).digest("hex");
  const componentCssHash = createHash("sha256").update(componentCssContent).digest("hex");

  await writeFile(
    path.join(badHashRegistryDir, "registry.json"),
    JSON.stringify({
      version: 2,
      styles: { global: "styles/bambi.css", globalHash: wrongHash },
      components: {
        demo: {
          name: "demo",
          css: "generated/demo/react/demo.css",
          cssHash: componentCssHash,
          files: { react: ["generated/demo/react/index.tsx"] },
          exports: { react: ["Demo"] },
          hashes: { react: { "generated/demo/react/index.tsx": componentHash } },
        },
      },
    }, null, 2),
  );

  const result = await runCli(
    ["add", "demo", "--framework", "react", "--cwd", badHashProjectDir, "--registry-url", badHashRegistryDir],
    { expectFailure: true },
  );
  if (!result.stderr.includes("Integrity check failed")) {
    throw new Error(`Expected integrity failure for wrong globalHash, got: ${result.stderr}`);
  }
  process.stdout.write("  ✓ hash integrity check (wrong hash rejected)\n");
} finally {
  await rm(badHashRegistryDir, { force: true, recursive: true });
  await rm(badHashProjectDir, { force: true, recursive: true });
}

// Test: config file custom paths are respected (no CLI path flags)
const customConfigDir = await mkdtemp(path.join(tmpdir(), "bambiui-custom-config-"));
try {
  await writeFile(
    path.join(customConfigDir, "bambiui.config.json"),
    JSON.stringify({ framework: "react", componentDir: "custom/ui", styleFile: "custom/bambi.css" }),
  );

  await runCli(["add", "tabs", "--cwd", customConfigDir, "--registry-url", repoRoot]);

  assertExists(path.join(customConfigDir, "custom/ui/tabs/index.tsx"));
  assertExists(path.join(customConfigDir, "custom/ui/tabs/tabs.css"));
  assertExists(path.join(customConfigDir, "custom/bambi.css"));

  if (existsSync(path.join(customConfigDir, "src/components/ui/tabs"))) {
    throw new Error("Default component path should not be used when config overrides it.");
  }
  if (existsSync(path.join(customConfigDir, "src/styles/bambi.css"))) {
    throw new Error("Default style path should not be used when config overrides it.");
  }

  process.stdout.write("  ✓ config file custom paths respected\n");
} finally {
  await rm(customConfigDir, { force: true, recursive: true });
}

// Test: CLI flags override config file values
const flagOverrideDir = await mkdtemp(path.join(tmpdir(), "bambiui-flag-override-"));
try {
  await writeFile(
    path.join(flagOverrideDir, "bambiui.config.json"),
    JSON.stringify({ framework: "react", componentDir: "custom/ui", styleFile: "custom/bambi.css" }),
  );

  await runCli([
    "add", "tabs",
    "--cwd", flagOverrideDir,
    "--registry-url", repoRoot,
    "--component-dir", "override/ui",
  ]);

  assertExists(path.join(flagOverrideDir, "override/ui/tabs/index.tsx"));

  if (existsSync(path.join(flagOverrideDir, "custom/ui/tabs"))) {
    throw new Error("Config componentDir should be overridden by --component-dir flag.");
  }

  process.stdout.write("  ✓ CLI flags override config file values\n");
} finally {
  await rm(flagOverrideDir, { force: true, recursive: true });
}

process.stdout.write("CLI smoke tests passed.\n");
