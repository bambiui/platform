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
    framework: "svelte",
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

describe("createArtifact — tabs/svelte", () => {
  it("returns files map and usedHelpers", () => {
    expect(result).toHaveProperty("files");
    expect(result).toHaveProperty("usedHelpers");
    expect(typeof result.files["Tabs.svelte"]).toBe("string");
    expect(Array.isArray(result.usedHelpers)).toBe(true);
  });

  it("produces all expected files", () => {
    expect(result.files).toHaveProperty("Tabs.svelte");
    expect(result.files).toHaveProperty("TabsList.svelte");
    expect(result.files).toHaveProperty("TabsTrigger.svelte");
    expect(result.files).toHaveProperty("TabsContent.svelte");
    expect(result.files).toHaveProperty("index.ts");
  });

  it("detects expected shared helpers", () => {
    const helpers = [...result.usedHelpers].sort();
    expect(helpers).toContain("BambiBehavior");
    expect(helpers).toContain("getAttr");
    expect(helpers).toContain("setAttr");
    expect(helpers).toContain("getBoolAttr");
  });

  it("Tabs.svelte uses Svelte 5 runes", () => {
    expect(result.files["Tabs.svelte"]).toContain("$props()");
    expect(result.files["Tabs.svelte"]).toContain("$effect(");
    expect(result.files["Tabs.svelte"]).toContain("$derived(");
  });

  it("Tabs.svelte uses onMount for lifecycle", () => {
    expect(result.files["Tabs.svelte"]).toContain("onMount(");
  });

  it("Tabs.svelte imports from svelte", () => {
    expect(result.files["Tabs.svelte"]).toContain('from "svelte"');
  });

  it("Tabs.svelte does not use React or Solid APIs", () => {
    expect(result.files["Tabs.svelte"]).not.toContain('from "react"');
    expect(result.files["Tabs.svelte"]).not.toContain('from "solid-js"');
    expect(result.files["Tabs.svelte"]).not.toContain("useRef");
    expect(result.files["Tabs.svelte"]).not.toContain("useEffect");
  });

  it("Tabs.svelte contains inlined roving-focus primitive", () => {
    expect(result.files["Tabs.svelte"]).toContain("createRovingFocus");
    expect(result.files["Tabs.svelte"]).toContain("RovingFocusOptions");
  });

  it("Tabs.svelte contains TabsBehavior class", () => {
    expect(result.files["Tabs.svelte"]).toContain("class TabsBehavior");
    expect(result.files["Tabs.svelte"]).not.toContain("class TabsController");
  });

  it("Tabs.svelte imports helpers from ../bambi-helpers", () => {
    expect(result.files["Tabs.svelte"]).toContain('from "../bambi-helpers"');
  });

  it("index.ts re-exports all four components", () => {
    expect(result.files["index.ts"]).toContain('from "./Tabs.svelte"');
    expect(result.files["index.ts"]).toContain('from "./TabsList.svelte"');
    expect(result.files["index.ts"]).toContain('from "./TabsTrigger.svelte"');
    expect(result.files["index.ts"]).toContain('from "./TabsContent.svelte"');
  });

  it("Tabs.svelte does not contain forbidden bambiui imports", () => {
    expect(result.files["Tabs.svelte"]).not.toContain("@bambiui/core");
    expect(result.files["Tabs.svelte"]).not.toContain("@bambiui/adapters");
    expect(result.files["Tabs.svelte"]).not.toContain("tabs.controller");
    expect(result.files["Tabs.svelte"]).not.toContain("tabs.contract");
  });
});
