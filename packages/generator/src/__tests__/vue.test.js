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

  it("Tabs.vue uses onUpdated for dynamic slot/child tracking", () => {
    expect(result.files["Tabs.vue"]).toContain("onUpdated(");
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

describe("createArtifact — tabs/vue $attrs order guard", () => {
  it("Tabs.vue: v-bind=\"$attrs\" appears before data-bambi-tabs protocol attr", () => {
    const src = result.files["Tabs.vue"];
    const attrsIdx = src.indexOf('v-bind="$attrs"');
    const protocolIdx = src.indexOf('data-bambi-tabs=""');
    expect(attrsIdx).toBeGreaterThanOrEqual(0);
    expect(protocolIdx).toBeGreaterThanOrEqual(0);
    expect(attrsIdx).toBeLessThan(protocolIdx);
  });

  it("TabsList.vue: v-bind=\"$attrs\" appears before data-bambi-tabs-list protocol attr", () => {
    const src = result.files["TabsList.vue"];
    const attrsIdx = src.indexOf('v-bind="$attrs"');
    const protocolIdx = src.indexOf('data-bambi-tabs-list=""');
    expect(attrsIdx).toBeGreaterThanOrEqual(0);
    expect(protocolIdx).toBeGreaterThanOrEqual(0);
    expect(attrsIdx).toBeLessThan(protocolIdx);
  });

  it("TabsTrigger.vue: v-bind=\"$attrs\" appears before data-bambi-tabs-trigger protocol attr", () => {
    const src = result.files["TabsTrigger.vue"];
    const attrsIdx = src.indexOf('v-bind="$attrs"');
    const protocolIdx = src.indexOf('data-bambi-tabs-trigger=""');
    expect(attrsIdx).toBeGreaterThanOrEqual(0);
    expect(protocolIdx).toBeGreaterThanOrEqual(0);
    expect(attrsIdx).toBeLessThan(protocolIdx);
  });

  it("TabsContent.vue: v-bind=\"$attrs\" appears before data-bambi-tabs-content protocol attr", () => {
    const src = result.files["TabsContent.vue"];
    const attrsIdx = src.indexOf('v-bind="$attrs"');
    const protocolIdx = src.indexOf('data-bambi-tabs-content=""');
    expect(attrsIdx).toBeGreaterThanOrEqual(0);
    expect(protocolIdx).toBeGreaterThanOrEqual(0);
    expect(attrsIdx).toBeLessThan(protocolIdx);
  });

  it("Tabs.vue: v-bind=\"$attrs\" appears before :data-value protocol attr", () => {
    const src = result.files["Tabs.vue"];
    const attrsIdx = src.indexOf('v-bind="$attrs"');
    const valueIdx = src.indexOf(':data-value=');
    expect(attrsIdx).toBeGreaterThanOrEqual(0);
    expect(valueIdx).toBeGreaterThanOrEqual(0);
    expect(attrsIdx).toBeLessThan(valueIdx);
  });

  it("TabsTrigger.vue: v-bind=\"$attrs\" appears before :data-value protocol attr", () => {
    const src = result.files["TabsTrigger.vue"];
    const attrsIdx = src.indexOf('v-bind="$attrs"');
    const valueIdx = src.indexOf(':data-value=');
    expect(attrsIdx).toBeGreaterThanOrEqual(0);
    expect(valueIdx).toBeGreaterThanOrEqual(0);
    expect(attrsIdx).toBeLessThan(valueIdx);
  });

  it("TabsContent.vue: v-bind=\"$attrs\" appears before :data-value protocol attr", () => {
    const src = result.files["TabsContent.vue"];
    const attrsIdx = src.indexOf('v-bind="$attrs"');
    const valueIdx = src.indexOf(':data-value=');
    expect(attrsIdx).toBeGreaterThanOrEqual(0);
    expect(valueIdx).toBeGreaterThanOrEqual(0);
    expect(attrsIdx).toBeLessThan(valueIdx);
  });
});

describe("createArtifact — tabs/vue fixture match", () => {
  const registryDir = `${root}/packages/registry/generated/tabs/vue`;
  const fixtureFiles = ["Tabs.vue", "TabsList.vue", "TabsTrigger.vue", "TabsContent.vue", "index.ts"];
  const fixtures = {};

  beforeAll(async () => {
    for (const filename of fixtureFiles) {
      fixtures[filename] = await readFile(`${registryDir}/${filename}`, "utf8");
    }
  });

  for (const filename of fixtureFiles) {
    it(`${filename} matches committed registry fixture`, () => {
      expect(result.files[filename]).toBe(fixtures[filename]);
    });
  }
});
