import {
  parseContractSource,
  parseOptionsNames,
  inlinePrimitiveSource,
  extractControllerBehavior,
  pascalCase,
} from "../shared.js";

// ── Solid attribute helpers ────────────────────────────────────────────────

function solidAttributeValue(prop, accessor = "props.") {
  if (prop.name === "controlled") return "controlled() ? \"true\" : undefined";
  if (prop.type === "boolean") return `${accessor}${prop.name} ? "true" : undefined`;
  return `${accessor}${prop.name}`;
}

function solidAttributeLine(prop, accessor = "props.") {
  return `      ${prop.attribute}={${solidAttributeValue(prop, accessor)}}`;
}

// ── Part interfaces and components ────────────────────────────────────────

function solidPartPropsSource(contract, options) {
  const valuePropParts = new Set(options.valuePropParts ?? []);
  const valuePropName = options.valuePropName;

  return contract.parts
    .filter((part) => part.name !== "root")
    .map((part) => {
      const componentName = `${contract.componentName}${pascalCase(part.name)}`;
      const elementType = part.element === "button" ? "HTMLButtonElement" : "HTMLDivElement";
      const baseType = elementType === "HTMLButtonElement"
        ? "JSX.ButtonHTMLAttributes<HTMLButtonElement>"
        : "JSX.HTMLAttributes<HTMLDivElement>";
      const valueProp = valuePropParts.has(part.name) ? `\n  ${valuePropName}: string;` : "";

      return `export interface ${componentName}Props extends ${baseType} {${valueProp}
}`;
    })
    .join("\n\n");
}

function solidPartComponentSource(contract, options) {
  const valuePropParts = new Set(options.valuePropParts ?? []);
  const disabledPropParts = new Set(options.disabledPropParts ?? []);
  const valuePropName = options.valuePropName;
  const disabledPropName = options.disabledPropName;
  const propsByName = new Map(contract.props.map((prop) => [prop.name, prop]));
  const valueAttr = valuePropName ? propsByName.get(valuePropName)?.attribute : undefined;
  const disabledAttr = disabledPropName ? propsByName.get(disabledPropName)?.attribute : undefined;

  return contract.parts
    .filter((part) => part.name !== "root")
    .map((part) => {
      const componentName = `${contract.componentName}${pascalCase(part.name)}`;
      const propsName = `${componentName}Props`;
      const tag = part.element;
      const valueHandling = valuePropParts.has(part.name);
      const disabledHandling = disabledPropParts.has(part.name);
      if (valueHandling && (!valuePropName || !valueAttr)) {
        throw new Error(`${contract.name}/${part.name}: valuePropName must reference a contract prop.`);
      }
      if (disabledHandling && (!disabledPropName || !disabledAttr)) {
        throw new Error(`${contract.name}/${part.name}: disabledPropName must reference a contract prop.`);
      }
      // Split component-controlled props from DOM-safe spread props.
      const splitKeys = [
        valueHandling ? valuePropName : null,
        disabledHandling ? disabledPropName : null,
        tag === "button" ? "type" : null,
        "children",
      ].filter(Boolean);
      const splitList = splitKeys.map((k) => `"${k}"`).join(", ");

      const typeAttr = tag === "button" ? "\n      type={local.type ?? \"button\"}" : "";
      const valueAttribute = valueHandling ? `\n      ${valueAttr}={local.${valuePropName}}` : "";
      const disabledAttribute = disabledHandling
        ? `\n      disabled={local.${disabledPropName}}\n      ${disabledAttr}={local.${disabledPropName} ? "true" : undefined}`
        : "";

      return `export function ${componentName}(props: ${propsName}) {
  const [local, rest] = splitProps(props, [${splitList}]);
  return (
    <${tag}
      {...rest}${typeAttr}${disabledAttribute}
      ${part.attribute}=""${valueAttribute}
    >
      {local.children}
    </${tag}>
  );
}`;
    })
    .join("\n\n");
}

// ── Root wrapper ───────────────────────────────────────────────────────────

function createSolidWrapperSource({ contract, behaviorClassName, optionsTypeName, optionsNames, generatorOptions }) {
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

  // splitProps key list: all non-callback option names + event callback names + children
  const splitLocalKeys = [
    ...nonCallbackOptionNames,
    ...eventCallbacks.map((ev) => ev.callbackName),
    "children",
  ].map((n) => `"${n}"`).join(", ");

  // Build behaviorOptions using local.X (non-callback only)
  const behaviorOptions = [...nonCallbackOptionNames, "controlled"]
    .map((name) => {
      if (name === "controlled") return `      controlled: controlled(),`;
      return `      ${name}: local.${name},`;
    })
    .join("\n");

  // Root element data attributes use local.X
  const rootAttrs = contract.props
    .filter((prop) => prop.name !== "controlled")
    .map((prop) => solidAttributeLine(prop, "local."))
    .join("\n");

  const controlledAttr = contract.props.find((prop) => prop.name === "controlled");
  const controlledLine = controlledAttr ? `\n      ${controlledAttr.attribute}={controlled() ? "true" : undefined}` : "";
  const controlledExpression = controlledProp ? `local.${controlledProp.name} !== undefined` : "false";

  const publicOptionsType = controlledProp
    ? `Omit<${optionsTypeName}, "controlled">`
    : optionsTypeName;

  const rootElement = root.element;
  const nativeAttrType = rootElement === "button"
    ? "JSX.ButtonHTMLAttributes<HTMLButtonElement>"
    : "JSX.HTMLAttributes<HTMLDivElement>";

  const controlledWarning = controlledProp && defaultProp ? `
  createEffect(() => {
    if (local.${controlledProp.name} !== undefined && local.${defaultProp.name} !== undefined) {
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

  // Event listener setup in onMount
  const listenerSetupLines = eventCallbacks.map((ev) => {
    const detailType = `${contract.componentName}${pascalCase(ev.key)}Detail`;
    return [
      `    const ${ev.callbackName}Handler = (event: Event) => {`,
      `      const e = event as CustomEvent<${detailType}>;`,
      `      local.${ev.callbackName}?.(e.detail);`,
      `    };`,
      `    rootRef!.addEventListener(${ev.eventConstName}, ${ev.callbackName}Handler);`,
    ].join("\n");
  }).join("\n");

  const listenerTeardownLines = eventCallbacks.map((ev) =>
    `      rootRef!.removeEventListener(${ev.eventConstName}, ${ev.callbackName}Handler);`
  ).join("\n");

  const eventInterfaceExtra = eventCallbackPropLines ? `\n${eventCallbackPropLines}` : "";
  const listenerSetupBlock = listenerSetupLines ? `${listenerSetupLines}\n` : "";
  const cleanupBlock = listenerTeardownLines
    ? `    onCleanup(() => {\n${listenerTeardownLines}\n      behavior?.destroy();\n    });`
    : `    onCleanup(() => behavior?.destroy());`;

  return `export interface ${contract.componentName}Props extends ${publicOptionsType}, Omit<${nativeAttrType}, keyof ${publicOptionsType}> {
  children?: JSX.Element;${eventInterfaceExtra}
}

${solidPartPropsSource(contract, generatorOptions)}

export function ${contract.componentName}(props: ${contract.componentName}Props) {
  const [local, rest] = splitProps(props, [${splitLocalKeys}]);
  let rootRef: ${rootElement === "button" ? "HTMLButtonElement" : "HTMLDivElement"} | undefined;
  let behavior: ${behaviorClassName} | undefined;
  const controlled = () => ${controlledExpression};
${controlledWarning}
  onMount(() => {
${listenerSetupBlock}    behavior = new ${behaviorClassName}(rootRef!, {
${behaviorOptions}
    });
    behavior.sync();
${cleanupBlock}
  });

  const resolvedChildren = children(() => local.children);

  createEffect(() => {
    resolvedChildren(); // re-sync aria/state when triggers or content are conditionally rendered
    if (behavior) {
      behavior.update?.({
${behaviorOptions}
      });
    }
  });

  return (
    <${rootElement}
      ref={rootRef}
      {...rest}
      ${root.attribute}=""
${rootAttrs}${controlledLine}
    >
      {local.children}
    </${rootElement}>
  );
}

${solidPartComponentSource(contract, generatorOptions)}`;
}

// ── Public API ─────────────────────────────────────────────────────────────

export function createSolidArtifact({ contractSource, controllerSource, primitiveFiles = [], contractExportName, generatorOptions = {} }) {
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

  const content = `// Generated by scripts/registry-refresh.mjs. Do not edit by hand.
import { createEffect, onMount, onCleanup, splitProps, children, type JSX } from "solid-js";
import "./${contract.name}.css";
${helperImportLine}
${publicContractSource}
${primitivesBlock ? `\n${primitivesBlock}\n` : ""}
${behaviorSource}

${createSolidWrapperSource({ contract, behaviorClassName, optionsTypeName, optionsNames, generatorOptions })}
`;

  return { files: { "index.tsx": content }, usedHelpers };
}
