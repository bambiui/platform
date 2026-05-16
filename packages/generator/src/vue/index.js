import {
  parseContractSource,
  parseOptionsNames,
  inlinePrimitiveSource,
  extractControllerBehavior,
  pascalCase,
} from "../shared.js";

// ── Vue part components (TabsList, TabsTrigger, TabsContent) ──────────────

function vuePartFile(part, options, contract) {
  const valuePropParts = new Set(options.valuePropParts ?? []);
  const disabledPropParts = new Set(options.disabledPropParts ?? []);
  const valuePropName = options.valuePropName;
  const disabledPropName = options.disabledPropName;
  const propsByName = new Map(contract.props.map((prop) => [prop.name, prop]));
  const valueAttr = valuePropName ? propsByName.get(valuePropName)?.attribute : undefined;
  const disabledAttr = disabledPropName ? propsByName.get(disabledPropName)?.attribute : undefined;

  const valueHandling = valuePropParts.has(part.name);
  const disabledHandling = disabledPropParts.has(part.name);
  if (valueHandling && (!valuePropName || !valueAttr)) {
    throw new Error(`${contract.name}/${part.name}: valuePropName must reference a contract prop.`);
  }
  if (disabledHandling && (!disabledPropName || !disabledAttr)) {
    throw new Error(`${contract.name}/${part.name}: disabledPropName must reference a contract prop.`);
  }

  const tag = part.element;
  const isButton = tag === "button";

  const propTypeParts = [
    valueHandling ? `  ${valuePropName}: string;` : null,
    disabledHandling ? `  ${disabledPropName}?: boolean;` : null,
  ].filter(Boolean).join("\n");

  const propType = propTypeParts
    ? `interface Props {\n${propTypeParts}\n}`
    : "";

  const typeAttr = isButton ? '\n      type="button"' : "";
  const valueAttribute = valueHandling ? `\n      :${valueAttr}="props.${valuePropName}"` : "";
  const disabledAttribute = disabledHandling
    ? `\n      :disabled="props.${disabledPropName}"\n      :${disabledAttr}="props.${disabledPropName} ? 'true' : undefined"`
    : "";

  const propsDecl = propTypeParts
    ? `const props = defineProps<Props>();`
    : "";

  return `<script setup lang="ts">
${propType}
${propsDecl}
</script>
<template>
  <${tag}${typeAttr}${disabledAttribute}
    ${part.attribute}=""${valueAttribute}
    v-bind="$attrs"
  >
    <slot />
  </${tag}>
</template>
`;
}

// ── Root Tabs.vue ──────────────────────────────────────────────────────────

function vueRootFile({ contract, behaviorClassName, optionsTypeName, optionsNames, generatorOptions, publicContractSource, primitivesBlock, behaviorSource, helperImportLine }) {
  const root = contract.parts.find((part) => part.name === "root");
  if (!root) throw new Error(`${contract.name}: missing root part in contract.`);

  const controlledProp = contract.props.find((prop) => prop.controlled);
  const defaultProp = controlledProp
    ? contract.props.find((prop) => prop.name === `default${pascalCase(controlledProp.name)}`)
    : undefined;
  const optionNames = optionsNames.filter((name) => name !== "controlled");
  const contractPropsByName = new Map(contract.props.map((prop) => [prop.name, prop]));

  const propTypeLines = optionNames
    .map((name) => {
      const contractProp = contractPropsByName.get(name);
      const isCallback = name.startsWith("on");
      if (isCallback) return `  ${name}?: (detail: unknown) => void;`;
      if (contractProp?.type === "boolean") return `  ${name}?: boolean;`;
      return `  ${name}?: string;`;
    })
    .join("\n");

  const withDefaultsLines = optionNames
    .map((name) => {
      const contractProp = contractPropsByName.get(name);
      const defaultValue = contractProp?.defaultValue;
      const isCallback = name.startsWith("on");
      if (isCallback || !defaultValue) return null;
      if (contractProp?.type === "boolean") return `  ${name}: ${defaultValue},`;
      return `  ${name}: "${defaultValue}",`;
    })
    .filter(Boolean)
    .join("\n");

  const propsDecl = withDefaultsLines
    ? `const props = withDefaults(defineProps<Props>(), {\n${withDefaultsLines}\n});`
    : `const props = defineProps<Props>();`;

  const controlledExpression = controlledProp ? `props.${controlledProp.name} !== undefined` : "false";

  const behaviorOptionLines = [...optionNames, "controlled"]
    .map((name) => {
      if (name === "controlled") return `      controlled: controlled.value,`;
      return `      ${name}: props.${name},`;
    })
    .join("\n");

  const rootAttrLines = contract.props
    .filter((prop) => prop.name !== "controlled")
    .map((prop) => {
      if (prop.type === "boolean") return `    :${prop.attribute}="props.${prop.name} ? 'true' : undefined"`;
      return `    :${prop.attribute}="props.${prop.name}"`;
    })
    .join("\n");

  const controlledAttr = contract.props.find((prop) => prop.name === "controlled");
  const controlledAttrLine = controlledAttr ? `\n    :${controlledAttr.attribute}="controlled ? 'true' : undefined"` : "";

  const controlledWarning = controlledProp && defaultProp ? `
  watch([() => props.${controlledProp.name}, () => props.${defaultProp.name}], () => {
    if (props.${controlledProp.name} !== undefined && props.${defaultProp.name} !== undefined) {
      console.warn(
        "[bambiui/${contract.name}] ${contract.componentName} received both \`${controlledProp.name}\` and \`${defaultProp.name}\`. Use \`${controlledProp.name}\` for controlled mode or \`${defaultProp.name}\` for uncontrolled mode, not both.",
      );
    }
  });
` : "";

  return `<script setup lang="ts">
// Generated by scripts/registry-refresh.mjs. Do not edit by hand.
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import "./${contract.name}.css";
${helperImportLine}
${publicContractSource}
${primitivesBlock ? `\n${primitivesBlock}\n` : ""}
${behaviorSource}

interface Props {
${propTypeLines}
}

${propsDecl}

const rootRef = ref<${root.element === "button" ? "HTMLButtonElement" : "HTMLDivElement"} | null>(null);
let behavior: ${behaviorClassName} | undefined;
const controlled = computed(() => ${controlledExpression});
${controlledWarning}
onMounted(() => {
  behavior = new ${behaviorClassName}(rootRef.value!, {
${behaviorOptionLines}
  });
  behavior.sync();
});

onUnmounted(() => {
  behavior?.destroy();
});

watch(
  () => ({ ${optionNames.map((n) => `${n}: props.${n}`).join(", ")} }),
  () => {
    behavior?.update?.({
${behaviorOptionLines}
    });
  },
  { deep: true },
);
</script>
<template>
  <${root.element}
    ref="rootRef"
    ${root.attribute}=""
${rootAttrLines}${controlledAttrLine}
    v-bind="$attrs"
  >
    <slot />
  </${root.element}>
</template>
`;
}

// ── index.ts re-export ────────────────────────────────────────────────────

function vueIndexFile(contract) {
  const parts = contract.parts.filter((p) => p.name !== "root");
  const rootExport = `export { default as ${contract.componentName} } from "./${contract.componentName}.vue";`;
  const partExports = parts
    .map((p) => `export { default as ${contract.componentName}${pascalCase(p.name)} } from "./${contract.componentName}${pascalCase(p.name)}.vue";`)
    .join("\n");
  return `// Generated by scripts/registry-refresh.mjs. Do not edit by hand.
${rootExport}
${partExports}
`;
}

// ── Public API ─────────────────────────────────────────────────────────────

export function createVueArtifact({ contractSource, controllerSource, primitiveFiles = [], contractExportName, generatorOptions = {} }) {
  const { publicContractSource, contract } = parseContractSource(contractSource, contractExportName);
  const behaviorClassName = `${contract.componentName}Behavior`;
  const optionsTypeName = `${contract.componentName}Options`;
  const optionsNames = parseOptionsNames(controllerSource, optionsTypeName);
  const { behaviorSource, usedHelpers } = extractControllerBehavior(controllerSource, contract.componentName);

  const helperImports = usedHelpers.map((h) => (h === "BambiBehavior" ? "type BambiBehavior" : h));
  const helperImportLine = helperImports.length > 0
    ? `import { ${helperImports.join(", ")} } from "../bambi-helpers";\n`
    : "";

  const primitivesBlock = primitiveFiles
    .map((src) => inlinePrimitiveSource(src))
    .filter(Boolean)
    .join("\n\n");

  const files = {};

  // Root component
  files[`${contract.componentName}.vue`] = vueRootFile({
    contract, behaviorClassName, optionsTypeName, optionsNames, generatorOptions,
    publicContractSource, primitivesBlock, behaviorSource, helperImportLine,
  });

  // Part components
  for (const part of contract.parts.filter((p) => p.name !== "root")) {
    const fileName = `${contract.componentName}${pascalCase(part.name)}.vue`;
    files[fileName] = vuePartFile(part, generatorOptions, contract);
  }

  // Re-export index
  files["index.ts"] = vueIndexFile(contract);

  return { files, usedHelpers };
}
