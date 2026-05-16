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

  it("Tabs.svelte documents dynamic children limitation and {#key} workaround", () => {
    expect(result.files["Tabs.svelte"]).toContain("{#key}");
  });
});

describe("createArtifact — tabs/svelte part components (children handling)", () => {
  const parts = ["TabsList.svelte", "TabsTrigger.svelte", "TabsContent.svelte"];

  for (const filename of parts) {
    it(`${filename}: imports Snippet from svelte`, () => {
      expect(result.files[filename]).toContain('from "svelte"');
    });

    it(`${filename}: children declared in Props interface`, () => {
      expect(result.files[filename]).toContain("children?: Snippet");
    });

    it(`${filename}: children explicitly destructured before ...props`, () => {
      const src = result.files[filename];
      const match = src.match(/let \{([^}]+)\}/);
      expect(match).not.toBeNull();
      const destructure = match[1];
      const childrenIdx = destructure.indexOf("children");
      const propsIdx = destructure.indexOf("...props");
      expect(childrenIdx).toBeGreaterThanOrEqual(0);
      expect(propsIdx).toBeGreaterThan(childrenIdx);
    });

    it(`${filename}: renders via {@render children?.()}`, () => {
      expect(result.files[filename]).toContain("{@render children?.()}");
    });

    it(`${filename}: does not use props-as-cast for children`, () => {
      expect(result.files[filename]).not.toContain("props as { children");
      expect(result.files[filename]).not.toContain('import("svelte").Snippet');
    });
  }
});

describe("createArtifact — tabs/svelte event bridge", () => {
  it("Tabs.svelte adds onValueChange to Props interface", () => {
    expect(result.files["Tabs.svelte"]).toContain("onValueChange?: (detail: TabsValueChangeDetail) => void;");
  });

  it("Tabs.svelte explicitly destructures onValueChange (not left in ...props)", () => {
    expect(result.files["Tabs.svelte"]).toContain("onValueChange,");
  });

  it("Tabs.svelte listens to TABS_EVENT_VALUE_CHANGE in onMount and forwards to callback", () => {
    expect(result.files["Tabs.svelte"]).toContain("rootEl!.addEventListener(TABS_EVENT_VALUE_CHANGE, onValueChangeHandler)");
    expect(result.files["Tabs.svelte"]).toContain("onValueChange?.(e.detail)");
  });

  it("Tabs.svelte removes the event listener in the onMount return cleanup", () => {
    expect(result.files["Tabs.svelte"]).toContain("rootEl!.removeEventListener(TABS_EVENT_VALUE_CHANGE, onValueChangeHandler)");
    expect(result.files["Tabs.svelte"]).toContain("return () => {");
  });

  it("onValueChange is not passed to the behavior constructor or update", () => {
    const src = result.files["Tabs.svelte"];
    const constructorStart = src.indexOf("new TabsBehavior(rootEl!,");
    const constructorEnd = src.indexOf("behavior.sync();");
    const constructorBlock = src.slice(constructorStart, constructorEnd);
    expect(constructorBlock).not.toContain("onValueChange");

    const effectStart = src.indexOf("behavior?.update?.({");
    const effectEnd = src.indexOf("});", effectStart);
    expect(src.slice(effectStart, effectEnd)).not.toContain("onValueChange");
  });
});

describe("createArtifact — tabs/svelte fixture match", () => {
  const registryDir = `${root}/packages/registry/generated/tabs/svelte`;
  const fixtureFiles = ["Tabs.svelte", "TabsList.svelte", "TabsTrigger.svelte", "TabsContent.svelte", "index.ts"];
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
