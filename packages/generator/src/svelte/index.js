import {
  parseContractSource,
  parseOptionsNames,
  inlinePrimitiveSource,
  extractControllerBehavior,
  pascalCase,
} from "../shared.js";

// ── Svelte part components (TabsList, TabsTrigger, TabsContent) ────────────

function sveltePartFile(part, options, contract) {
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
  const propDecls = [
    valueHandling ? `  ${valuePropName}: string;` : null,
    disabledHandling ? `  ${disabledPropName}?: boolean;` : null,
  ].filter(Boolean).join("\n");

  const typeAttr = isButton ? '\n    type={props.type ?? "button"}' : "";
  const valueAttribute = valueHandling ? `\n    ${valueAttr}={${valuePropName}}` : "";
  const disabledAttribute = disabledHandling
    ? `\n    disabled={${disabledPropName}}\n    ${disabledAttr}={${disabledPropName} ? "true" : undefined}`
    : "";

  const propsInterface = propDecls
    ? `\ninterface Props {\n${propDecls}\n  [key: string]: unknown;\n}`
    : `\ntype Props = Record<string, unknown>;`;

  const propDestructure = [
    valueHandling ? valuePropName : null,
    disabledHandling ? disabledPropName : null,
    "...props",
  ].filter(Boolean).join(", ");

  return `<script lang="ts">
${propsInterface}
let { ${propDestructure} }: Props = $props();
</script>
<${tag}
  {...props}${typeAttr}${disabledAttribute}
  ${part.attribute}=""${valueAttribute}
>
  {@render (props as { children?: import("svelte").Snippet }).children?.()}
</${tag}>
`;
}

// ── Root Tabs.svelte ──────────────────────────────────────────────────────

function svelteRootFile({ contract, behaviorClassName, optionsTypeName, optionsNames, generatorOptions, publicContractSource, primitivesBlock, behaviorSource, helperImportLine }) {
  const root = contract.parts.find((part) => part.name === "root");
  if (!root) throw new Error(`${contract.name}: missing root part in contract.`);

  const controlledProp = contract.props.find((prop) => prop.controlled);
  const defaultProp = controlledProp
    ? contract.props.find((prop) => prop.name === `default${pascalCase(controlledProp.name)}`)
    : undefined;
  const optionNames = optionsNames.filter((name) => name !== "controlled");
  const contractPropsByName = new Map(contract.props.map((prop) => [prop.name, prop]));

  const propDeclarations = optionNames
    .map((name) => {
      const contractProp = contractPropsByName.get(name);
      const defaultValue = contractProp?.defaultValue;
      const isCallback = name.startsWith("on");
      if (isCallback) return `  ${name}?: (detail: unknown) => void;`;
      if (contractProp?.type === "boolean") return defaultValue !== undefined ? `  ${name}: boolean = ${defaultValue};` : `  ${name}?: boolean;`;
      return defaultValue !== undefined ? `  ${name}: string = "${defaultValue}";` : `  ${name}?: string;`;
    })
    .join("\n");

  const controlledExpression = controlledProp ? `${controlledProp.name} !== undefined` : "false";

  const behaviorOptionLines = [
    ...optionNames,
    "controlled",
  ]
    .map((name) => {
      if (name === "controlled") return `      controlled,`;
      return `      ${name},`;
    })
    .join("\n");

  const rootAttrLines = contract.props
    .filter((prop) => prop.name !== "controlled")
    .map((prop) => {
      if (prop.name === "controlled") return null;
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

  return `<script lang="ts">
// Generated by scripts/registry-refresh.mjs. Do not edit by hand.
import { onMount, type Snippet } from "svelte";
import "./${contract.name}.css";
${helperImportLine}
${publicContractSource}
${primitivesBlock ? `\n${primitivesBlock}\n` : ""}
${behaviorSource}

interface Props {
${propDeclarations}
  children?: Snippet;
  class?: string;
  [key: string]: unknown;
}

let {
${optionNames.map((n) => `  ${n},`).join("\n")}
  children,
  ...props
}: Props = $props();

const controlled = $derived(${controlledExpression});
${controlledWarning}
let rootEl: ${root.element === "button" ? "HTMLButtonElement" : "HTMLDivElement"} | undefined = $state();
let behavior: ${behaviorClassName} | undefined;

onMount(() => {
  behavior = new ${behaviorClassName}(rootEl!, {
${behaviorOptionLines}
  });
  behavior.sync();
  return () => behavior?.destroy();
});

$effect(() => {
  behavior?.update?.({
${behaviorOptionLines}
  });
});
</script>
<${root.element}
  bind:this={rootEl}
  {...props}
  ${root.attribute}=""
${rootAttrLines}${controlledAttrLine}
>
  {@render children?.()}
</${root.element}>
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
