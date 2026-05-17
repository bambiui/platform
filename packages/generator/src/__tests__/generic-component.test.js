import { describe, expect, it } from "vitest";
import { createArtifact } from "../index.js";

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
  for (const framework of Object.keys(expectedFiles)) {
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
});
