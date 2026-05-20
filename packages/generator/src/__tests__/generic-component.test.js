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

  for (const framework of KNOWN_FRAMEWORKS) {
    it(`${framework}: supports declarative SSR selected state without component-specific branching`, () => {
      const result = createArtifact({
        framework,
        contractSource,
        controllerSource,
        contractExportName: "noticeContract",
        generatorOptions: {
          valuePropName: "tone",
          valuePropParts: ["title"],
          ssrSelectedState: {
            selectedPropNames: ["tone"],
            valuePropName: "tone",
            contextName: "notice-selected-tone",
            parts: {
              title: {
                attributes: [
                  { name: "data-open", active: "yes", inactive: "no" },
                ],
              },
            },
          },
        },
      });

      const output = Object.values(result.files).join("\n");
      expect(output).toContain("data-open");
      if (framework === "svelte" || framework === "vue") {
        expect(output).toContain("notice-selected-tone");
      } else {
        expect(output).toContain("SsrSelectedValueContext");
      }
      expect(output).not.toContain("bambi-tabs-value");
      expect(output).not.toContain("TabsValueContext");
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
          polymorphicNativeElement: "button",
          polymorphicTypeDefault: "button",
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
    expect(outputs.react.files["index.tsx"]).toContain('type: isNativeElement ? ((props as { type?: string }).type ?? "button") : undefined');
    expect(outputs.solid.files["index.tsx"]).toContain('type={(rest as { type?: JSX.IntrinsicElements["button"]["type"] }).type ?? "button"}');
    expect(outputs.solid.files["index.tsx"]).not.toContain('type={isNativeElement() ?');
    expect(outputs.svelte.files["Button.svelte"]).toContain('const nativeType = $derived(isNativeElement ? (typeof props.type === "string" ? props.type : "button") : undefined)');
    expect(outputs.vue.files["Button.vue"]).toContain(':type="isNativeElement ? ($attrs.type || \'button\') : undefined"');
  });

  it("disables native buttons when disabled or loading", () => {
    expect(outputs.react.files["index.tsx"]).toContain("const effectiveDisabled = Boolean(disabled || loading)");
    expect(outputs.react.files["index.tsx"]).toContain("disabled: isNativeElement ? effectiveDisabled : undefined");
    expect(outputs.react.files["index.tsx"]).toContain('"aria-disabled": !isNativeElement && effectiveDisabled ? "true" : undefined');
    expect(outputs.solid.files["index.tsx"]).toContain("const effectiveDisabled = () => Boolean(local.disabled || local.loading)");
    expect(outputs.solid.files["index.tsx"]).toContain("disabled={effectiveDisabled()}");
    expect(outputs.solid.files["index.tsx"]).toContain('aria-disabled={effectiveDisabled() ? "true" : undefined}');
    expect(outputs.svelte.files["Button.svelte"]).toContain("const effectiveDisabled = $derived(Boolean(disabled || loading))");
    expect(outputs.svelte.files["Button.svelte"]).toContain('"aria-disabled": !isNativeElement && effectiveDisabled ? true : undefined');
    expect(outputs.vue.files["Button.vue"]).toContain("const effectiveDisabled = computed(() => Boolean(props.disabled || props.loading))");
    expect(outputs.vue.files["Button.vue"]).toContain(":aria-disabled=\"!isNativeElement && effectiveDisabled ? 'true' : undefined\"");
  });
});

const radioGroupContractSource = `import { defineContract } from "../../../contract/define-contract.js";

export const RADIO_GROUP_ROOT = "data-bambi-radio-group" as const;
export const RADIO_GROUP_ITEM = "data-bambi-radio-group-item" as const;
export const RADIO_GROUP_INPUT = "data-bambi-radio-group-input" as const;
export const RADIO_GROUP_INDICATOR = "data-bambi-radio-group-indicator" as const;
export const RADIO_GROUP_LABEL = "data-bambi-radio-group-label" as const;
export const RADIO_GROUP_VALUE = "data-value" as const;
export const RADIO_GROUP_DEFAULT_VALUE = "data-default-value" as const;
export const RADIO_GROUP_DISABLED = "data-disabled" as const;
export const RADIO_GROUP_CONTROLLED = "data-controlled" as const;
export const RADIO_GROUP_EVENT_VALUE_CHANGE = "bambi:value-change" as const;

export const radioGroupContract = defineContract({
  name: "radio-group",
  parts: [
    { name: "root", selector: \`[\${RADIO_GROUP_ROOT}]\`, attribute: RADIO_GROUP_ROOT, element: "div" },
    { name: "item", selector: \`[\${RADIO_GROUP_ITEM}]\`, attribute: RADIO_GROUP_ITEM, element: "div" },
    { name: "input", selector: \`[\${RADIO_GROUP_INPUT}]\`, attribute: RADIO_GROUP_INPUT, element: "input" },
    { name: "indicator", selector: \`[\${RADIO_GROUP_INDICATOR}]\`, attribute: RADIO_GROUP_INDICATOR, element: "span" },
    { name: "label", selector: \`[\${RADIO_GROUP_LABEL}]\`, attribute: RADIO_GROUP_LABEL, element: "label" },
  ],
  props: {
    value: { type: "string", attribute: RADIO_GROUP_VALUE, controlled: true },
    defaultValue: { type: "string", attribute: RADIO_GROUP_DEFAULT_VALUE },
    controlled: { type: "boolean", attribute: RADIO_GROUP_CONTROLLED },
    disabled: { type: "boolean", attribute: RADIO_GROUP_DISABLED },
  },
  events: {
    valueChange: { name: RADIO_GROUP_EVENT_VALUE_CHANGE, detail: "object" },
  },
} as const);
`;

const radioGroupControllerSource = `export interface RadioGroupOptions {
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  controlled?: boolean;
}

export interface RadioGroupValueChangeDetail {
  value: string;
}

export class RadioGroupController {
  constructor(private root: Element, private options: RadioGroupOptions = {}) {}
  sync(): void {}
  update(options: RadioGroupOptions = {}): void {
    this.options = { ...this.options, ...options };
  }
  destroy(): void {}
}
`;

describe("createArtifact — native radio group item", () => {
  const generatorOptions = {
    valuePropName: "value",
    valuePropParts: ["item"],
    disabledPropName: "disabled",
    disabledPropParts: ["item"],
    embeddedParts: [
      {
        parentPartName: "item",
        childPartName: "input",
        omitChildComponent: true,
        attributes: [
          { name: "type", value: "radio" },
          { name: "value", propName: "value" },
          { name: "disabled", propName: "disabled" },
          { name: "checked", selected: true },
          { name: "readOnly", svelteName: "readonly", vueName: "readonly", value: true },
        ],
      },
    ],
    ssrSelectedState: {
      selectedPropNames: ["value", "defaultValue"],
      valuePropName: "value",
      contextName: "radio-value",
      parts: {
        item: {
          attributes: [{ name: "data-state", active: "checked", inactive: "unchecked" }],
        },
      },
    },
  };

  it("generates item components with native radio inputs and no public input component", () => {
    const react = createArtifact({
      framework: "react",
      contractSource: radioGroupContractSource,
      controllerSource: radioGroupControllerSource,
      contractExportName: "radioGroupContract",
      generatorOptions,
    });
    const svelte = createArtifact({
      framework: "svelte",
      contractSource: radioGroupContractSource,
      controllerSource: radioGroupControllerSource,
      contractExportName: "radioGroupContract",
      generatorOptions,
    });

    expect(react.files["index.tsx"]).toContain('type={"radio"}');
    expect(react.files["index.tsx"]).toContain("data-bambi-radio-group-input");
    expect(react.files["index.tsx"]).toContain("onValueChange?:");
    expect(Object.keys(svelte.files).sort()).toEqual([
      "RadioGroup.svelte",
      "RadioGroupIndicator.svelte",
      "RadioGroupItem.svelte",
      "RadioGroupLabel.svelte",
      "index.ts",
    ]);
    expect(svelte.files["RadioGroupItem.svelte"]).toContain('type={"radio"}');
    expect(svelte.files["index.ts"]).not.toContain("RadioGroupInput");
  });
});
