import { badge, button, tabs } from "../core/components";
import { parseComponent } from "../generator/parse-component";
import { reactFramework } from "./frameworks/react";
import { solidFramework } from "./frameworks/solid";
import { svelteFramework } from "./frameworks/svelte";
import { vueFramework } from "./frameworks/vue";
import type { BambiRegistry, ComponentName, RegistryFile } from "./types";

export type {
  BambiRegistry,
  ComponentHelpers,
  ComponentName,
  FrameworkTarget,
  RegistryComponent,
  RegistryFile,
  RegistryFileKind,
  RegistryFrameworkArtifacts,
  RegistryFrameworkArtifactContext,
  RegistryFrameworkImportHintContext,
  RegistryGeneratedFile,
} from "./types";

const helper = (name: string): RegistryFile => ({
  source:
    name === "define-component.ts"
      ? "core/define-component.ts"
      : `core/shared/${name}`,
  target: `shared/${name}`,
  kind: "helper",
});

const componentFile = (name: ComponentName): RegistryFile => ({
  source: `core/components/${name}/index.ts`,
  target: `components/${name}.ts`,
  kind: "component",
});

const componentStyle = (
  name: ComponentName,
  fileName = `${name}.css`,
): RegistryFile => ({
  source: `core/components/${name}/${fileName}`,
  target: `styles/${fileName}`,
  kind: "style",
});

export const registry: BambiRegistry = {
  version: 1,
  base: {
    files: [
      {
        source: "styles/tokens.css",
        target: "styles/tokens.css",
        kind: "style",
      },
    ],
  },
  frameworks: {
    react: reactFramework,
    solid: solidFramework,
    svelte: svelteFramework,
    vue: vueFramework,
  },
  components: {
    badge: {
      name: "badge",
      exportName: "badge",
      parsed: parseComponent(badge),
      files: [componentFile("badge")],
      helpers: [
        helper("define-component.ts"),
        helper("props.ts"),
        helper("attributes.ts"),
        helper("events.ts"),
        helper("parts.ts"),
        helper("a11y.ts"),
      ],
      styles: [componentStyle("badge", "badge.css")],
      ssr: {
        reactAttrs: true,
      },
    },
    button: {
      name: "button",
      exportName: "button",
      parsed: parseComponent(button),
      files: [componentFile("button")],
      helpers: [
        helper("define-component.ts"),
        helper("props.ts"),
        helper("attributes.ts"),
        helper("events.ts"),
        helper("parts.ts"),
        helper("a11y.ts"),
      ],
      styles: [componentStyle("button", "button.css")],
      ssr: {
        reactAttrs: true,
      },
    },
    tabs: {
      name: "tabs",
      exportName: "tabs",
      parsed: parseComponent(tabs),
      files: [componentFile("tabs")],
      helpers: [
        helper("define-component.ts"),
        helper("props.ts"),
        helper("attributes.ts"),
        helper("events.ts"),
        helper("lifecycle.ts"),
        helper("keyboard.ts"),
        helper("focus.ts"),
        helper("ids.ts"),
        helper("parts.ts"),
        helper("a11y.ts"),
      ],
      styles: [componentStyle("tabs", "tabs.css")],
      ssr: {
        reactAttrs: true,
        requiresStableId: true,
      },
    },
  },
};
