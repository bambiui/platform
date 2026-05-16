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

  const typeAttr = isButton ? '\n    type="button"' : "";
  const valueAttribute = valueHandling ? `\n    :${valueAttr}="props.${valuePropName}"` : "";
  const disabledAttribute = disabledHandling
    ? `\n    :disabled="props.${disabledPropName}"\n    :${disabledAttr}="props.${disabledPropName} ? 'true' : undefined"`
    : "";

  const propsDecl = propTypeParts
    ? `const props = defineProps<Props>();`
    : "";

  return `<script setup lang="ts">
defineOptions({ inheritAttrs: false });
${propType}
${propsDecl}
</script>
<template>
  <${tag}
    v-bind="$attrs"${typeAttr}${disabledAttribute}
    ${part.attribute}=""${valueAttribute}
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
  // Event callbacks come from contract.events; never from optionsNames
  const eventCallbacks = contract.events ?? [];
  const nonCallbackOptionNames = optionNames.filter((name) => !name.startsWith("on"));
  const contractPropsByName = new Map(contract.props.map((prop) => [prop.name, prop]));

  const withDefaultsLines = nonCallbackOptionNames
    .map((name) => {
      const contractProp = contractPropsByName.get(name);
      const defaultValue = contractProp?.defaultValue;
      if (!defaultValue) return null;
      if (contractProp?.type === "boolean") return `  ${name}: ${defaultValue},`;
      return `  ${name}: "${defaultValue}",`;
    })
    .filter(Boolean)
    .join("\n");

  // Event callback prop lines for interface
  const eventCallbackPropLines = eventCallbacks.map((ev) => {
    const detailType = `${contract.componentName}${pascalCase(ev.key)}Detail`;
    return `  ${ev.callbackName}?: (detail: ${detailType}) => void;`;
  }).join("\n");

  const hasEventCallbacks = eventCallbacks.length > 0;
  const propsTypeName = hasEventCallbacks ? `${contract.componentName}Props` : `Omit<${optionsTypeName}, "controlled">`;

  const propsInterfaceBlock = hasEventCallbacks
    ? `interface ${contract.componentName}Props extends Omit<${optionsTypeName}, "controlled"> {\n${eventCallbackPropLines}\n}`
    : "";

  const propsDecl = withDefaultsLines
    ? `const props = withDefaults(defineProps<${propsTypeName}>(), {\n${withDefaultsLines}\n});`
    : `const props = defineProps<${propsTypeName}>();`;

  const controlledExpression = controlledProp ? `props.${controlledProp.name} !== undefined` : "false";

  const behaviorOptionLines = [...nonCallbackOptionNames, "controlled"]
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

  // AbortController for event listener cleanup
  const eventAbortBlock = hasEventCallbacks ? `const eventAbort = new AbortController();\n` : "";

  const listenerSetupLines = eventCallbacks.map((ev) => {
    const detailType = `${contract.componentName}${pascalCase(ev.key)}Detail`;
    return [
      `  rootRef.value!.addEventListener(${ev.eventConstName}, (event: Event) => {`,
      `    const e = event as CustomEvent<${detailType}>;`,
      `    props.${ev.callbackName}?.(e.detail);`,
      `  }, { signal: eventAbort.signal });`,
    ].join("\n");
  }).join("\n");

  const listenerSetupBlock = listenerSetupLines ? `${listenerSetupLines}\n` : "";
  const eventAbortCleanup = hasEventCallbacks ? `  eventAbort.abort();\n` : "";

  const propsInterfaceSection = propsInterfaceBlock ? `\n${propsInterfaceBlock}\n` : "";

  return `<script setup lang="ts">
// Generated by scripts/registry-refresh.mjs. Do not edit by hand.
defineOptions({ inheritAttrs: false });
import { ref, computed, watch, onMounted, onUnmounted, onUpdated } from "vue";
import "./${contract.name}.css";
${helperImportLine}
${publicContractSource}
${primitivesBlock ? `\n${primitivesBlock}\n` : ""}
${behaviorSource}
${propsInterfaceSection}
${propsDecl}

const rootRef = ref<${root.element === "button" ? "HTMLButtonElement" : "HTMLDivElement"} | null>(null);
let behavior: ${behaviorClassName} | undefined;
const controlled = computed(() => ${controlledExpression});
${eventAbortBlock}${controlledWarning}
onMounted(() => {
${listenerSetupBlock}  behavior = new ${behaviorClassName}(rootRef.value!, {
${behaviorOptionLines}
  });
  behavior.sync();
});

onUnmounted(() => {
${eventAbortCleanup}  behavior?.destroy();
});

watch(
  () => ({ ${nonCallbackOptionNames.map((n) => `${n}: props.${n}`).join(", ")} }),
  () => {
    behavior?.update?.({
${behaviorOptionLines}
    });
  },
  { deep: true },
);

onUpdated(() => {
  behavior?.update?.({
${behaviorOptionLines}
  });
});
</script>
<template>
  <${root.element}
    ref="rootRef"
    v-bind="$attrs"
    ${root.attribute}=""
${rootAttrLines}${controlledAttrLine}
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
