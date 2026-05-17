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
      defaultTypeParts: ["trigger"],
      defaultTypeValue: "button",
      defaultTypeValues: ["button", "submit", "reset"],
      ssrSelectedState: {
        selectedPropNames: ["value", "defaultValue"],
        valuePropName: "value",
        contextName: "bambi-tabs-value",
        parts: {
          trigger: {
            attributes: [
              { name: "role", value: "tab" },
              { name: "data-state", active: "active", inactive: "inactive" },
              { name: "aria-selected", active: true, inactive: false },
              { name: "tabIndex", svelteName: "tabindex", vueName: "tabindex", active: 0, inactive: -1 },
            ],
          },
          content: {
            attributes: [
              { name: "role", value: "tabpanel" },
              { name: "data-state", active: "active", inactive: "inactive" },
              { name: "hidden", active: false, inactive: true },
            ],
          },
        },
      },
    },
  });
});

describe("createArtifact — tabs/react", () => {
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

  it("output contains React hook usage", () => {
    expect(result.files["index.tsx"]).toContain("useRef");
    expect(result.files["index.tsx"]).toContain("useEffect");
  });

  it("output leaves CSS wiring to the CLI global stylesheet", () => {
    expect(result.files["index.tsx"]).not.toContain('import "./tabs.css"');
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
    expect(result.files["index.tsx"]).not.toContain("export interface RovingFocus");
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

describe("createArtifact — unknown framework", () => {
  it("throws for unsupported framework", () => {
    expect(() =>
      createArtifact({
        framework: "astro",
        contractSource,
        controllerSource,
        contractExportName: "tabsContract",
      }),
    ).toThrow(/No generator registered for framework/);
  });
});

describe("createArtifact — tabs/react event bridge", () => {
  it("output adds onValueChange to TabsProps interface", () => {
    expect(result.files["index.tsx"]).toContain("onValueChange?: (detail: TabsValueChangeDetail) => void;");
  });

  it("output adds useRef for onValueChange to prevent stale closures", () => {
    expect(result.files["index.tsx"]).toContain("const onValueChangeRef = React.useRef(onValueChange);");
    expect(result.files["index.tsx"]).toContain("onValueChangeRef.current = onValueChange;");
  });

  it("output listens to TABS_EVENT_VALUE_CHANGE and forwards to callback", () => {
    expect(result.files["index.tsx"]).toContain("root.addEventListener(TABS_EVENT_VALUE_CHANGE, onValueChangeHandler)");
    expect(result.files["index.tsx"]).toContain("onValueChangeRef.current?.(e.detail)");
  });

  it("output removes the event listener on cleanup", () => {
    expect(result.files["index.tsx"]).toContain("root.removeEventListener(TABS_EVENT_VALUE_CHANGE, onValueChangeHandler)");
  });

  it("onValueChange is not passed to the behavior constructor or update", () => {
    const src = result.files["index.tsx"];
    // Find the behavior constructor call range
    const constructorStart = src.indexOf("new TabsBehavior(root,");
    const constructorEnd = src.indexOf("behavior.sync();");
    const constructorBlock = src.slice(constructorStart, constructorEnd);
    expect(constructorBlock).not.toContain("onValueChange");

    // Find the update call range
    const updateStart = src.indexOf("behaviorRef.current?.update?.(");
    const updateEnd = src.indexOf("}, [", updateStart);
    const updateBlock = src.slice(updateStart, updateEnd);
    expect(updateBlock).not.toContain("onValueChange");
  });
});

describe("createArtifact — tabs/react fixture match", () => {
  const registryDir = `${root}/packages/registry/generated/tabs/react`;
  let committed;

  beforeAll(async () => {
    committed = await readFile(`${registryDir}/index.tsx`, "utf8");
  });

  it("index.tsx matches committed registry fixture", () => {
    expect(result.files["index.tsx"]).toBe(committed);
  });
});
