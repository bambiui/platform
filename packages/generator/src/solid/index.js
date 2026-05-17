import {
  parseContractSource,
  parseOptionsNames,
  inlinePrimitiveSource,
  extractControllerBehavior,
  validateGeneratorOptions,
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

function htmlElementType(element) {
  return `HTML${pascalCase(element)}Element`;
}

// ── Part interfaces and components ────────────────────────────────────────

function solidPartPropsSource(contract, options) {
  const valuePropParts = new Set([
    ...(options.valuePropParts ?? []),
    ...Object.keys(options.ssrSelectedState?.parts ?? {}),
  ]);
  const valuePropName = options.valuePropName;

  return contract.parts
    .filter((part) => part.name !== "root")
    .map((part) => {
      const componentName = `${contract.componentName}${pascalCase(part.name)}`;
      const valueProp = valuePropParts.has(part.name) ? `\n  ${valuePropName}: string;` : "";

      return `export type ${componentName}Props = JSX.IntrinsicElements["${part.element}"] & {${valueProp}
};`;
    })
    .join("\n\n");
}

function solidLiteral(value) {
  return typeof value === "string" ? `"${value}"` : String(value);
}

function solidSsrAttributeLine(attribute) {
  const name = attribute.solidName ?? attribute.name;
  if (attribute.value !== undefined) return `\n      ${name}={${solidLiteral(attribute.value)}}`;
  return `\n      ${name}={hasSelectedValue() ? (isSelected() ? ${solidLiteral(attribute.active)} : ${solidLiteral(attribute.inactive)}) : undefined}`;
}

function solidPartComponentSource(contract, options) {
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

  return contract.parts
    .filter((part) => part.name !== "root")
    .map((part) => {
      const componentName = `${contract.componentName}${pascalCase(part.name)}`;
      const propsName = `${componentName}Props`;
      const tag = part.element;
      const valueHandling = valuePropParts.has(part.name);
      const protocolValueHandling = protocolValuePropParts.has(part.name);
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
        defaultTypeParts.has(part.name) ? "type" : null,
        "children",
      ].filter(Boolean);
      const splitList = splitKeys.map((k) => `"${k}"`).join(", ");

      const typeAttr = defaultTypeParts.has(part.name) ? `\n      type={local.type ?? "${options.defaultTypeValue}"}` : "";
      const valueAttribute = protocolValueHandling ? `\n      ${valueAttr}={local.${valuePropName}}` : "";
      const disabledAttribute = disabledHandling
        ? `\n      disabled={local.${disabledPropName}}\n      ${disabledAttr}={local.${disabledPropName} ? "true" : undefined}`
        : "";
      const ssrState = options.ssrSelectedState;
      const ssrPart = ssrState?.parts?.[part.name];
      const ssrStateSetup = ssrPart && valueHandling ? `
  const selectedValue = useContext(SsrSelectedValueContext);
  const hasSelectedValue = () => selectedValue?.() !== undefined;
  const isSelected = () => selectedValue?.() === local.${ssrState.valuePropName};` : "";
      const ssrAttrs = ssrPart && valueHandling
        ? ssrPart.attributes.map((attribute) => solidSsrAttributeLine(attribute)).join("")
        : "";

      return `export function ${componentName}(props: ${propsName}) {
  const [local, rest] = splitProps(props, [${splitList}]);
${ssrStateSetup}
  return (
    <${tag}
      {...rest}${typeAttr}${disabledAttribute}
      ${part.attribute}=""${valueAttribute}${ssrAttrs}
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
  const polymorphicRootPropName = generatorOptions.polymorphicRootPropName;

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
  const behaviorOptionNames = controlledProp
    ? [...nonCallbackOptionNames, "controlled"]
    : nonCallbackOptionNames;
  const behaviorOptions = behaviorOptionNames
    .map((name) => {
      if (name === "controlled") return `      controlled: controlled(),`;
      return `      ${name}: local.${name},`;
    })
    .join("\n");
  const hasDisabledOption = optionNames.includes("disabled");
  const hasLoadingOption = optionNames.includes("loading");
  const effectiveDisabledExpression = [
    hasDisabledOption ? "local.disabled" : null,
    hasLoadingOption ? "local.loading" : null,
  ].filter(Boolean).join(" || ") || "false";

  // Root element data attributes use local.X
  const rootAttrs = contract.props
    .filter((prop) => prop.name !== "controlled")
    .map((prop) => {
      if (polymorphicRootPropName && prop.name === "disabled") {
        return `      ${prop.attribute}={effectiveDisabled() ? "true" : undefined}`;
      }
      return solidAttributeLine(prop, "local.");
    })
    .join("\n");

  const controlledAttr = contract.props.find((prop) => prop.name === "controlled");
  const controlledLine = controlledAttr ? `\n      ${controlledAttr.attribute}={controlled() ? "true" : undefined}` : "";
  const controlledExpression = controlledProp ? `local.${controlledProp.name} !== undefined` : "false";

  const publicOptionsType = controlledProp
    ? `Omit<${optionsTypeName}, "controlled">`
    : optionsTypeName;

  const rootTag = root.element;
  const nativeAttrType = `JSX.IntrinsicElements["${rootTag}"]`;
  const rootRefType = polymorphicRootPropName
    ? "HTMLElement"
    : htmlElementType(rootTag);
  const rootPropsType = polymorphicRootPropName
    ? "JSX.HTMLAttributes<HTMLElement>"
    : nativeAttrType;
  const ssrState = generatorOptions.ssrSelectedState;
  const ssrSelectedExpression = ssrState?.selectedPropNames?.map((name) => `local.${name}`).join(" ?? ");
  const ssrContextDecl = ssrState ? "\nconst SsrSelectedValueContext = createContext<(() => string | undefined) | undefined>();\n" : "";
  const ssrSelectedValueLine = ssrState ? `  const selectedValue = () => ${ssrSelectedExpression};\n` : "";

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
  const polymorphicInterfaceExtra = polymorphicRootPropName ? "\n  [key: string]: unknown;" : "";
  const listenerSetupBlock = listenerSetupLines ? `${listenerSetupLines}\n` : "";
  const cleanupBlock = listenerTeardownLines
    ? `    onCleanup(() => {\n${listenerTeardownLines}\n      behavior?.destroy();\n    });`
    : `    onCleanup(() => behavior?.destroy());`;
  const polymorphicNativeElement = generatorOptions.polymorphicNativeElement ?? rootTag;
  const polymorphicTypeDefault = generatorOptions.polymorphicTypeDefault;
  const polymorphicSetup = polymorphicRootPropName ? `  const Component = () => local.${polymorphicRootPropName} ?? "${rootTag}";
  const isNativeElement = () => Component() === "${polymorphicNativeElement}";
  const effectiveDisabled = () => Boolean(${effectiveDisabledExpression});
` : "";
  const rootElementSource = polymorphicRootPropName ? `  const rootElement = (
    <Dynamic
      component={Component()}
      ref={rootRef}
      {...rest}
      ${root.attribute}=""
      type={isNativeElement() ? (rest as { type?: string }).type ?? ${polymorphicTypeDefault ? `"${polymorphicTypeDefault}"` : "undefined"} : undefined}
      disabled={isNativeElement() ? effectiveDisabled() : undefined}
      aria-disabled={!isNativeElement() && effectiveDisabled() ? "true" : undefined}
      aria-busy={${hasLoadingOption ? "local.loading ? \"true\" : undefined" : "undefined"}}
${rootAttrs}${controlledLine}
    >
      {resolvedChildren()}
    </Dynamic>
  );` : `  const rootElement = (
    <${rootTag}
      ref={rootRef}
      {...rest}
      ${root.attribute}=""
${rootAttrs}${controlledLine}
    >
      {resolvedChildren()}
    </${rootTag}>
  );`;
  const originalRootReturn = polymorphicRootPropName ? `  return (
    <Dynamic
      component={Component()}
      ref={rootRef}
      {...rest}
      ${root.attribute}=""
      type={isNativeElement() ? (rest as { type?: string }).type ?? ${polymorphicTypeDefault ? `"${polymorphicTypeDefault}"` : "undefined"} : undefined}
      disabled={isNativeElement() ? effectiveDisabled() : undefined}
      aria-disabled={!isNativeElement() && effectiveDisabled() ? "true" : undefined}
      aria-busy={${hasLoadingOption ? "local.loading ? \"true\" : undefined" : "undefined"}}
${rootAttrs}${controlledLine}
    >
      {resolvedChildren()}
    </Dynamic>
  );` : `  return (
    <${rootTag}
      ref={rootRef}
      {...rest}
      ${root.attribute}=""
${rootAttrs}${controlledLine}
    >
      {resolvedChildren()}
    </${rootTag}>
  );`;
  const rootReturn = ssrState
    ? `${rootElementSource}

  return <SsrSelectedValueContext.Provider value={selectedValue}>{rootElement}</SsrSelectedValueContext.Provider>;`
    : originalRootReturn;

  return `${ssrContextDecl}export interface ${contract.componentName}Props extends ${publicOptionsType}, Omit<${rootPropsType}, keyof ${publicOptionsType}> {
  children?: JSX.Element;${eventInterfaceExtra}${polymorphicInterfaceExtra}
}

${solidPartPropsSource(contract, generatorOptions)}

export function ${contract.componentName}(props: ${contract.componentName}Props) {
  const [local, rest] = splitProps(props, [${splitLocalKeys}]);
  let rootRef: ${rootRefType} | undefined;
  let behavior: ${behaviorClassName} | undefined;
  const controlled = () => ${controlledExpression};
${ssrSelectedValueLine}${polymorphicSetup}${controlledWarning}
  onMount(() => {
${listenerSetupBlock}    behavior = new ${behaviorClassName}(rootRef!, {
${behaviorOptions}
    });
    behavior.sync();
${cleanupBlock}
  });

  const resolvedChildren = children(() => local.children);

  createEffect(() => {
    resolvedChildren(); // re-sync aria/state when child parts are conditionally rendered
    if (behavior) {
      behavior.update?.({
${behaviorOptions}
      });
    }
  });

${rootReturn}
}

${solidPartComponentSource(contract, generatorOptions)}`;
}

// ── Public API ─────────────────────────────────────────────────────────────

export function createSolidArtifact({ contractSource, controllerSource, primitiveFiles = [], contractExportName, generatorOptions = {} }) {
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

  const dynamicImportLine = generatorOptions.polymorphicRootPropName ? 'import { Dynamic } from "solid-js/web";\n' : "";
  const solidImports = [
    generatorOptions.ssrSelectedState ? "createContext" : null,
    "createEffect",
    "onMount",
    "onCleanup",
    "splitProps",
    "children",
    generatorOptions.ssrSelectedState ? "useContext" : null,
    "type JSX",
  ].filter(Boolean).join(", ");

  const content = `// Generated by scripts/registry-refresh.mjs. Do not edit by hand.
import { ${solidImports} } from "solid-js";
${dynamicImportLine}${helperImportLine}
${publicContractSource}
${primitivesBlock ? `\n${primitivesBlock}\n` : ""}
${behaviorSource}

${createSolidWrapperSource({ contract, behaviorClassName, optionsTypeName, optionsNames, generatorOptions })}
`;

  return { files: { "index.tsx": content }, usedHelpers };
}
