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
    framework: "react",
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

describe("createArtifact — tabs/react", () => {
  it("returns content and usedHelpers", () => {
    expect(result).toHaveProperty("content");
    expect(result).toHaveProperty("usedHelpers");
    expect(typeof result.content).toBe("string");
    expect(Array.isArray(result.usedHelpers)).toBe(true);
  });

  it("detects expected shared helpers", () => {
    const helpers = [...result.usedHelpers].sort();
    expect(helpers).toContain("BambiBehavior");
    expect(helpers).toContain("getAttr");
    expect(helpers).toContain("setAttr");
    expect(helpers).toContain("getBoolAttr");
  });

  it("output contains React hook usage", () => {
    expect(result.content).toContain("useRef");
    expect(result.content).toContain("useEffect");
  });

  it("output exports expected component names", () => {
    expect(result.content).toContain("export function Tabs(");
    expect(result.content).toContain("export function TabsList(");
    expect(result.content).toContain("export function TabsTrigger(");
    expect(result.content).toContain("export function TabsContent(");
  });

  it("output contains inlined roving-focus primitive", () => {
    expect(result.content).toContain("createRovingFocus");
    expect(result.content).toContain("RovingFocusOptions");
  });

  it("inlined primitive has no export keywords on its own declarations", () => {
    expect(result.content).not.toContain("export interface RovingFocusOptions");
    expect(result.content).not.toContain("export interface RovingFocus");
    expect(result.content).not.toContain("export function createRovingFocus");
  });

  it("output contains TabsBehavior class (renamed from TabsController)", () => {
    expect(result.content).toContain("class TabsBehavior");
    expect(result.content).not.toContain("class TabsController");
  });

  it("output does not contain forbidden bambiui imports", () => {
    expect(result.content).not.toContain("@bambiui/core");
    expect(result.content).not.toContain("@bambiui/adapters");
    expect(result.content).not.toContain("tabs.controller");
    expect(result.content).not.toContain("tabs.contract");
  });

  it("output imports helpers from ../bambi-helpers", () => {
    expect(result.content).toContain('from "../bambi-helpers"');
  });
});

describe("createArtifact — unknown framework", () => {
  it("throws for unsupported framework", () => {
    expect(() =>
      createArtifact({
        framework: "vue",
        contractSource,
        controllerSource,
        contractExportName: "tabsContract",
      }),
    ).toThrow(/No generator registered for framework/);
  });
});
