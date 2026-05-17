import {
  parseContractSource,
  parseOptionsNames,
  inlinePrimitiveSource,
  extractControllerBehavior,
  validateGeneratorOptions,
  pascalCase,
} from "../shared.js";

// ── Vue part components (TabsList, TabsTrigger, TabsContent) ──────────────

function vueLiteral(value) {
  return typeof value === "string" ? `'${value}'` : String(value);
}

function vueSsrAttributeLine(attribute) {
  const name = attribute.vueName ?? attribute.name;
  if (attribute.value !== undefined) return `\n    :${name}="${vueLiteral(attribute.value)}"`;
  return `\n    :${name}="hasSelectedValue ? (isSelected ? ${vueLiteral(attribute.active)} : ${vueLiteral(attribute.inactive)}) : undefined"`;
}

function htmlElementType(element) {
  return `HTML${pascalCase(element)}Element`;
}

function vuePartFile(part, options, contract) {
  const valuePropParts = new Set([
    ...(options.valuePropParts ?? []),
    ...Object.keys(options.ssrSelectedState?.parts ?? {}),
  ]);
  const protocolValuePropParts = new Set(options.valuePropParts ?? []);
  const disabledPropParts = new Set(options.disabledPropParts ?? []);
  const defaultTypeParts = new Set(options.defaultTypeParts ?? []);
  const valuePropName = options.valuePropName;
  const disabledPropName = options.disabledPropName;
  const propsByName = new Map(contract.props.map((prop) => [prop.name, prop]));
  const valueAttr = valuePropName ? propsByName.get(valuePropName)?.attribute : undefined;
  const disabledAttr = disabledPropName ? propsByName.get(disabledPropName)?.attribute : undefined;

  const valueHandling = valuePropParts.has(part.name);
  const protocolValueHandling = protocolValuePropParts.has(part.name);
  const disabledHandling = disabledPropParts.has(part.name);
  if (valueHandling && (!valuePropName || !valueAttr)) {
    throw new Error(`${contract.name}/${part.name}: valuePropName must reference a contract prop.`);
  }
  if (disabledHandling && (!disabledPropName || !disabledAttr)) {
    throw new Error(`${contract.name}/${part.name}: disabledPropName must reference a contract prop.`);
  }

  const tag = part.element;

  const propTypeParts = [
    valueHandling ? `  ${valuePropName}: string;` : null,
    disabledHandling ? `  ${disabledPropName}?: boolean;` : null,
  ].filter(Boolean).join("\n");

  const propType = propTypeParts
    ? `interface Props {\n${propTypeParts}\n}`
    : "";

  const typeAttr = defaultTypeParts.has(part.name) ? `\n    type="${options.defaultTypeValue}"` : "";
  const valueAttribute = protocolValueHandling ? `\n    :${valueAttr}="props.${valuePropName}"` : "";
  const disabledAttribute = disabledHandling
    ? `\n    :disabled="props.${disabledPropName}"\n    :${disabledAttr}="props.${disabledPropName} ? 'true' : undefined"`
    : "";
  const ssrState = options.ssrSelectedState;
  const ssrPart = ssrState?.parts?.[part.name];
  const ssrStateSetup = ssrPart && valueHandling ? `
const selectedValue = inject<ComputedRef<string | undefined>>("${ssrState.contextName}");
const hasSelectedValue = computed(() => selectedValue?.value !== undefined);
const isSelected = computed(() => selectedValue?.value === props.${ssrState.valuePropName});` : "";
  const ssrAttrs = ssrPart && valueHandling
    ? ssrPart.attributes.map((attribute) => vueSsrAttributeLine(attribute)).join("")
    : "";

  const propsDecl = propTypeParts
    ? `const props = defineProps<Props>();`
    : "";

  return `<script setup lang="ts">
defineOptions({ inheritAttrs: false });
${ssrPart && valueHandling ? 'import { computed, inject, type ComputedRef } from "vue";' : ""}
${propType}
${propsDecl}
${ssrStateSetup}
</script>
<template>
  <${tag}
    v-bind="$attrs"${typeAttr}${disabledAttribute}
    ${part.attribute}=""${valueAttribute}${ssrAttrs}
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
  const polymorphicRootPropName = generatorOptions.polymorphicRootPropName;

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
  const publicOptionsType = controlledProp
    ? `Omit<${optionsTypeName}, "controlled">`
    : optionsTypeName;
  const propsTypeName = hasEventCallbacks ? `${contract.componentName}Props` : publicOptionsType;

  const propsInterfaceBlock = hasEventCallbacks
    ? `interface ${contract.componentName}Props extends ${publicOptionsType} {\n${eventCallbackPropLines}\n}`
    : "";

  const propsDecl = withDefaultsLines
    ? `const props = withDefaults(defineProps<${propsTypeName}>(), {\n${withDefaultsLines}\n});`
    : `const props = defineProps<${propsTypeName}>();`;

  const controlledExpression = controlledProp ? `props.${controlledProp.name} !== undefined` : "false";
  const ssrState = generatorOptions.ssrSelectedState;
  const ssrSelectedExpression = ssrState?.selectedPropNames?.map((name) => `props.${name}`).join(" ?? ");
  const ssrSelectedValueLine = ssrState ? `const selectedValue = computed(() => ${ssrSelectedExpression});
provide("${ssrState.contextName}", selectedValue);
` : "";

  const behaviorOptionNames = controlledProp
    ? [...nonCallbackOptionNames, "controlled"]
    : nonCallbackOptionNames;
  const behaviorOptionLines = behaviorOptionNames
    .map((name) => {
      if (name === "controlled") return `      controlled: controlled.value,`;
      return `      ${name}: props.${name},`;
    })
    .join("\n");

  const rootAttrLines = contract.props
    .filter((prop) => prop.name !== "controlled")
    .map((prop) => {
      if (polymorphicRootPropName && prop.name === "disabled") return `    :${prop.attribute}="effectiveDisabled ? 'true' : undefined"`;
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
  const hasDisabledOption = optionNames.includes("disabled");
  const hasLoadingOption = optionNames.includes("loading");
  const effectiveDisabledExpression = [
    hasDisabledOption ? "props.disabled" : null,
    hasLoadingOption ? "props.loading" : null,
  ].filter(Boolean).join(" || ") || "false";
  const rootElementType = polymorphicRootPropName ? "HTMLElement" : htmlElementType(root.element);
  const polymorphicNativeElement = generatorOptions.polymorphicNativeElement ?? root.element;
  const polymorphicTypeDefault = generatorOptions.polymorphicTypeDefault;
  const polymorphicState = polymorphicRootPropName ? `const componentTag = computed(() => props.${polymorphicRootPropName} ?? "${root.element}");
const isNativeElement = computed(() => componentTag.value === "${polymorphicNativeElement}");
const effectiveDisabled = computed(() => Boolean(${effectiveDisabledExpression}));
` : "";
  const rootTemplate = polymorphicRootPropName ? `<component
    :is="componentTag"
    ref="rootRef"
    v-bind="$attrs"
    ${root.attribute}=""
    :type="isNativeElement ? ($attrs.type || ${polymorphicTypeDefault ? `'${polymorphicTypeDefault}'` : "undefined"}) : undefined"
    :disabled="isNativeElement ? effectiveDisabled : undefined"
    :aria-disabled="!isNativeElement && effectiveDisabled ? 'true' : undefined"
    :aria-busy="${hasLoadingOption ? "props.loading ? 'true' : undefined" : "undefined"}"
${rootAttrLines}${controlledAttrLine}
  >
    <slot />
  </component>` : `<${root.element}
    ref="rootRef"
    v-bind="$attrs"
    ${root.attribute}=""
${rootAttrLines}${controlledAttrLine}
  >
    <slot />
  </${root.element}>`;

  return `<script setup lang="ts">
// Generated by scripts/registry-refresh.mjs. Do not edit by hand.
defineOptions({ inheritAttrs: false });
import { ref, computed, watch, onMounted, onUnmounted, onUpdated${ssrState ? ", provide" : ""} } from "vue";
import "./${contract.name}.css";
${helperImportLine}
${publicContractSource}
${primitivesBlock ? `\n${primitivesBlock}\n` : ""}
${behaviorSource}
${propsInterfaceSection}
${propsDecl}

const rootRef = ref<${rootElementType} | null>(null);
let behavior: ${behaviorClassName} | undefined;
const controlled = computed(() => ${controlledExpression});
${ssrSelectedValueLine}${polymorphicState}${eventAbortBlock}${controlledWarning}
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
  ${rootTemplate}
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
  validateGeneratorOptions(contract, generatorOptions);
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
