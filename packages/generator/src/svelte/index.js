import {
  componentIndexFile,
  createPartGenerationContext,
  getEmbeddedChildrenForPart,
  getOmittedEmbeddedPartNames,
  pascalCase,
  prepareArtifactGeneration,
  supportsDisabledAttribute,
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


function svelteEmbeddedAttributeLine(attribute) {
  const name = attribute.svelteName ?? attribute.name;
  if (attribute.selected) return `\n    ${name}={hasSelectedValue ? isSelected : undefined}`;
  if (attribute.propName) return `\n    ${name}={${attribute.propName}}`;
  if (attribute.value !== undefined) return `\n    ${name}={${svelteLiteral(attribute.value)}}`;
  return `\n    ${name}=""`;
}

function svelteEmbeddedChildrenSource(part, contract, options) {
  return getEmbeddedChildrenForPart(part, contract, options)
    .map(({ embedded, child }) => {
      const attrs = (embedded.attributes ?? []).map((attribute) => svelteEmbeddedAttributeLine(attribute)).join("");
      return `  <${child.element}
    ${child.attribute}=""${attrs}
  />`;
    })
    .join("\n");
}

function sveltePartFile(part, options, contract) {
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

  const propDecls = [
    valueHandling ? `  ${valuePropName}: string;` : null,
    disabledHandling ? `  ${disabledPropName}?: boolean;` : null,
    defaultTypeHandling
      ? `  type?: ${(options.defaultTypeValues ?? [options.defaultTypeValue]).map((value) => `"${value}"`).join(" | ")};`
      : null,
  ].filter(Boolean).join("\n");

  const typeAttr = defaultTypeHandling ? "\n    type={type}" : "";
  const valueAttribute = protocolValueHandling ? `\n    ${valueAttr}={${valuePropName}}` : "";
  const nativeDisabledAttribute = disabledHandling && supportsDisabledAttribute(tag) ? `\n    disabled={${disabledPropName}}` : "";
  const disabledAttribute = disabledHandling
    ? `${nativeDisabledAttribute}\n    ${disabledAttr}={${disabledPropName} ? "true" : undefined}`
    : "";
  const ssrStateSetup = ssrPart && valueHandling ? `
const selectedValue = getContext<(() => string | undefined) | undefined>("${ssrState.contextName}");
const hasSelectedValue = $derived(selectedValue?.() !== undefined);
const isSelected = $derived(selectedValue?.() === ${ssrState.valuePropName});` : "";
  const ssrAttrs = ssrPart && valueHandling
    ? ssrPart.attributes.map((attribute) => svelteSsrAttributeLine(attribute)).join("")
    : "";
  const embeddedChildren = svelteEmbeddedChildrenSource(part, contract, options);
  const embeddedChildrenBlock = embeddedChildren ? `${embeddedChildren}\n` : "";

  const propsInterface = `\ninterface Props {\n${propDecls ? propDecls + "\n" : ""}  children?: Snippet;\n  [key: string]: unknown;\n}`;

  const propDestructure = [
    valueHandling ? valuePropName : null,
    disabledHandling ? disabledPropName : null,
    defaultTypeHandling ? `type = "${options.defaultTypeValue}"` : null,
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
${embeddedChildrenBlock}  {@render children?.()}
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

// ── Public API ─────────────────────────────────────────────────────────────

export function createSvelteArtifact(options) {
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
  files[`${contract.componentName}.svelte`] = svelteRootFile({
    contract, behaviorClassName, optionsTypeName, optionsNames, generatorOptions,
    publicContractSource, primitivesBlock, behaviorSource, helperImportLine,
  });

  // Part components
  const omittedParts = getOmittedEmbeddedPartNames(generatorOptions);
  for (const part of contract.parts.filter((p) => p.name !== "root" && !omittedParts.has(p.name))) {
    const fileName = `${contract.componentName}${pascalCase(part.name)}.svelte`;
    files[fileName] = sveltePartFile(part, generatorOptions, contract);
  }

  // Re-export index
  files["index.ts"] = componentIndexFile({
    ...contract,
    parts: contract.parts.filter((p) => !omittedParts.has(p.name)),
  }, "svelte");

  return { files, usedHelpers };
}
