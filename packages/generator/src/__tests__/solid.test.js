import { describe, it, expect, beforeAll } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createArtifact } from "../index.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const tabsDir = `${root}/packages/core/src/components/tabs`;
const primitivesDir = `${root}/packages/core/src/primitives`;

let contractSource;
let controllerSource;
let rovingFocusSource;
let result;

beforeAll(async () => {
  contractSource = await readFile(`${tabsDir}/tabs.contract.ts`, "utf8");
  controllerSource = await readFile(`${tabsDir}/tabs.controller.ts`, "utf8");
  rovingFocusSource = await readFile(`${primitivesDir}/roving-focus.ts`, "utf8");
  result = createArtifact({
    framework: "solid",
    contractSource,
    controllerSource,
    primitiveFiles: [rovingFocusSource],
    contractExportName: "tabsContract",
    generatorOptions: {
      valuePropName: "value",
      valuePropParts: ["trigger", "content"],
      disabledPropName: "disabled",
      disabledPropParts: ["trigger"],
    },
  });
});

describe("createArtifact — tabs/solid", () => {
  it("returns files map and usedHelpers", () => {
    expect(result).toHaveProperty("files");
    expect(result).toHaveProperty("usedHelpers");
    expect(typeof result.files["index.tsx"]).toBe("string");
    expect(Array.isArray(result.usedHelpers)).toBe(true);
  });

  it("detects expected shared helpers", () => {
    const helpers = [...result.usedHelpers].sort();
    expect(helpers).toContain("BambiBehavior");
    expect(helpers).toContain("getAttr");
    expect(helpers).toContain("setAttr");
    expect(helpers).toContain("getBoolAttr");
  });

  it("output uses Solid lifecycle primitives", () => {
    expect(result.files["index.tsx"]).toContain("onMount");
    expect(result.files["index.tsx"]).toContain("onCleanup");
    expect(result.files["index.tsx"]).toContain("createEffect");
  });

  it("output imports from solid-js", () => {
    expect(result.files["index.tsx"]).toContain('from "solid-js"');
  });

  it("output imports children helper for dynamic slot tracking", () => {
    expect(result.files["index.tsx"]).toContain("children");
    expect(result.files["index.tsx"]).toContain("resolvedChildren");
  });

  it("output does not use React hooks", () => {
    expect(result.files["index.tsx"]).not.toContain("useRef");
    expect(result.files["index.tsx"]).not.toContain("useEffect");
    expect(result.files["index.tsx"]).not.toContain('from "react"');
  });

  it("output exports expected component names", () => {
    expect(result.files["index.tsx"]).toContain("export function Tabs(");
    expect(result.files["index.tsx"]).toContain("export function TabsList(");
    expect(result.files["index.tsx"]).toContain("export function TabsTrigger(");
    expect(result.files["index.tsx"]).toContain("export function TabsContent(");
  });

  it("output contains inlined roving-focus primitive", () => {
    expect(result.files["index.tsx"]).toContain("createRovingFocus");
    expect(result.files["index.tsx"]).toContain("RovingFocusOptions");
  });

  it("inlined primitive has no export keywords on its own declarations", () => {
    expect(result.files["index.tsx"]).not.toContain("export interface RovingFocusOptions");
    expect(result.files["index.tsx"]).not.toContain("export function createRovingFocus");
  });

  it("output contains TabsBehavior class (renamed from TabsController)", () => {
    expect(result.files["index.tsx"]).toContain("class TabsBehavior");
    expect(result.files["index.tsx"]).not.toContain("class TabsController");
  });

  it("output does not contain forbidden bambiui imports", () => {
    expect(result.files["index.tsx"]).not.toContain("@bambiui/core");
    expect(result.files["index.tsx"]).not.toContain("@bambiui/adapters");
    expect(result.files["index.tsx"]).not.toContain("tabs.controller");
    expect(result.files["index.tsx"]).not.toContain("tabs.contract");
  });

  it("output imports helpers from ../bambi-helpers", () => {
    expect(result.files["index.tsx"]).toContain('from "../bambi-helpers"');
  });
});

describe("createArtifact — tabs/solid fixture match", () => {
  const registryDir = `${root}/packages/registry/generated/tabs/solid`;
  let committed;

  beforeAll(async () => {
    committed = await readFile(`${registryDir}/index.tsx`, "utf8");
  });

  it("index.tsx matches committed registry fixture", () => {
    expect(result.files["index.tsx"]).toBe(committed);
  });
});
