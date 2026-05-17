import {
  parseContractSource,
  parseOptionsNames,
  inlinePrimitiveSource,
  extractControllerBehavior,
  validateGeneratorOptions,
  pascalCase,
} from "../shared.js";

// ── React attribute helpers ────────────────────────────────────────────────

function reactAttributeValue(prop) {
  if (prop.name === "controlled") return "controlled ? \"true\" : undefined";
  if (prop.type === "boolean") return `${prop.name} ? "true" : undefined`;
  return prop.name;
}

function reactAttributeLine(prop) {
  return `      ${prop.attribute}={${reactAttributeValue(prop)}}`;
}

function reactPartPropsSource(contract, options) {
  const valuePropParts = new Set([
    ...(options.valuePropParts ?? []),
    ...Object.keys(options.ssrSelectedState?.parts ?? {}),
  ]);
  const valuePropName = options.valuePropName;

  return contract.parts
    .filter((part) => part.name !== "root")
    .map((part) => {
      const componentName = `${contract.componentName}${pascalCase(part.name)}`;
      const elementType = part.element === "button" ? "HTMLButtonElement" : "HTMLDivElement";
      const valueProp = valuePropParts.has(part.name) ? `\n  ${valuePropName}: string;` : "";

      return `export interface ${componentName}Props extends React.${elementType === "HTMLButtonElement" ? "ButtonHTMLAttributes" : "HTMLAttributes"}<${elementType}> {${valueProp}
}`;
    })
    .join("\n\n");
}

function reactLiteral(value) {
  return typeof value === "string" ? `"${value}"` : String(value);
}

function reactSsrAttributeLine(attribute) {
  const name = attribute.reactName ?? attribute.name;
  if (attribute.value !== undefined) return `\n      ${name}={${reactLiteral(attribute.value)}}`;
  return `\n      ${name}={hasSelectedValue ? (isSelected ? ${reactLiteral(attribute.active)} : ${reactLiteral(attribute.inactive)}) : undefined}`;
}

function reactPartComponentSource(contract, options) {
  const valuePropParts = new Set([
    ...(options.valuePropParts ?? []),
    ...Object.keys(options.ssrSelectedState?.parts ?? {}),
  ]);
  const protocolValuePropParts = new Set(options.valuePropParts ?? []);
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
      const protocolValueHandling = protocolValuePropParts.has(part.name);
      const disabledHandling = disabledPropParts.has(part.name);
      if (valueHandling && (!valuePropName || !valueAttr)) {
        throw new Error(`${contract.name}/${part.name}: valuePropName must reference a contract prop.`);
      }
      if (disabledHandling && (!disabledPropName || !disabledAttr)) {
        throw new Error(`${contract.name}/${part.name}: disabledPropName must reference a contract prop.`);
      }
      const destructured = [
        valueHandling ? valuePropName : undefined,
        disabledHandling ? disabledPropName : undefined,
        "children",
        "...props",
      ].filter(Boolean).join(", ");
      const typeAttr = tag === "button" ? "\n      type={props.type ?? \"button\"}" : "";
      const valueAttribute = protocolValueHandling ? `\n      ${valueAttr}={${valuePropName}}` : "";
      const disabledAttribute = disabledHandling ? `\n      disabled={${disabledPropName}}\n      ${disabledAttr}={${disabledPropName} ? "true" : undefined}` : "";
      const ssrState = options.ssrSelectedState;
      const ssrPart = ssrState?.parts?.[part.name];
      const ssrStateSetup = ssrPart && valueHandling ? `
  const selectedValue = React.useContext(SsrSelectedValueContext);
  const hasSelectedValue = selectedValue !== undefined;
  const isSelected = selectedValue === ${ssrState.valuePropName};` : "";
      const ssrAttrs = ssrPart && valueHandling
        ? ssrPart.attributes.map((attribute) => reactSsrAttributeLine(attribute)).join("")
        : "";

      return `export function ${componentName}({ ${destructured} }: ${propsName}) {
${ssrStateSetup}
  return (
    <${tag}
      {...props}${typeAttr}${disabledAttribute}
      ${part.attribute}=""${valueAttribute}${ssrAttrs}
    >
      {children}
    </${tag}>
  );
}`;
    })
    .join("\n\n");
}

function createReactWrapperSource({ contract, behaviorClassName, optionsTypeName, optionsNames, generatorOptions }) {
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
  const destructuredOptions = nonCallbackOptionNames.map((name) => {
    const defaultValue = contractPropsByName.get(name)?.defaultValue;
    return defaultValue === undefined ? name : `${name} = "${defaultValue}"`;
  });
  const destructured = [
    ...destructuredOptions,
    ...eventCallbacks.map((ev) => ev.callbackName),
    "children",
    "...props",
  ].join(",\n  ");
  const effectDeps = [...nonCallbackOptionNames, "children"].join(", ");
  const behaviorOptionNames = controlledProp
    ? [...nonCallbackOptionNames, "controlled"]
    : nonCallbackOptionNames;
  const behaviorOptions = behaviorOptionNames.map((name) => `      ${name},`).join("\n");
  const hasDisabledOption = optionNames.includes("disabled");
  const hasLoadingOption = optionNames.includes("loading");
  const effectiveDisabledExpression = [
    hasDisabledOption ? "disabled" : null,
    hasLoadingOption ? "loading" : null,
  ].filter(Boolean).join(" || ") || "false";

  const rootAttrs = contract.props
    .filter((prop) => prop.name !== "controlled")
    .map((prop) => {
      if (polymorphicRootPropName && prop.name === "disabled") {
        return `      ${prop.attribute}={effectiveDisabled ? "true" : undefined}`;
      }
      return reactAttributeLine(prop);
    })
    .join("\n");
  const rootObjectAttrs = contract.props
    .filter((prop) => prop.name !== "controlled")
    .map((prop) => {
      if (polymorphicRootPropName && prop.name === "disabled") {
        return `      "${prop.attribute}": effectiveDisabled ? "true" : undefined,`;
      }
      return `      "${prop.attribute}": ${reactAttributeValue(prop)},`;
    })
    .join("\n");
  const controlledAttr = contract.props.find((prop) => prop.name === "controlled");
  const controlledLine = controlledAttr ? `\n      ${controlledAttr.attribute}={controlled ? "true" : undefined}` : "";
  const controlledObjectLine = controlledAttr ? `\n      "${controlledAttr.attribute}": controlled ? "true" : undefined,` : "";
  const controlledExpression = controlledProp ? `${controlledProp.name} !== undefined` : "false";
  const controlledWarning = controlledProp && defaultProp ? `
  React.useEffect(() => {
    if (${controlledProp.name} !== undefined && ${defaultProp.name} !== undefined) {
      console.warn(
        "[bambiui/${contract.name}] ${contract.componentName} received both \`${controlledProp.name}\` and \`${defaultProp.name}\`. Use \`${controlledProp.name}\` for controlled mode or \`${defaultProp.name}\` for uncontrolled mode, not both.",
      );
    }
  }, [${defaultProp.name}, ${controlledProp.name}]);
` : "";

  const publicOptionsType = controlledProp
    ? `Omit<${optionsTypeName}, "controlled">`
    : optionsTypeName;
  const rootElementType = root.element === "button" ? "HTMLButtonElement" : "HTMLDivElement";
  const rootRefType = polymorphicRootPropName ? "HTMLElement" : rootElementType;
  const nativePropsType = root.element === "button"
    ? "React.ButtonHTMLAttributes<HTMLButtonElement>"
    : "React.HTMLAttributes<HTMLDivElement>";
  const rootPropsType = polymorphicRootPropName
    ? `Omit<React.HTMLAttributes<HTMLElement>, keyof ${publicOptionsType}>`
    : `Omit<${nativePropsType}, keyof ${publicOptionsType}>`;
  const ssrState = generatorOptions.ssrSelectedState;
  const ssrSelectedExpression = ssrState?.selectedPropNames?.join(" ?? ");
  const ssrContextDecl = ssrState ? "\nconst SsrSelectedValueContext = React.createContext<string | undefined>(undefined);\n" : "";
  const ssrSelectedValueLine = ssrState ? `  const selectedValue = ${ssrSelectedExpression};\n` : "";

  const eventCallbackPropLines = eventCallbacks.map((ev) => {
    const detailType = `${contract.componentName}${pascalCase(ev.key)}Detail`;
    return `  ${ev.callbackName}?: (detail: ${detailType}) => void;`;
  }).join("\n");

  const callbackRefLines = eventCallbacks.map((ev) =>
    `  const ${ev.callbackName}Ref = React.useRef(${ev.callbackName});\n  ${ev.callbackName}Ref.current = ${ev.callbackName};`
  ).join("\n");

  const listenerSetupLines = eventCallbacks.map((ev) => {
    const detailType = `${contract.componentName}${pascalCase(ev.key)}Detail`;
    return [
      `    const ${ev.callbackName}Handler = (event: Event) => {`,
      `      const e = event as CustomEvent<${detailType}>;`,
      `      ${ev.callbackName}Ref.current?.(e.detail);`,
      `    };`,
      `    root.addEventListener(${ev.eventConstName}, ${ev.callbackName}Handler);`,
    ].join("\n");
  }).join("\n");

  const listenerTeardownLines = eventCallbacks.map((ev) =>
    `      root.removeEventListener(${ev.eventConstName}, ${ev.callbackName}Handler);`
  ).join("\n");

  const eventInterfaceExtra = eventCallbackPropLines ? `\n${eventCallbackPropLines}` : "";
  const polymorphicInterfaceExtra = polymorphicRootPropName ? "\n  [key: string]: unknown;" : "";
  const callbackRefsBlock = callbackRefLines ? `${callbackRefLines}\n` : "";
  const listenerSetupBlock = listenerSetupLines ? `\n${listenerSetupLines}\n` : "";
  const listenerTeardownBlock = listenerTeardownLines ? `${listenerTeardownLines}\n` : "";
  const rootElementSource = polymorphicRootPropName ? `  const Component = (${polymorphicRootPropName} ?? "${root.element}") as keyof React.JSX.IntrinsicElements;
  const isNativeButton = Component === "button";
  const effectiveDisabled = Boolean(${effectiveDisabledExpression});

  const rootElement = React.createElement(
    Component,
    {
      ...props,
      ref: rootRef,
      "${root.attribute}": "",
      type: isNativeButton ? ((props as React.ButtonHTMLAttributes<HTMLButtonElement>).type ?? "button") : undefined,
      disabled: isNativeButton ? effectiveDisabled : undefined,
      "aria-disabled": !isNativeButton && effectiveDisabled ? "true" : undefined,
      "aria-busy": ${hasLoadingOption ? "loading ? \"true\" : undefined" : "undefined"},
${rootObjectAttrs}${controlledObjectLine}
    },
    children,
  );` : `  const rootElement = (
    <${root.element}
      {...props}
      ref={rootRef}
      ${root.attribute}=""
${rootAttrs}${controlledLine}
    >
      {children}
    </${root.element}>
  );`;
  const originalRootReturn = polymorphicRootPropName ? `  const Component = (${polymorphicRootPropName} ?? "${root.element}") as keyof React.JSX.IntrinsicElements;
  const isNativeButton = Component === "button";
  const effectiveDisabled = Boolean(${effectiveDisabledExpression});

  return React.createElement(
    Component,
    {
      ...props,
      ref: rootRef,
      "${root.attribute}": "",
      type: isNativeButton ? ((props as React.ButtonHTMLAttributes<HTMLButtonElement>).type ?? "button") : undefined,
      disabled: isNativeButton ? effectiveDisabled : undefined,
      "aria-disabled": !isNativeButton && effectiveDisabled ? "true" : undefined,
      "aria-busy": ${hasLoadingOption ? "loading ? \"true\" : undefined" : "undefined"},
${rootObjectAttrs}${controlledObjectLine}
    },
    children,
  );` : `  return (
    <${root.element}
      {...props}
      ref={rootRef}
      ${root.attribute}=""
${rootAttrs}${controlledLine}
    >
      {children}
    </${root.element}>
  );`;
  const rootReturn = ssrState
    ? `${rootElementSource}

  return <SsrSelectedValueContext.Provider value={selectedValue}>{rootElement}</SsrSelectedValueContext.Provider>;`
    : originalRootReturn;

  return `${ssrContextDecl}export interface ${contract.componentName}Props extends ${publicOptionsType}, ${rootPropsType} {
  children?: React.ReactNode;
  className?: string;${eventInterfaceExtra}${polymorphicInterfaceExtra}
}

${reactPartPropsSource(contract, generatorOptions)}

export function ${contract.componentName}({
  ${destructured}
}: ${contract.componentName}Props) {
  const rootRef = React.useRef<${rootRefType}>(null);
  const behaviorRef = React.useRef<${behaviorClassName} | null>(null);
  const controlled = ${controlledExpression};
${ssrSelectedValueLine}${callbackRefsBlock}${controlledWarning}
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
${listenerSetupBlock}
    const behavior = new ${behaviorClassName}(root, {
${behaviorOptions}
    });
    behaviorRef.current = behavior;
    behavior.sync();

    return () => {
${listenerTeardownBlock}      behaviorRef.current = null;
      behavior.destroy();
    };
  }, []);

  React.useEffect(() => {
    behaviorRef.current?.update?.({
${behaviorOptions}
    });
  }, [${effectDeps}]);

${rootReturn}
}

${reactPartComponentSource(contract, generatorOptions)}`;
}

// ── Public API ─────────────────────────────────────────────────────────────

export function createReactArtifact({ contractSource, controllerSource, primitiveFiles = [], contractExportName, generatorOptions = {} }) {
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

  const content = `// Generated by scripts/registry-refresh.mjs. Do not edit by hand.
import * as React from "react";
import "./${contract.name}.css";
${helperImportLine}
${publicContractSource}
${primitivesBlock ? `\n${primitivesBlock}\n` : ""}
${behaviorSource}

${createReactWrapperSource({ contract, behaviorClassName, optionsTypeName, optionsNames, generatorOptions })}
`;

  return { files: { "index.tsx": content }, usedHelpers };
}
