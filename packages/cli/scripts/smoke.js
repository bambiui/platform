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
  await assertNoAmbiguiImports(path.join(addOnlyDir, "src/components/ui/tabs/component"));
} finally {
  await rm(addOnlyDir, { force: true, recursive: true });
}

// ── primitiveFiles install test ───────────────────────────────────────────
// Uses a temporary mock registry (not the real registry.json) to test that
// the CLI copies primitiveFiles into the primitives/ subdirectory and that
// import rewrites leave no @bambiui/ imports in the generated output.

const mockRegistryDir = await mkdtemp(path.join(tmpdir(), "bambiui-mock-registry-"));
const mockProjectDir = await mkdtemp(path.join(tmpdir(), "bambiui-prim-test-"));

try {
  await mkdir(path.join(mockRegistryDir, "primitives"), { recursive: true });
  await mkdir(path.join(mockRegistryDir, "components", "prim-test", "react"), { recursive: true });
  await mkdir(path.join(mockRegistryDir, "contract"), { recursive: true });
  await mkdir(path.join(mockRegistryDir, "adapters", "react"), { recursive: true });
  await mkdir(path.join(mockRegistryDir, "styles"), { recursive: true });

  // Mock primitive — must not contain @bambiui/ imports in final output
  await writeFile(
    path.join(mockRegistryDir, "primitives", "mock-primitive.ts"),
    "// mock primitive\nexport function mockPrimitive(): void {}\n",
  );

  // Mock contract helpers
  await writeFile(
    path.join(mockRegistryDir, "contract", "types.ts"),
    "export type BambiPropDefinition = { attribute: string };\nexport interface BambiComponentContract { name: string; parts: readonly unknown[]; }\n",
  );
  await writeFile(
    path.join(mockRegistryDir, "contract", "define-contract.ts"),
    "export function defineContract<T>(c: T): T { return c; }\n",
  );

  // Mock contract — no @bambiui/ imports in installed output (uses local rewrite)
  await writeFile(
    path.join(mockRegistryDir, "components", "prim-test", "prim-test.contract.ts"),
    `import { defineContract } from "../../../contract/define-contract.js";\nexport const primTestContract = defineContract({ name: "prim-test", parts: [] as const });\n`,
  );

  // Mock controller that imports the primitive with single quotes and the .js extension.
  // The CLI must also rewrite dynamic imports and keep no @bambiui/ prefix or .js extension.
  await writeFile(
    path.join(mockRegistryDir, "components", "prim-test", "prim-test.controller.ts"),
    `import { mockPrimitive } from '@bambiui/core/primitives/mock-primitive.js';\nexport async function loadMockPrimitive() { return import('@bambiui/core/primitives/mock-primitive'); }\nexport class PrimTestController { sync(): void { mockPrimitive(); } destroy(): void {} }\n`,
  );

  // Minimal adapter helpers
  await writeFile(
    path.join(mockRegistryDir, "adapters", "react", "use-bambi-controller.ts"),
    "export function useBambiController(): void {}\n",
  );
  await writeFile(
    path.join(mockRegistryDir, "adapters", "react", "create-react-part.tsx"),
    "import type { BambiPartDefinition } from '@bambiui/core/contract';\nexport function createReactPart(_part?: BambiPartDefinition): () => null { return () => null; }\n",
  );
  await writeFile(
    path.join(mockRegistryDir, "adapters", "react", "create-react-adapter.ts"),
    "export function createReactAdapter(): { Root: () => null } { return { Root: () => null }; }\n",
  );

  // Minimal React wrapper
  await writeFile(
    path.join(mockRegistryDir, "components", "prim-test", "react", "prim-test.react.tsx"),
    `import { createReactAdapter } from '@bambiui/adapters/react';\nimport { PrimTestController } from '@bambiui/core/components/prim-test.js';\nexport async function loadContract() { return import('@bambiui/core/components/prim-test/prim-test.contract.js'); }\nexport const PrimTest = createReactAdapter(PrimTestController);\n`,
  );

  // Global + component CSS
  await writeFile(path.join(mockRegistryDir, "styles", "bambi.css"), "/* mock global */\n");
  await writeFile(path.join(mockRegistryDir, "styles", "prim-test.css"), "/* mock component */\n");

  // Mock registry manifest
  await writeFile(
    path.join(mockRegistryDir, "registry.json"),
    JSON.stringify(
      {
        version: 2,
        styles: { global: "styles/bambi.css" },
        components: {
          "prim-test": {
            name: "prim-test",
            contract: "components/prim-test/prim-test.contract.ts",
            contractFiles: ["contract/types.ts", "contract/define-contract.ts"],
            controller: "components/prim-test/prim-test.controller.ts",
            style: "styles/prim-test.css",
            primitiveFiles: ["primitives/mock-primitive.ts"],
            adapter: {
              react: [
                "adapters/react/use-bambi-controller.ts",
                "adapters/react/create-react-part.tsx",
                "adapters/react/create-react-adapter.ts",
              ],
            },
            adapters: { react: { status: "active", mode: "generic" } },
            files: { react: ["components/prim-test/react/prim-test.react.tsx"] },
            exports: { react: ["PrimTest"] },
          },
        },
      },
      null,
      2,
    ),
  );

  await runCli([
    "add",
    "prim-test",
    "--framework",
    "react",
    "--cwd",
    mockProjectDir,
    "--registry-url",
    mockRegistryDir,
  ]);

  const implDir = path.join(mockProjectDir, "src", "components", "ui", "prim-test", "component");

  // Primitive must be inside primitives/ subdir
  assertExists(path.join(implDir, "primitives", "mock-primitive.ts"));

  // No @bambiui/ imports must remain anywhere in the generated output
  await assertNoAmbiguiImports(implDir);

  // The rewritten import must not keep the .js extension
  const controllerOutput = await readFile(path.join(implDir, "prim-test.controller.ts"), "utf8");
  if (controllerOutput.includes("./primitives/mock-primitive.js")) {
    throw new Error(
      "Expected .js extension to be stripped from rewritten primitive import path",
    );
  }
  if (
    !controllerOutput.includes(`'./primitives/mock-primitive'`) ||
    !controllerOutput.includes(`import('./primitives/mock-primitive')`)
  ) {
    throw new Error(
      `Expected rewritten static and dynamic primitive imports in controller output`,
    );
  }

  const partOutput = await readFile(path.join(implDir, "create-react-part.tsx"), "utf8");
  if (!partOutput.includes(`'./types'`)) {
    throw new Error("Expected single-quote @bambiui/core/contract import to rewrite to './types'");
  }

  const wrapperOutput = await readFile(path.join(implDir, "prim-test.react.tsx"), "utf8");
  if (
    !wrapperOutput.includes(`'./create-react-adapter'`) ||
    !wrapperOutput.includes(`'./prim-test.controller'`) ||
    !wrapperOutput.includes(`import('./prim-test.contract')`)
  ) {
    throw new Error("Expected single-quote adapter/component imports and dynamic contract import to rewrite locally");
  }

  process.stdout.write("  ✓ primitiveFiles copy and import rewrite\n");
} finally {
  await rm(mockRegistryDir, { force: true, recursive: true });
  await rm(mockProjectDir, { force: true, recursive: true });
}

process.stdout.write("CLI smoke tests passed.\n");
