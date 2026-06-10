import type { ParsedComponent } from "../../generator/parse-component";
import type { RegistryFrameworkArtifacts } from "../types";
import {
  behaviorOptionsObject,
  behaviorUpdateObject,
  componentBehaviorExportName,
  componentModuleImport,
  componentStyleImport,
  generatedComponentFiles,
  sfcFileStem,
  vuePropType,
} from "./shared";

function vueAttributeLines(component: ParsedComponent): string {
  const lines = [`    ${component.rootAttr}=""`];

  for (const prop of component.props) {
    if (!prop.attr) continue;
    if (prop.type === "boolean") {
      lines.push(`    :${prop.attr}="props.${prop.name} ? 'true' : undefined"`);
    } else {
      lines.push(`    :${prop.attr}="props.${prop.name}"`);
    }
  }

  return lines.join("\n");
}

function defaultsObject(component: ParsedComponent): string {
  const lines = component.props
    .filter((prop) => prop.defaultValue !== undefined)
    .map((prop) => `    ${prop.name}: ${JSON.stringify(prop.defaultValue)},`)
    .join("\n");

  return lines ? `,\n  {\n${lines}\n  }` : "";
}

function createComponentSource(component: ParsedComponent): string {
  const behavior = componentBehaviorExportName(component);
  const behaviorOptions = behaviorOptionsObject(component)
    .replace(/^ {8}/gm, "    ")
    .replace(/([a-zA-Z_$][\w$]*),/g, "$1: props.$1,");
  const behaviorUpdate = behaviorUpdateObject(component)
    .replace(/^ {8}/gm, "    ")
    .replace(/([a-zA-Z_$][\w$]*),/g, "$1: props.$1,");

  return `<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { ${behavior} } from "${componentModuleImport(component)}";
import "${componentStyleImport(component)}";

${vuePropType(component)}

const props = withDefaults(defineProps<Props>()${defaultsObject(component)});
const element = ref<HTMLElement | null>(null);
let instance: ReturnType<typeof ${behavior}.mount> | undefined;

function sync() {
  instance?.update({
${behaviorUpdate}
  });
}

onMounted(() => {
  if (!element.value) return;
  instance = ${behavior}.mount(element.value, {
${behaviorOptions}
  });
});

watch(
  () => [${component.props.map((prop) => `props.${prop.name}`).join(", ")}],
  sync,
);

onBeforeUnmount(() => {
  instance?.destroy();
});
</script>

<template>
  <${component.tag}
    ref="element"
${vueAttributeLines(component)}
  >
    <slot />
  </${component.tag}>
</template>
`;
}

export const vueFramework: RegistryFrameworkArtifacts = {
  generateFiles(context) {
    return generatedComponentFiles(context, (component) => ({
      target: `vue/${sfcFileStem(component)}.vue`,
      content: createComponentSource(component),
    }));
  },
  getImportHint({ component, outDir }) {
    return `import ${sfcFileStem(component.parsed)} from "./${outDir}/vue/${sfcFileStem(component.parsed)}.vue";`;
  },
};
