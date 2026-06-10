import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const fixtureDir = path.join(root, ".tmp-cli-smoke");
const cliPath = path.join(root, "dist-cli/index.js");
const tscPath = path.join(root, "node_modules/.bin/tsc");

async function run(args) {
  const result = await execFileAsync(process.execPath, [cliPath, ...args], {
    cwd: root,
  });

  return `${result.stdout}${result.stderr}`;
}

async function runFail(args) {
  try {
    await run(args);
  } catch (error) {
    return `${error.stdout ?? ""}${error.stderr ?? ""}`;
  }

  throw new Error(`Expected command to fail: ${args.join(" ")}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readFixture(relativePath) {
  return readFile(path.join(fixtureDir, relativePath), "utf8");
}

async function assertExists(relativePath) {
  const fullPath = path.join(fixtureDir, relativePath);
  assert(existsSync(fullPath), `Expected ${relativePath} to exist.`);
}

async function assertGeneratedOutputCompiles(targetDir = fixtureDir) {
  const tsconfigPath = path.join(targetDir, "tsconfig.generated.json");

  await writeFile(
    tsconfigPath,
    `${JSON.stringify(
      {
        compilerOptions: {
          target: "ES2023",
          module: "ESNext",
          lib: ["ES2023", "DOM"],
          moduleResolution: "Bundler",
          strict: true,
          skipLibCheck: true,
          noEmit: true,
        },
        include: ["generated/**/*.ts"],
        exclude: ["generated/react/**/*.ts", "generated/**/*.tsx"],
      },
      null,
      2,
    )}\n`,
  );

  try {
    await execFileAsync(tscPath, ["--project", tsconfigPath], {
      cwd: fixtureDir,
    });
  } catch (error) {
    const output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
    throw new Error(`Generated TypeScript did not compile.\n${output}`);
  }
}

async function assertFrameworkTsxCompiles(targetDir, framework) {
  const stubsDir = path.join(targetDir, "stubs");
  const tsconfigPath = path.join(targetDir, `tsconfig.${framework}.json`);
  await mkdir(stubsDir, { recursive: true });

  await writeFile(
    path.join(stubsDir, "framework.d.ts"),
    `declare namespace JSX {
  interface IntrinsicElements {
    [name: string]: Record<string, unknown>;
  }
}

declare module "*.css" {}

declare module "react" {
  export type ReactNode = unknown;
  export type DependencyList = readonly unknown[];
  export type ElementType = keyof JSX.IntrinsicElements | ((props: Record<string, unknown>) => unknown);
  export type ComponentPropsWithoutRef<T extends ElementType> = HTMLAttributes<HTMLElement> & { as?: T; children?: ReactNode; };
  export namespace JSX {
    export type Element = unknown;
    export interface IntrinsicElements {
      [name: string]: Record<string, unknown>;
    }
  }
  export interface RefObject<T> { current: T; }
  export interface HTMLAttributes<T> { children?: ReactNode; [key: string]: unknown; }
  export function createElement(type: unknown, props?: unknown, ...children: unknown[]): unknown;
  export function forwardRef<T, P>(render: (props: P, ref: unknown) => unknown): (props: P & { children?: ReactNode }) => unknown;
  export function useEffect(effect: () => void | (() => void), deps?: DependencyList): void;
  export function useImperativeHandle<T>(ref: unknown, init: () => T, deps?: DependencyList): void;
  export function useRef<T>(value: T | null): { current: T | null };
}

declare module "solid-js" {
  export namespace JSX { interface HTMLAttributes<T> { [key: string]: unknown; } }
  export function createEffect(fn: () => void): void;
  export function onCleanup(fn: () => void): void;
  export function onMount(fn: () => void): void;
  export function splitProps<T, K extends readonly (keyof T)[]>(props: T, keys: K): [Pick<T, K[number]>, Omit<T, K[number]>];
}
`,
  );

  await writeFile(
    tsconfigPath,
    `${JSON.stringify(
      {
        compilerOptions: {
          target: "ES2023",
          module: "ESNext",
          lib: ["ES2023", "DOM"],
          jsx: "preserve",
          moduleResolution: "Bundler",
          strict: true,
          skipLibCheck: true,
          noEmit: true,
        },
        include: ["generated/**/*.tsx", "generated/**/*.ts", "stubs/**/*.d.ts"],
      },
      null,
      2,
    )}\n`,
  );

  try {
    await execFileAsync(tscPath, ["--project", tsconfigPath], {
      cwd: targetDir,
    });
  } catch (error) {
    const output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
    throw new Error(`Generated ${framework} TSX did not compile.\n${output}`);
  }
}

function frameworkButtonPath(framework) {
  if (framework === "solid") return "generated/solid/button.tsx";
  if (framework === "svelte") return "generated/svelte/Button.svelte";
  if (framework === "vue") return "generated/vue/Button.vue";
  throw new Error(`No framework button path configured for ${framework}.`);
}

async function assertFrameworkAdd(framework) {
  const targetDir = path.join(fixtureDir, framework);
  await mkdir(targetDir, { recursive: true });

  const output = await run([
    "add",
    "button",
    "--cwd",
    targetDir,
    "--framework",
    framework,
  ]);

  assert(
    output.includes(`Added button for ${framework}`),
    `${framework} add did not succeed.`,
  );
  assert(
    output.includes(
      frameworkButtonPath(framework)
        .replace(/^generated\//, "./generated/")
        .replace(/\.tsx$/, "")
        .replace(/\.vue$/, ".vue")
        .replace(/\.svelte$/, ".svelte"),
    ),
    `${framework} output should include native component import hint.`,
  );
  assert(
    existsSync(path.join(targetDir, "generated/components/button.ts")),
    `${framework} should generate the local button source file.`,
  );
  assert(
    !existsSync(path.join(targetDir, "generated/react/button.tsx")),
    `${framework} should not generate React-specific component files.`,
  );

  const nativeButtonPath = frameworkButtonPath(framework);
  assert(
    existsSync(path.join(targetDir, nativeButtonPath)),
    `${framework} should generate a native Button component file.`,
  );

  const nativeButton = await readFile(
    path.join(targetDir, nativeButtonPath),
    "utf8",
  );
  assert(
    nativeButton.includes('from "../components/button"'),
    `${framework} Button should import local button behavior script.`,
  );
  assert(
    nativeButton.includes('import "../styles/button.css";'),
    `${framework} Button should import local button style.`,
  );
  assert(
    nativeButton.includes("button.mount"),
    `${framework} Button should mount local behavior.`,
  );

  await assertGeneratedOutputCompiles(targetDir);
  if (framework === "solid") {
    await assertFrameworkTsxCompiles(targetDir, framework);
  }
}

async function main() {
  await rm(fixtureDir, { force: true, recursive: true });
  await mkdir(fixtureDir, { recursive: true });

  const helpOutput = await run(["--help"]);
  assert(
    helpOutput.includes("bambi add tabs"),
    "Help output is missing add usage.",
  );
  assert(
    helpOutput.includes("bambi doctor") &&
      helpOutput.includes("bambi list") &&
      helpOutput.includes("bambi list --json") &&
      helpOutput.includes("--dry-run") &&
      helpOutput.includes("--plan"),
    "Help output should advertise doctor, list, list json, dry-run, and plan usage.",
  );

  const doctorOutput = await run(["doctor", "--cwd", fixtureDir]);
  assert(
    doctorOutput.includes("bambi") && doctorOutput.includes("doctor"),
    "Doctor output should render a human-readable report.",
  );

  const doctorJson = JSON.parse(
    await run(["doctor", "--cwd", fixtureDir, "--json"]),
  );
  assert(
    doctorJson.ok === true &&
      doctorJson.checks.some((check) => check.name === "config") &&
      doctorJson.checks.some((check) => check.name === "components") &&
      doctorJson.checks.some((check) => check.name === "writable-out-dir"),
    "Doctor JSON output should expose successful checks.",
  );

  const listOutput = await run(["list"]);
  assert(
    listOutput.includes("Available components:") &&
      listOutput.includes("button") &&
      listOutput.includes("tabs"),
    "List output should show available components.",
  );
  assert(
    listOutput.includes("Supported frameworks:") &&
      listOutput.includes("react") &&
      listOutput.includes("vue"),
    "List output should show supported frameworks.",
  );

  const listJson = JSON.parse(await run(["list", "--json"]));
  assert(
    listJson.components.some((component) => component.name === "button") &&
      listJson.frameworks.includes("svelte"),
    "List JSON output should expose components and frameworks.",
  );

  const badComponentOutput = await runFail(["add", "tab"]);
  assert(
    badComponentOutput.includes('Did you mean "tabs"?'),
    "Unknown component output should suggest the closest component.",
  );

  const badFrameworkOutput = await runFail([
    "add",
    "button",
    "--framework",
    "reat",
  ]);
  assert(
    badFrameworkOutput.includes('Did you mean "react"?'),
    "Unknown framework output should suggest the closest framework.",
  );

  const badCommandOutput = await runFail(["lst"]);
  assert(
    badCommandOutput.includes('Did you mean "list"?'),
    "Unknown command output should suggest the closest command.",
  );

  const planOutput = JSON.parse(
    await run([
      "add",
      "tabs",
      "--cwd",
      fixtureDir,
      "--framework",
      "react",
      "--plan",
    ]),
  );
  assert(
    planOutput.componentName === "tabs" &&
      planOutput.framework === "react" &&
      planOutput.files.some((file) => file.target.endsWith("react/tabs.tsx")),
    "Add plan should expose generated framework files without writing.",
  );

  const dryRunDir = path.join(fixtureDir, "dry-run");
  await mkdir(dryRunDir, { recursive: true });
  const dryRunOutput = await run([
    "add",
    "button",
    "--cwd",
    dryRunDir,
    "--dry-run",
  ]);
  assert(
    dryRunOutput.includes("Would add button for vanilla"),
    "Dry run add should report planned install without writing.",
  );
  assert(
    !existsSync(path.join(dryRunDir, "generated/components/button.ts")),
    "Dry run add should not write generated component files.",
  );

  const initOutput = await run([
    "init",
    "--cwd",
    fixtureDir,
    "--framework",
    "vanilla",
    "--yes",
  ]);
  assert(
    initOutput.includes("bambi is ready"),
    "Init output did not finish successfully.",
  );

  const config = JSON.parse(await readFixture("bambi.config.json"));
  assert(config.framework === "vanilla", "Config framework should be vanilla.");
  assert(config.outDir === "generated", "Config outDir should be generated.");

  const buttonOutput = await run([
    "add",
    "button",
    "--cwd",
    fixtureDir,
    "--framework",
    "vanilla",
  ]);
  assert(
    buttonOutput.includes("Added button for vanilla"),
    "Button add did not succeed.",
  );

  await assertExists("generated/components/button.ts");
  await assertExists("generated/shared/define-component.ts");
  await assertExists("generated/styles/button.css");
  await assertExists("generated/auto-init.ts");

  const generatedButton = await readFixture("generated/components/button.ts");
  assert(
    generatedButton.includes('from "../shared/define-component"'),
    "Button source should import generated define-component helper.",
  );
  assert(
    generatedButton.includes('from "../shared/props"'),
    "Button source should import generated props helper.",
  );
  assert(
    generatedButton.includes('from "../shared/attributes"'),
    "Button source should import generated attributes helper.",
  );
  assert(
    !generatedButton.includes("../../shared"),
    "Button source should not keep authoring shared imports.",
  );

  const skipOutput = await run([
    "add",
    "button",
    "--cwd",
    fixtureDir,
    "--framework",
    "vanilla",
  ]);
  assert(
    skipOutput.includes("skipped"),
    "Second button add should skip existing files.",
  );

  const reactOutput = await run([
    "add",
    "tabs",
    "--cwd",
    fixtureDir,
    "--framework",
    "react",
  ]);
  assert(
    reactOutput.includes("Added tabs for react"),
    "Tabs react add did not succeed.",
  );
  assert(
    reactOutput.includes("Tabs, TabsList, TabsTrigger, TabsContent"),
    "Tabs react output should include compound component import hint.",
  );

  await assertExists("generated/components/tabs.ts");
  await assertExists("generated/react/use-bambi.ts");
  await assertExists("generated/react/attrs.ts");
  await assertExists("generated/react/button.tsx");
  await assertExists("generated/react/tabs.tsx");

  const reactButton = await readFixture("generated/react/button.tsx");
  assert(
    reactButton.includes('from "../components/button"'),
    "React Button should import local button behavior script.",
  );
  assert(
    reactButton.includes('import "../styles/button.css";'),
    "React Button should import local button style.",
  );
  assert(
    reactButton.includes("export interface ButtonProps"),
    "React Button should expose typed props.",
  );
  assert(
    reactButton.includes("button.mount"),
    "React Button should mount the local button behavior.",
  );

  const reactTabs = await readFixture("generated/react/tabs.tsx");
  assert(
    reactTabs.includes('from "../components/tabs"'),
    "React Tabs should import local tabs behavior script.",
  );
  assert(
    reactTabs.includes('import "../styles/tabs.css";'),
    "React Tabs should import local tabs style.",
  );
  assert(
    reactTabs.includes("export const Tabs = forwardRef"),
    "React Tabs should expose a root component.",
  );
  assert(
    reactTabs.includes("export const TabsTrigger"),
    "React Tabs should expose a trigger component.",
  );
  assert(
    reactTabs.includes("tabs.mount"),
    "React Tabs should mount the local tabs behavior.",
  );

  const generatedTabs = await readFixture("generated/components/tabs.ts");
  assert(
    generatedTabs.includes('from "../shared/lifecycle"'),
    "Tabs source should import generated lifecycle helper.",
  );
  assert(
    generatedTabs.includes('from "../shared/keyboard"'),
    "Tabs source should import generated keyboard helper.",
  );
  assert(
    !generatedTabs.includes("../../shared"),
    "Tabs source should not keep authoring shared imports.",
  );

  const autoInit = await readFixture("generated/auto-init.ts");
  assert(
    autoInit.includes('import { button } from "./components/button";'),
    "auto-init should keep previously installed button component.",
  );
  assert(
    autoInit.includes('import { tabs } from "./components/tabs";'),
    "auto-init should include newly installed tabs component.",
  );
  assert(
    autoInit.includes("export const components = [button, tabs] as const;"),
    "auto-init should only initialize installed components in registry order.",
  );
  assert(
    autoInit.includes('typeof document === "undefined"'),
    "auto-init should not directly access document in SSR environments.",
  );
  assert(
    autoInit.includes("if (!root) return;"),
    "auto-init should no-op when no DOM root is available.",
  );

  const stylesIndex = await readFixture("generated/styles/index.css");
  assert(
    stylesIndex.includes('@import "./button.css";'),
    "styles index should keep previously installed button styles.",
  );
  assert(
    stylesIndex.includes('@import "./tabs.css";'),
    "styles index should include newly installed tabs styles.",
  );

  const reactAttrs = await readFixture("generated/react/attrs.ts");
  assert(
    reactAttrs.includes("tabsAttrs"),
    "React attrs should include generic root attrs for tabs.",
  );

  await assertGeneratedOutputCompiles();
  await assertFrameworkTsxCompiles(fixtureDir, "react");

  await assertFrameworkAdd("solid");
  await assertFrameworkAdd("svelte");
  await assertFrameworkAdd("vue");

  await rm(fixtureDir, { force: true, recursive: true });
  process.stdout.write("CLI smoke passed.\n");
}

main().catch(async (error) => {
  await rm(fixtureDir, { force: true, recursive: true });
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
