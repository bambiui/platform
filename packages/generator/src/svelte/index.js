import {
  parseContractSource,
  parseOptionsNames,
  inlinePrimitiveSource,
  extractControllerBehavior,
  validateGeneratorOptions,
  pascalCase,
} from "../shared.js";

// ── Svelte part components (TabsList, TabsTrigger, TabsContent) ────────────

function svelteLiteral(value) {
  return typeof value === "string" ? `"${value}"` : String(value);
}

function svelteSsrAttributeLine(attribute) {
  const name = attribute.svelteName ?? attribute.name;
  if (attribute.value !== undefined) return `\n    ${name}={${svelteLiteral(attribute.value)}}`;
  return `\n    ${name}={hasSelectedValue ? (isSelected ? ${svelteLiteral(attribute.active)} : ${svelteLiteral(attribute.inactive)}) : undefined}`;
}

function sveltePartFile(part, options, contract) {
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
  const propDecls = [
    valueHandling ? `  ${valuePropName}: string;` : null,
    disabledHandling ? `  ${disabledPropName}?: boolean;` : null,
    defaultTypeParts.has(part.name)
      ? `  type?: ${(options.defaultTypeValues ?? [options.defaultTypeValue]).map((value) => `"${value}"`).join(" | ")};`
      : null,
  ].filter(Boolean).join("\n");

  const typeAttr = defaultTypeParts.has(part.name) ? "\n    type={type}" : "";
  const valueAttribute = protocolValueHandling ? `\n    ${valueAttr}={${valuePropName}}` : "";
  const disabledAttribute = disabledHandling
    ? `\n    disabled={${disabledPropName}}\n    ${disabledAttr}={${disabledPropName} ? "true" : undefined}`
    : "";
  const ssrState = options.ssrSelectedState;
  const ssrPart = ssrState?.parts?.[part.name];
  const ssrStateSetup = ssrPart && valueHandling ? `
const selectedValue = getContext<(() => string | undefined) | undefined>("${ssrState.contextName}");
const hasSelectedValue = $derived(selectedValue?.() !== undefined);
const isSelected = $derived(selectedValue?.() === ${ssrState.valuePropName});` : "";
  const ssrAttrs = ssrPart && valueHandling
    ? ssrPart.attributes.map((attribute) => svelteSsrAttributeLine(attribute)).join("")
    : "";

  const propsInterface = `\ninterface Props {\n${propDecls ? propDecls + "\n" : ""}  children?: Snippet;\n  [key: string]: unknown;\n}`;

  const propDestructure = [
    valueHandling ? valuePropName : null,
    disabledHandling ? disabledPropName : null,
    defaultTypeParts.has(part.name) ? `type = "${options.defaultTypeValue}"` : null,
    "children",
    "...props",
  ].filter(Boolean).join(", ");

  return `<script lang="ts">
import { ${ssrPart && valueHandling ? "getContext, " : ""}type Snippet } from "svelte";
${propsInterface}
let { ${propDestructure} }: Props = $props();
${ssrStateSetup}
</script>
<${tag}
  {...props}${typeAttr}${disabledAttribute}
  ${part.attribute}=""${valueAttribute}${ssrAttrs}
>
  {@render children?.()}
</${tag}>
`;
}

// ── Root Tabs.svelte ──────────────────────────────────────────────────────

function svelteRootFile({ contract, behaviorClassName, optionsTypeName, optionsNames, generatorOptions, publicContractSource, primitivesBlock, behaviorSource, helperImportLine }) {
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

  // Destructure lines: non-callback options with defaults
  const destructureLines = nonCallbackOptionNames
    .map((name) => {
      const contractProp = contractPropsByName.get(name);
      const defaultValue = contractProp?.defaultValue;
      if (defaultValue !== undefined) {
        if (contractProp?.type === "boolean") return `  ${name} = ${defaultValue},`;
        return `  ${name} = "${defaultValue}",`;
      }
      return `  ${name},`;
    })
    .join("\n");

  // Explicitly destructure event callbacks so they don't land in ...props spread
  const eventCallbackDestructureLines = eventCallbacks.map((ev) => `  ${ev.callbackName},`).join("\n");

  const controlledExpression = controlledProp ? `${controlledProp.name} !== undefined` : "false";
  const ssrState = generatorOptions.ssrSelectedState;
  const ssrSelectedExpression = ssrState?.selectedPropNames?.join(" ?? ");
  const ssrContextLine = ssrState ? `setContext("${ssrState.contextName}", () => ${ssrSelectedExpression});\n` : "";

  const behaviorOptionNames = controlledProp
    ? [...nonCallbackOptionNames, "controlled"]
    : nonCallbackOptionNames;
  const behaviorOptionLines = behaviorOptionNames
    .map((name) => {
      if (name === "controlled") return `      controlled,`;
      return `      ${name},`;
    })
    .join("\n");

  const rootAttrLines = contract.props
    .filter((prop) => prop.name !== "controlled")
    .map((prop) => {
      if (prop.name === "controlled") return null;
      if (polymorphicRootPropName && prop.name === "disabled") return `  ${prop.attribute}={effectiveDisabled ? "true" : undefined}`;
      if (prop.type === "boolean") return `  ${prop.attribute}={${prop.name} ? "true" : undefined}`;
      return `  ${prop.attribute}={${prop.name}}`;
    })
    .filter(Boolean)
    .join("\n");

  const controlledAttr = contract.props.find((prop) => prop.name === "controlled");
  const controlledAttrLine = controlledAttr ? `\n  ${controlledAttr.attribute}={controlled ? "true" : undefined}` : "";

  const controlledWarning = controlledProp && defaultProp ? `
  $effect(() => {
    if (${controlledProp.name} !== undefined && ${defaultProp.name} !== undefined) {
      console.warn(
        "[bambiui/${contract.name}] ${contract.componentName} received both \`${controlledProp.name}\` and \`${defaultProp.name}\`. Use \`${controlledProp.name}\` for controlled mode or \`${defaultProp.name}\` for uncontrolled mode, not both.",
      );
    }
  });
` : "";

  // Event callback prop lines for interface
  const eventCallbackPropLines = eventCallbacks.map((ev) => {
    const detailType = `${contract.componentName}${pascalCase(ev.key)}Detail`;
    return `  ${ev.callbackName}?: (detail: ${detailType}) => void;`;
  }).join("\n");

  const publicOptionsType = controlledProp
    ? `Omit<${optionsTypeName}, "controlled">`
    : optionsTypeName;

  // Event listener setup in onMount
  const listenerSetupLines = eventCallbacks.map((ev) => {
    const detailType = `${contract.componentName}${pascalCase(ev.key)}Detail`;
    return [
      `  const ${ev.callbackName}Handler = (event: Event) => {`,
      `    const e = event as CustomEvent<${detailType}>;`,
      `    ${ev.callbackName}?.(e.detail);`,
      `  };`,
      `  rootEl!.addEventListener(${ev.eventConstName}, ${ev.callbackName}Handler);`,
    ].join("\n");
  }).join("\n");

  const listenerTeardownLines = eventCallbacks.map((ev) =>
    `    rootEl!.removeEventListener(${ev.eventConstName}, ${ev.callbackName}Handler);`
  ).join("\n");

  const eventInterfaceExtra = eventCallbackPropLines ? `\n${eventCallbackPropLines}` : "";
  const eventCallbackDestructureBlock = eventCallbackDestructureLines ? `${eventCallbackDestructureLines}\n` : "";
  const listenerSetupBlock = listenerSetupLines ? `${listenerSetupLines}\n` : "";
  const cleanupReturn = listenerTeardownLines
    ? `  return () => {\n${listenerTeardownLines}\n    behavior?.destroy();\n  };`
    : `  return () => behavior?.destroy();`;
  const hasDisabledOption = optionNames.includes("disabled");
  const hasLoadingOption = optionNames.includes("loading");
  const effectiveDisabledExpression = [
    hasDisabledOption ? "disabled" : null,
    hasLoadingOption ? "loading" : null,
  ].filter(Boolean).join(" || ") || "false";
  const rootElementType = "HTMLElement";
  const polymorphicNativeElement = generatorOptions.polymorphicNativeElement ?? root.element;
  const polymorphicTypeDefault = generatorOptions.polymorphicTypeDefault;
  const polymorphicState = polymorphicRootPropName ? `const Component = $derived(${polymorphicRootPropName} ?? "${root.element}");
const isNativeElement = $derived(Component === "${polymorphicNativeElement}");
const effectiveDisabled = $derived(Boolean(${effectiveDisabledExpression}));
const nativeType = $derived(isNativeElement ? (typeof props.type === "string" ? props.type : ${polymorphicTypeDefault ? `"${polymorphicTypeDefault}"` : "undefined"}) : undefined);
const polymorphicAttrs = $derived({
  type: nativeType,
  disabled: isNativeElement ? effectiveDisabled : undefined,
  "aria-disabled": !isNativeElement && effectiveDisabled ? true : undefined,
  "aria-busy": ${hasLoadingOption ? "loading ? true : undefined" : "undefined"},
});
` : "";
  const rootMarkup = polymorphicRootPropName ? `<svelte:element
  this={Component}
  bind:this={rootEl}
  {...props}
  {...polymorphicAttrs}
  ${root.attribute}=""
${rootAttrLines}${controlledAttrLine}
>
  {@render children?.()}
</svelte:element>` : `<${root.element}
  bind:this={rootEl}
  {...props}
  ${root.attribute}=""
${rootAttrLines}${controlledAttrLine}
>
  {@render children?.()}
</${root.element}>`;

  return `<script lang="ts">
// Generated by scripts/registry-refresh.mjs. Do not edit by hand.
import { onMount, ${ssrState ? "setContext, " : ""}type Snippet } from "svelte";
${helperImportLine}
${publicContractSource}
${primitivesBlock ? `\n${primitivesBlock}\n` : ""}
${behaviorSource}

interface Props extends ${publicOptionsType} {
  children?: Snippet;
  class?: string;
  [key: string]: unknown;${eventInterfaceExtra}
}

let {
${destructureLines}
${eventCallbackDestructureBlock}  children,
  ...props
}: Props = $props();

const controlled = $derived(${controlledExpression});
${ssrContextLine}${polymorphicState}${controlledWarning}
let rootEl: ${rootElementType} | undefined = $state();
let behavior: ${behaviorClassName} | undefined;

onMount(() => {
${listenerSetupBlock}  behavior = new ${behaviorClassName}(rootEl!, {
${behaviorOptionLines}
  });
  behavior.sync();
${cleanupReturn}
});

// Svelte 5 (runes): prop changes drive controller re-sync via this $effect.
// Dynamic children (conditional child parts from parent state) cannot be
// tracked here — Svelte 5 Snippets do not expose a reactive identity that
// $effect can subscribe to without calling the Snippet. If the child structure
// changes at runtime, wrap <${contract.componentName}> in a {#key} block keyed
// to the structure.
$effect(() => {
  behavior?.update?.({
${behaviorOptionLines}
  });
});
</script>
${rootMarkup}
`;
}

// ── index.ts re-export ────────────────────────────────────────────────────

function svelteIndexFile(contract) {
  const parts = contract.parts.filter((p) => p.name !== "root");
  const rootExport = `export { default as ${contract.componentName} } from "./${contract.componentName}.svelte";`;
  const partExports = parts
    .map((p) => `export { default as ${contract.componentName}${pascalCase(p.name)} } from "./${contract.componentName}${pascalCase(p.name)}.svelte";`)
    .join("\n");
  return `// Generated by scripts/registry-refresh.mjs. Do not edit by hand.
${rootExport}
${partExports}
`;
}

// ── Public API ─────────────────────────────────────────────────────────────

export function createSvelteArtifact({ contractSource, controllerSource, primitiveFiles = [], contractExportName, generatorOptions = {} }) {
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
  files[`${contract.componentName}.svelte`] = svelteRootFile({
    contract, behaviorClassName, optionsTypeName, optionsNames, generatorOptions,
    publicContractSource, primitivesBlock, behaviorSource, helperImportLine,
  });

  // Part components
  for (const part of contract.parts.filter((p) => p.name !== "root")) {
    const fileName = `${contract.componentName}${pascalCase(part.name)}.svelte`;
    files[fileName] = sveltePartFile(part, generatorOptions, contract);
  }

  // Re-export index
  files["index.ts"] = svelteIndexFile(contract);

  return { files, usedHelpers };
}
