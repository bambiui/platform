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

describe("createArtifact — tabs/solid part components (prop leak guard)", () => {
  it("TabsList uses splitProps — spreads rest, not props", () => {
    const src = result.files["index.tsx"];
    const tabsListFn = src.slice(src.indexOf("export function TabsList("));
    expect(tabsListFn).toContain("splitProps(props");
    expect(tabsListFn).toContain("{...rest}");
    expect(tabsListFn).not.toContain("{...props}");
  });

  it("TabsList renders children from local, not from props spread", () => {
    const src = result.files["index.tsx"];
    const tabsListFn = src.slice(src.indexOf("export function TabsList("), src.indexOf("export function TabsTrigger("));
    expect(tabsListFn).toContain("{local.children}");
    expect(tabsListFn).not.toContain("{props.children}");
  });

  it("TabsTrigger uses splitProps — spreads rest, not props", () => {
    const src = result.files["index.tsx"];
    const triggerFn = src.slice(src.indexOf("export function TabsTrigger("), src.indexOf("export function TabsContent("));
    expect(triggerFn).toContain("splitProps(props");
    expect(triggerFn).toContain("{...rest}");
    expect(triggerFn).not.toContain("{...props}");
  });

  it("TabsTrigger uses local.value/disabled — does not leak value to DOM spread", () => {
    const src = result.files["index.tsx"];
    const triggerFn = src.slice(src.indexOf("export function TabsTrigger("), src.indexOf("export function TabsContent("));
    expect(triggerFn).toContain("local.value");
    expect(triggerFn).toContain("local.disabled");
    expect(triggerFn).toContain("{local.children}");
  });

  it("TabsContent uses splitProps — value not leaked to DOM as plain attribute", () => {
    const src = result.files["index.tsx"];
    const contentFn = src.slice(src.indexOf("export function TabsContent("));
    expect(contentFn).toContain("splitProps(props");
    expect(contentFn).toContain("{...rest}");
    expect(contentFn).not.toContain("{...props}");
    expect(contentFn).toContain("local.value");
    expect(contentFn).toContain("{local.children}");
  });
});

describe("createArtifact — tabs/solid event bridge", () => {
  it("output adds onValueChange to TabsProps interface", () => {
    expect(result.files["index.tsx"]).toContain("onValueChange?: (detail: TabsValueChangeDetail) => void;");
  });

  it("onValueChange is included in splitProps keys to avoid DOM spread", () => {
    expect(result.files["index.tsx"]).toContain('"onValueChange"');
  });

  it("output listens to TABS_EVENT_VALUE_CHANGE in onMount and forwards to callback", () => {
    expect(result.files["index.tsx"]).toContain("rootRef!.addEventListener(TABS_EVENT_VALUE_CHANGE, onValueChangeHandler)");
    expect(result.files["index.tsx"]).toContain("local.onValueChange?.(e.detail)");
  });

  it("output removes the event listener in onCleanup", () => {
    expect(result.files["index.tsx"]).toContain("rootRef!.removeEventListener(TABS_EVENT_VALUE_CHANGE, onValueChangeHandler)");
  });

  it("onValueChange is not passed to the behavior constructor or update", () => {
    const src = result.files["index.tsx"];
    const constructorStart = src.indexOf("new TabsBehavior(rootRef!,");
    const constructorEnd = src.indexOf("behavior.sync();");
    const constructorBlock = src.slice(constructorStart, constructorEnd);
    expect(constructorBlock).not.toContain("onValueChange");

    const updateStart = src.indexOf("behavior.update?.({");
    const updateEnd = src.indexOf("});", updateStart);
    expect(src.slice(updateStart, updateEnd)).not.toContain("onValueChange");
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
