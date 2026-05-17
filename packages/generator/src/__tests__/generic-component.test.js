import { describe, expect, it } from "vitest";
import { createArtifact } from "../index.js";
import { KNOWN_FRAMEWORKS } from "../../../../scripts/frameworks.mjs";

const contractSource = `import { defineContract } from "../../../contract/define-contract.js";

export const NOTICE_ROOT = "data-bambi-notice" as const;
export const NOTICE_TITLE = "data-bambi-notice-title" as const;
export const NOTICE_DESCRIPTION = "data-bambi-notice-description" as const;
export const NOTICE_ACTION = "data-bambi-notice-action" as const;
export const NOTICE_TONE = "data-tone" as const;

export type NoticeTone = "info" | "warning";

export const noticeContract = defineContract({
  name: "notice",
  parts: [
    { name: "root", selector: \`[\${NOTICE_ROOT}]\`, attribute: NOTICE_ROOT, element: "div" },
    { name: "title", selector: \`[\${NOTICE_TITLE}]\`, attribute: NOTICE_TITLE, element: "div" },
    { name: "description", selector: \`[\${NOTICE_DESCRIPTION}]\`, attribute: NOTICE_DESCRIPTION, element: "div" },
    { name: "action", selector: \`[\${NOTICE_ACTION}]\`, attribute: NOTICE_ACTION, element: "button" },
  ],
  props: {
    tone: { type: ["info", "warning"], attribute: NOTICE_TONE, defaultValue: "info" },
  },
} as const);
`;

const controllerSource = `export type NoticeTone = "info" | "warning";

export interface NoticeOptions {
  tone?: NoticeTone;
}

export class NoticeController {
  private options: NoticeOptions;

  constructor(private root: Element, options: NoticeOptions = {}) {
    this.options = options;
  }

  sync(): void {
    this.update(this.options);
  }

  update(options: NoticeOptions = {}): void {
    this.options = { ...this.options, ...options };
    this.root.setAttribute("data-tone", this.options.tone ?? "info");
  }

  destroy(): void {}
}
`;

const expectedFiles = {
  react: ["index.tsx"],
  solid: ["index.tsx"],
  svelte: ["Notice.svelte", "NoticeTitle.svelte", "NoticeDescription.svelte", "NoticeAction.svelte", "index.ts"],
  vue: ["Notice.vue", "NoticeTitle.vue", "NoticeDescription.vue", "NoticeAction.vue", "index.ts"],
};

describe("createArtifact — generic uncontrolled component", () => {
  it("test fixture covers every known framework", () => {
    expect(Object.keys(expectedFiles).sort()).toEqual([...KNOWN_FRAMEWORKS].sort());
  });

  for (const framework of KNOWN_FRAMEWORKS) {
    it(`${framework}: generates tabs-independent output without helpers or controlled option`, () => {
      const result = createArtifact({
        framework,
        contractSource,
        controllerSource,
        contractExportName: "noticeContract",
      });

      expect(Object.keys(result.files).sort()).toEqual(expectedFiles[framework].sort());
      expect(result.usedHelpers).toEqual([]);

      for (const content of Object.values(result.files)) {
        expect(content).not.toContain("tabs");
        expect(content).not.toContain("../bambi-helpers");
        expect(content).not.toContain("data-controlled");
        expect(content).not.toContain("controlled,");
        expect(content).not.toContain("controlled:");
      }
    });
  }

  it("throws a clear error when valuePropName references an unknown prop", () => {
    expect(() =>
      createArtifact({
        framework: "react",
        contractSource,
        controllerSource,
        contractExportName: "noticeContract",
        generatorOptions: {
          valuePropName: "missing",
          valuePropParts: ["title"],
        },
      }),
    ).toThrow(/valuePropName references unknown prop "missing"/);
  });

  it("throws a clear error when disabledPropParts references an unknown part", () => {
    expect(() =>
      createArtifact({
        framework: "react",
        contractSource,
        controllerSource,
        contractExportName: "noticeContract",
        generatorOptions: {
          disabledPropName: "tone",
          disabledPropParts: ["missing"],
        },
      }),
    ).toThrow(/disabledPropParts references unknown part "missing"/);
  });
});

const buttonContractSource = `import { defineContract } from "../../../contract/define-contract.js";

export const BUTTON_ROOT = "data-bambi-button" as const;
export const BUTTON_VARIANT = "data-variant" as const;
export const BUTTON_SIZE = "data-size" as const;
export const BUTTON_DISABLED = "data-disabled" as const;
export const BUTTON_LOADING = "data-loading" as const;

export type ButtonVariant = "primary" | "secondary";
export type ButtonSize = "sm" | "md";

export const buttonContract = defineContract({
  name: "button",
  parts: [
    { name: "root", selector: \`[\${BUTTON_ROOT}]\`, attribute: BUTTON_ROOT, element: "button" },
  ],
  props: {
    variant: { type: ["primary", "secondary"], attribute: BUTTON_VARIANT, defaultValue: "primary" },
    size: { type: ["sm", "md"], attribute: BUTTON_SIZE, defaultValue: "md" },
    disabled: { type: "boolean", attribute: BUTTON_DISABLED },
    loading: { type: "boolean", attribute: BUTTON_LOADING },
  },
} as const);
`;

const buttonControllerSource = `export type ButtonVariant = "primary" | "secondary";
export type ButtonSize = "sm" | "md";

export interface ButtonOptions {
  as?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
}

export class ButtonController {
  constructor(private root: Element, private options: ButtonOptions = {}) {}
  sync(): void {}
  update(options: ButtonOptions = {}): void {
    this.options = { ...this.options, ...options };
  }
  destroy(): void {}
}
`;

describe("createArtifact — polymorphic single-root button", () => {
  const outputs = Object.fromEntries(
    KNOWN_FRAMEWORKS.map((framework) => [
      framework,
      createArtifact({
        framework,
        contractSource: buttonContractSource,
        controllerSource: buttonControllerSource,
        contractExportName: "buttonContract",
        generatorOptions: {
          polymorphicRootPropName: "as",
        },
      }),
    ]),
  );

  it("generates the expected file set for every framework", () => {
    expect(Object.keys(outputs.react.files).sort()).toEqual(["index.tsx"]);
    expect(Object.keys(outputs.solid.files).sort()).toEqual(["index.tsx"]);
    expect(Object.keys(outputs.svelte.files).sort()).toEqual(["Button.svelte", "index.ts"]);
    expect(Object.keys(outputs.vue.files).sort()).toEqual(["Button.vue", "index.ts"]);
  });

  it("includes as support and defaults to a native button", () => {
    expect(outputs.react.files["index.tsx"]).toContain('const Component = (as ?? "button") as keyof React.JSX.IntrinsicElements');
    expect(outputs.solid.files["index.tsx"]).toContain('const Component = () => local.as ?? "button"');
    expect(outputs.svelte.files["Button.svelte"]).toContain('const Component = $derived(as ?? "button")');
    expect(outputs.vue.files["Button.vue"]).toContain('const componentTag = computed(() => props.as ?? "button")');
  });

  it("applies type=button only through the native button branch", () => {
    expect(outputs.react.files["index.tsx"]).toContain('type: isNativeButton ? ((props as React.ButtonHTMLAttributes<HTMLButtonElement>).type ?? "button") : undefined');
    expect(outputs.solid.files["index.tsx"]).toContain('type={isNativeButton() ? (rest as JSX.ButtonHTMLAttributes<HTMLButtonElement>).type ?? "button" : undefined}');
    expect(outputs.svelte.files["Button.svelte"]).toContain('const nativeType = $derived(isNativeButton ? (typeof props.type === "string" ? props.type : "button") : undefined)');
    expect(outputs.vue.files["Button.vue"]).toContain(':type="isNativeButton ? ($attrs.type || \'button\') : undefined"');
  });

  it("disables native buttons when disabled or loading", () => {
    expect(outputs.react.files["index.tsx"]).toContain("const effectiveDisabled = Boolean(disabled || loading)");
    expect(outputs.react.files["index.tsx"]).toContain("disabled: isNativeButton ? effectiveDisabled : undefined");
    expect(outputs.react.files["index.tsx"]).toContain('"aria-disabled": !isNativeButton && effectiveDisabled ? "true" : undefined');
    expect(outputs.solid.files["index.tsx"]).toContain("const effectiveDisabled = () => Boolean(local.disabled || local.loading)");
    expect(outputs.solid.files["index.tsx"]).toContain("disabled={isNativeButton() ? effectiveDisabled() : undefined}");
    expect(outputs.solid.files["index.tsx"]).toContain('aria-disabled={!isNativeButton() && effectiveDisabled() ? "true" : undefined}');
    expect(outputs.svelte.files["Button.svelte"]).toContain("const effectiveDisabled = $derived(Boolean(disabled || loading))");
    expect(outputs.svelte.files["Button.svelte"]).toContain('"aria-disabled": !isNativeButton && effectiveDisabled ? true : undefined');
    expect(outputs.vue.files["Button.vue"]).toContain("const effectiveDisabled = computed(() => Boolean(props.disabled || props.loading))");
    expect(outputs.vue.files["Button.vue"]).toContain(":aria-disabled=\"!isNativeButton && effectiveDisabled ? 'true' : undefined\"");
  });
});
