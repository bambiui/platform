import {
  componentIndexFile,
  createPartGenerationContext,
  createRootGenerationContext,
  getEmbeddedChildrenForPart,
  getOmittedEmbeddedPartNames,
  htmlElementType,
  literalValue,
  pascalCase,
  prepareArtifactGeneration,
  supportsNativeDisabledAttribute,
} from "../shared.js";

// ── Vue part components (TabsList, TabsTrigger, TabsContent) ──────────────

function vueSsrAttributeLine(attribute) {
  const name = attribute.vueName ?? attribute.name;
  if (attribute.value !== undefined) return `\n    :${name}="${literalValue(attribute.value, "'")}"`;
  return `\n    :${name}="hasSelectedValue ? (isSelected ? ${literalValue(attribute.active, "'")} : ${literalValue(attribute.inactive, "'")}) : undefined"`;
}


function vueEmbeddedAttributeLine(attribute) {
  const name = attribute.vueName ?? attribute.name;
  if (attribute.selected) return `\n      :${name}="hasSelectedValue ? isSelected : undefined"`;
  if (attribute.propName) return `\n      :${name}="props.${attribute.propName}"`;
  if (attribute.value !== undefined) return `\n      :${name}="${literalValue(attribute.value, "'")}"`;
  return `\n      ${name}=""`;
}

function vueEmbeddedChildrenSource(part, contract, options) {
  return getEmbeddedChildrenForPart(part, contract, options)
    .map(({ embedded, child }) => {
      const attrs = (embedded.attributes ?? []).map((attribute) => vueEmbeddedAttributeLine(attribute)).join("");
      return `    <${child.element}
      ${child.attribute}=""${attrs}
    />`;
    })
    .join("\n");
}

function vuePartFile(part, options, contract) {
  const {
    tag,
    valuePropName,
    disabledPropName,
    valueAttr,
    disabledAttr,
    valueHandling,
    protocolValueHandling,
    disabledHandling,
    defaultTypeHandling,
    ssrState,
    ssrPart,
  } = createPartGenerationContext(part, contract, options);

  const propTypeParts = [
    valueHandling ? `  ${valuePropName}: string;` : null,
    disabledHandling ? `  ${disabledPropName}?: boolean;` : null,
  ].filter(Boolean).join("\n");

  const propType = propTypeParts
    ? `interface Props {\n${propTypeParts}\n}`
    : "";

  const typeAttr = defaultTypeHandling ? `\n    type="${options.defaultTypeValue}"` : "";
  const valueAttribute = protocolValueHandling ? `\n    :${valueAttr}="props.${valuePropName}"` : "";
  const nativeDisabledAttribute = disabledHandling && supportsNativeDisabledAttribute(tag) ? `\n    :disabled="props.${disabledPropName}"` : "";
  const disabledAttribute = disabledHandling
    ? `${nativeDisabledAttribute}\n    :${disabledAttr}="props.${disabledPropName} ? 'true' : undefined"`
    : "";
  const ssrStateSetup = ssrPart && valueHandling ? `
const selectedValue = inject<ComputedRef<string | undefined>>("${ssrState.contextName}");
const hasSelectedValue = computed(() => selectedValue?.value !== undefined);
const isSelected = computed(() => selectedValue?.value === props.${ssrState.valuePropName});` : "";
  const ssrAttrs = ssrPart && valueHandling
    ? ssrPart.attributes.map((attribute) => vueSsrAttributeLine(attribute)).join("")
    : "";
  const embeddedChildren = vueEmbeddedChildrenSource(part, contract, options);
  const embeddedChildrenBlock = embeddedChildren ? `${embeddedChildren}\n` : "";

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
${embeddedChildrenBlock}
    <slot />
  </${tag}>
</template>
`;
}

// ── Root Tabs.vue ──────────────────────────────────────────────────────────

function vueRootFile({ contract, behaviorClassName, optionsTypeName, optionsNames, generatorOptions, publicContractSource, primitivesBlock, behaviorSource, helperImportLine }) {
  const {
    root,
    polymorphicRootPropName,
    polymorphicNativeElement,
    polymorphicTypeDefault,
    controlledProp,
    defaultProp,
    eventCallbacks,
    nonCallbackOptionNames,
    contractPropsByName,
    publicOptionsType,
    behaviorOptionNames,
    hasDisabledOption,
    hasLoadingOption,
    hasEventCallbacks,
  } = createRootGenerationContext({
    contract,
    optionsTypeName,
    optionsNames,
    generatorOptions,
  });

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
  const effectiveDisabledExpression = [
    hasDisabledOption ? "props.disabled" : null,
    hasLoadingOption ? "props.loading" : null,
  ].filter(Boolean).join(" || ") || "false";
  const rootElementType = polymorphicRootPropName ? "HTMLElement" : htmlElementType(root.element);
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

// ── Public API ─────────────────────────────────────────────────────────────

export function createVueArtifact(options) {
  const {
    publicContractSource,
    contract,
    behaviorClassName,
    optionsTypeName,
    optionsNames,
    behaviorSource,
    usedHelpers,
    helperImportLine,
    primitivesBlock,
  } = prepareArtifactGeneration(options);
  const { generatorOptions = {} } = options;

  const files = {};

  // Root component
  files[`${contract.componentName}.vue`] = vueRootFile({
    contract, behaviorClassName, optionsTypeName, optionsNames, generatorOptions,
    publicContractSource, primitivesBlock, behaviorSource, helperImportLine,
  });

  // Part components
  const omittedParts = getOmittedEmbeddedPartNames(generatorOptions);
  for (const part of contract.parts.filter((p) => p.name !== "root" && !omittedParts.has(p.name))) {
    const fileName = `${contract.componentName}${pascalCase(part.name)}.vue`;
    files[fileName] = vuePartFile(part, generatorOptions, contract);
  }

  // Re-export index
  files["index.ts"] = componentIndexFile({
    ...contract,
    parts: contract.parts.filter((p) => !omittedParts.has(p.name)),
  }, "vue");

  return { files, usedHelpers };
}
