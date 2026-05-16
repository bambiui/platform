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
    framework: "vue",
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

describe("createArtifact — tabs/vue", () => {
  it("returns files map and usedHelpers", () => {
    expect(result).toHaveProperty("files");
    expect(result).toHaveProperty("usedHelpers");
    expect(typeof result.files["Tabs.vue"]).toBe("string");
    expect(Array.isArray(result.usedHelpers)).toBe(true);
  });

  it("produces all expected files", () => {
    expect(result.files).toHaveProperty("Tabs.vue");
    expect(result.files).toHaveProperty("TabsList.vue");
    expect(result.files).toHaveProperty("TabsTrigger.vue");
    expect(result.files).toHaveProperty("TabsContent.vue");
    expect(result.files).toHaveProperty("index.ts");
  });

  it("detects expected shared helpers", () => {
    const helpers = [...result.usedHelpers].sort();
    expect(helpers).toContain("BambiBehavior");
    expect(helpers).toContain("getAttr");
    expect(helpers).toContain("setAttr");
    expect(helpers).toContain("getBoolAttr");
  });

  it("Tabs.vue uses Vue Composition API", () => {
    expect(result.files["Tabs.vue"]).toContain("defineProps");
    expect(result.files["Tabs.vue"]).toContain("onMounted");
    expect(result.files["Tabs.vue"]).toContain("onUnmounted");
    expect(result.files["Tabs.vue"]).toContain("watch(");
    expect(result.files["Tabs.vue"]).toContain("computed(");
  });

  it("Tabs.vue uses script setup syntax", () => {
    expect(result.files["Tabs.vue"]).toContain("<script setup");
    expect(result.files["Tabs.vue"]).toContain("<template>");
  });

  it("Tabs.vue imports from vue", () => {
    expect(result.files["Tabs.vue"]).toContain('from "vue"');
  });

  it("Tabs.vue does not use React or Solid APIs", () => {
    expect(result.files["Tabs.vue"]).not.toContain('from "react"');
    expect(result.files["Tabs.vue"]).not.toContain('from "solid-js"');
    expect(result.files["Tabs.vue"]).not.toContain("useRef");
    expect(result.files["Tabs.vue"]).not.toContain("useEffect");
  });

  it("Tabs.vue contains inlined roving-focus primitive", () => {
    expect(result.files["Tabs.vue"]).toContain("createRovingFocus");
    expect(result.files["Tabs.vue"]).toContain("RovingFocusOptions");
  });

  it("Tabs.vue contains TabsBehavior class", () => {
    expect(result.files["Tabs.vue"]).toContain("class TabsBehavior");
    expect(result.files["Tabs.vue"]).not.toContain("class TabsController");
  });

  it("Tabs.vue imports helpers from ../bambi-helpers", () => {
    expect(result.files["Tabs.vue"]).toContain('from "../bambi-helpers"');
  });

  it("index.ts re-exports all four components", () => {
    expect(result.files["index.ts"]).toContain('from "./Tabs.vue"');
    expect(result.files["index.ts"]).toContain('from "./TabsList.vue"');
    expect(result.files["index.ts"]).toContain('from "./TabsTrigger.vue"');
    expect(result.files["index.ts"]).toContain('from "./TabsContent.vue"');
  });

  it("Tabs.vue does not contain forbidden bambiui imports", () => {
    expect(result.files["Tabs.vue"]).not.toContain("@bambiui/core");
    expect(result.files["Tabs.vue"]).not.toContain("@bambiui/adapters");
    expect(result.files["Tabs.vue"]).not.toContain("tabs.controller");
    expect(result.files["Tabs.vue"]).not.toContain("tabs.contract");
  });
});
