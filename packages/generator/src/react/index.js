import {
  getOmittedEmbeddedPartNames,
  htmlElementType,
  pascalCase,
  prepareArtifactGeneration,
  supportsDisabledAttribute,
} from "../shared.js";

// ── React attribute helpers ────────────────────────────────────────────────

function reactAttributeValue(prop) {
  if (prop.name === "controlled") return 'controlled ? "true" : undefined';
  if (prop.type === "boolean") return `${prop.name} ? "true" : undefined`;
  return prop.name;
}

function reactDataAttributeLine(attribute, expression, indent = "      ") {
  return attribute.attributeConst
    ? `${indent}{...{ [${attribute.attributeConst}]: ${expression} }}`
    : `${indent}${attribute.attribute}={${expression}}`;
}

function reactMarkerAttributeLine(attribute, indent = "      ") {
  return reactDataAttributeLine(attribute, '""', indent);
}

function reactObjectAttributeLine(attribute, expression, indent = "      ") {
  return attribute.attributeConst
    ? `${indent}[${attribute.attributeConst}]: ${expression},`
    : `${indent}"${attribute.attribute}": ${expression},`;
}

function reactPartPropsSource(contract, options) {
  const valuePropParts = new Set([
    ...(options.valuePropParts ?? []),
    ...Object.keys(options.ssrSelectedState?.parts ?? {}),
  ]);
  const valuePropName = options.valuePropName;
  const disabledPropParts = new Set(options.disabledPropParts ?? []);
  const disabledPropName = options.disabledPropName;

  const omittedParts = getOmittedEmbeddedPartNames(options);

  return contract.parts
    .filter((part) => part.name !== "root" && !omittedParts.has(part.name))
    .map((part) => {
      const componentName = `${contract.componentName}${pascalCase(part.name)}`;
      const valueProp = valuePropParts.has(part.name)
        ? `\n  ${valuePropName}: string;`
        : "";
      const disabledProp = disabledPropParts.has(part.name)
        ? `\n  ${disabledPropName}?: boolean;`
        : "";
      const extraProps = `${valueProp}${disabledProp}`;

      if (!extraProps)
        return `export type ${componentName}Props = React.ComponentPropsWithoutRef<"${part.element}">;`;

      return `export interface ${componentName}Props extends React.ComponentPropsWithoutRef<"${part.element}"> {${extraProps}
}`;
    })
    .join("\n\n");
}

function reactLiteral(value) {
  return typeof value === "string" ? `"${value}"` : String(value);
}

function reactSsrAttributeLine(attribute) {
  const name = attribute.reactName ?? attribute.name;
  if (attribute.value !== undefined)
    return `\n      ${name}={${reactLiteral(attribute.value)}}`;
  return `\n      ${name}={hasSelectedValue ? (isSelected ? ${reactLiteral(attribute.active)} : ${reactLiteral(attribute.inactive)}) : undefined}`;
}

function reactEmbeddedAttributeLine(attribute) {
  const name = attribute.reactName ?? attribute.name;
  if (attribute.selected)
    return `\n        ${name}={hasSelectedValue ? isSelected : undefined}`;
  if (attribute.propName) return `\n        ${name}={${attribute.propName}}`;
  if (attribute.value !== undefined)
    return `\n        ${name}={${reactLiteral(attribute.value)}}`;
  return `\n        ${name}=""`;
}

function reactEmbeddedChildrenSource(part, contract, options) {
  return (options.embeddedParts ?? [])
    .filter((embedded) => embedded.parentPartName === part.name)
    .map((embedded) => {
      const child = contract.parts.find(
        (candidate) => candidate.name === embedded.childPartName,
      );
      if (!child) return "";
      const attrs = (embedded.attributes ?? [])
        .map((attribute) => reactEmbeddedAttributeLine(attribute))
        .join("");
      return `      <${child.element}
${reactMarkerAttributeLine(child, "        ")}${attrs}
      />`;
    })
    .filter(Boolean)
    .join("\n");
}

function reactPartComponentSource(contract, options) {
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
  const valueAttr = valuePropName
    ? propsByName.get(valuePropName)?.attribute
    : undefined;
  const disabledAttr = disabledPropName
    ? propsByName.get(disabledPropName)?.attribute
    : undefined;
  const omittedParts = getOmittedEmbeddedPartNames(options);

  return contract.parts
    .filter((part) => part.name !== "root" && !omittedParts.has(part.name))
    .map((part) => {
      const componentName = `${contract.componentName}${pascalCase(part.name)}`;
      const propsName = `${componentName}Props`;
      const tag = part.element;
      const valueHandling = valuePropParts.has(part.name);
      const protocolValueHandling = protocolValuePropParts.has(part.name);
      const disabledHandling = disabledPropParts.has(part.name);
      if (valueHandling && (!valuePropName || !valueAttr)) {
        throw new Error(
          `${contract.name}/${part.name}: valuePropName must reference a contract prop.`,
        );
      }
      if (disabledHandling && (!disabledPropName || !disabledAttr)) {
        throw new Error(
          `${contract.name}/${part.name}: disabledPropName must reference a contract prop.`,
        );
      }
      const destructured = [
        valueHandling ? valuePropName : undefined,
        disabledHandling ? disabledPropName : undefined,
        "children",
        "...props",
      ]
        .filter(Boolean)
        .join(", ");
      const typeAttr = defaultTypeParts.has(part.name)
        ? `\n      type={props.type ?? "${options.defaultTypeValue}"}`
        : "";
      const valueAttribute = protocolValueHandling
        ? `\n${reactDataAttributeLine({ attribute: valueAttr, attributeConst: propsByName.get(valuePropName)?.attributeConst }, valuePropName)}`
        : "";
      const nativeDisabledAttribute =
        disabledHandling && supportsDisabledAttribute(tag)
          ? `\n      disabled={${disabledPropName}}`
          : "";
      const disabledAttribute = disabledHandling
        ? `${nativeDisabledAttribute}\n${reactDataAttributeLine({ attribute: disabledAttr, attributeConst: propsByName.get(disabledPropName)?.attributeConst }, `${disabledPropName} ? "true" : undefined`)}`
        : "";
      const ssrState = options.ssrSelectedState;
      const ssrPart = ssrState?.parts?.[part.name];
      const ssrStateSetup =
        ssrPart && valueHandling
          ? `
  const selectedValue = React.useContext(SsrSelectedValueContext);
  const hasSelectedValue = selectedValue !== undefined;
  const isSelected = selectedValue === ${ssrState.valuePropName};`
          : "";
      const ssrAttrs =
        ssrPart && valueHandling
          ? ssrPart.attributes
              .map((attribute) => reactSsrAttributeLine(attribute))
              .join("")
          : "";
      const embeddedChildren = reactEmbeddedChildrenSource(
        part,
        contract,
        options,
      );
      const embeddedChildrenBlock = embeddedChildren
        ? `${embeddedChildren}\n`
        : "";

      return `export function ${componentName}({ ${destructured} }: ${propsName}) {
${ssrStateSetup}
  return (
    <${tag}
      {...props}${typeAttr}${disabledAttribute}
${reactMarkerAttributeLine(part)}${valueAttribute}${ssrAttrs}
    >
${embeddedChildrenBlock}      {children}
    </${tag}>
  );
}`;
    })
    .join("\n\n");
}

function createReactWrapperSource({
  contract,
  behaviorClassName,
  optionsTypeName,
  optionsNames,
  generatorOptions,
}) {
  const root = contract.parts.find((part) => part.name === "root");
  if (!root)
    throw new Error(`${contract.name}: missing root part in contract.`);
  const polymorphicRootPropName = generatorOptions.polymorphicRootPropName;

  const controlledProp = contract.props.find((prop) => prop.controlled);
  const defaultProp = controlledProp
    ? contract.props.find(
        (prop) => prop.name === `default${pascalCase(controlledProp.name)}`,
      )
    : undefined;
  const optionNames = optionsNames.filter((name) => name !== "controlled");
  // Event callbacks come from contract.events; never from optionsNames
  const eventCallbacks = contract.events ?? [];
  const nonCallbackOptionNames = optionNames.filter(
    (name) => !name.startsWith("on"),
  );
  const contractPropsByName = new Map(
    contract.props.map((prop) => [prop.name, prop]),
  );
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
  const behaviorOptionNames = controlledProp
    ? [...nonCallbackOptionNames, "controlled"]
    : nonCallbackOptionNames;
  const effectDeps = behaviorOptionNames.join(", ");
  const behaviorOptions = behaviorOptionNames
    .map((name) => `      ${name},`)
    .join("\n");
  const hasDisabledOption = optionNames.includes("disabled");
  const hasLoadingOption = optionNames.includes("loading");
  const effectiveDisabledExpression =
    [hasDisabledOption ? "disabled" : null, hasLoadingOption ? "loading" : null]
      .filter(Boolean)
      .join(" || ") || "false";

  const rootAttrs = contract.props
    .filter((prop) => prop.name !== "controlled")
    .map((prop) => {
      if (polymorphicRootPropName && prop.name === "disabled") {
        return `      ${prop.attribute}={effectiveDisabled ? "true" : undefined}`;
      }
      return reactDataAttributeLine(prop, reactAttributeValue(prop));
    })
    .join("\n");
  const rootObjectAttrs = contract.props
    .filter((prop) => prop.name !== "controlled")
    .map((prop) => {
      if (polymorphicRootPropName && prop.name === "disabled") {
        return `      "${prop.attribute}": effectiveDisabled ? "true" : undefined,`;
      }
      return reactObjectAttributeLine(prop, reactAttributeValue(prop));
    })
    .join("\n");
  const controlledAttr = contract.props.find(
    (prop) => prop.name === "controlled",
  );
  const controlledLine = controlledAttr
    ? `\n${reactDataAttributeLine(controlledAttr, 'controlled ? "true" : undefined')}`
    : "";
  const controlledObjectLine = controlledAttr
    ? `\n${reactObjectAttributeLine(controlledAttr, 'controlled ? "true" : undefined')}`
    : "";
  const controlledExpression = controlledProp
    ? `${controlledProp.name} !== undefined`
    : "false";
  const controlledDeclaration = controlledProp
    ? `  const controlled = ${controlledExpression};\n`
    : "";
  const controlledWarning =
    controlledProp && defaultProp
      ? `
  React.useEffect(() => {
    if (${controlledProp.name} !== undefined && ${defaultProp.name} !== undefined) {
      console.warn(
        "[bambiui/${contract.name}] ${contract.componentName} received both \`${controlledProp.name}\` and \`${defaultProp.name}\`. Use \`${controlledProp.name}\` for controlled mode or \`${defaultProp.name}\` for uncontrolled mode, not both.",
      );
    }
  }, [${defaultProp.name}, ${controlledProp.name}]);
`
      : "";

  const publicOptionsType = controlledProp
    ? `Omit<${optionsTypeName}, "controlled">`
    : optionsTypeName;
  const rootElementType = polymorphicRootPropName
    ? "HTMLElement"
    : htmlElementType(root.element);
  const rootRefType = polymorphicRootPropName ? "HTMLElement" : rootElementType;
  const rootPropsType = polymorphicRootPropName
    ? `Omit<React.HTMLAttributes<HTMLElement>, keyof ${publicOptionsType}>`
    : `Omit<React.ComponentPropsWithoutRef<"${root.element}">, keyof ${publicOptionsType}>`;
  const ssrState = generatorOptions.ssrSelectedState;
  const ssrSelectedExpression = ssrState?.selectedPropNames?.join(" ?? ");
  const ssrContextDecl = ssrState
    ? "\nconst SsrSelectedValueContext = React.createContext<string | undefined>(undefined);\n"
    : "";
  const ssrSelectedValueLine = ssrState
    ? `  const selectedValue = ${ssrSelectedExpression};\n`
    : "";

  const eventCallbackPropLines = eventCallbacks
    .map((ev) => {
      const detailType = `${contract.componentName}${pascalCase(ev.key)}Detail`;
      return `  ${ev.callbackName}?: (detail: ${detailType}) => void;`;
    })
    .join("\n");

  const callbackRefLines = eventCallbacks
    .map(
      (ev) =>
        `  const ${ev.callbackName}Ref = React.useRef(${ev.callbackName});`,
    )
    .join("\n");

  const callbackRefUpdateEffects = eventCallbacks
    .map(
      (ev) =>
        `  React.useEffect(() => {\n    ${ev.callbackName}Ref.current = ${ev.callbackName};\n  }, [${ev.callbackName}]);`,
    )
    .join("\n\n");

  const listenerSetupLines = eventCallbacks
    .map((ev) => {
      const detailType = `${contract.componentName}${pascalCase(ev.key)}Detail`;
      return [
        `    const ${ev.callbackName}Handler = (event: Event) => {`,
        `      const e = event as CustomEvent<${detailType}>;`,
        `      ${ev.callbackName}Ref.current?.(e.detail);`,
        `    };`,
        `    root.addEventListener(${ev.eventConstName}, ${ev.callbackName}Handler);`,
      ].join("\n");
    })
    .join("\n");

  const listenerTeardownLines = eventCallbacks
    .map(
      (ev) =>
        `      root.removeEventListener(${ev.eventConstName}, ${ev.callbackName}Handler);`,
    )
    .join("\n");

  const eventInterfaceExtra = eventCallbackPropLines
    ? `\n${eventCallbackPropLines}`
    : "";
  const polymorphicInterfaceExtra = polymorphicRootPropName
    ? "\n  [key: string]: unknown;"
    : "";
  const callbackRefsBlock = callbackRefLines ? `${callbackRefLines}\n` : "";
  const callbackRefUpdateBlock = callbackRefUpdateEffects
    ? `${callbackRefUpdateEffects}\n\n`
    : "";
  const listenerSetupBlock = listenerSetupLines
    ? `\n${listenerSetupLines}\n`
    : "";
  const listenerTeardownBlock = listenerTeardownLines
    ? `${listenerTeardownLines}\n`
    : "";
  const polymorphicNativeElement =
    generatorOptions.polymorphicNativeElement ?? root.element;
  const polymorphicTypeDefault = generatorOptions.polymorphicTypeDefault;
  const rootElementSource = polymorphicRootPropName
    ? `  const Component = (${polymorphicRootPropName} ?? "${root.element}") as keyof React.JSX.IntrinsicElements;
  const isNativeElement = Component === "${polymorphicNativeElement}";
  const effectiveDisabled = Boolean(${effectiveDisabledExpression});

  const rootElement = React.createElement(
    Component,
    {
      ...props,
      ref: rootRef,
${reactObjectAttributeLine(root, '""')}
      type: isNativeElement ? ((props as { type?: string }).type ?? ${polymorphicTypeDefault ? `"${polymorphicTypeDefault}"` : "undefined"}) : undefined,
      disabled: isNativeElement ? effectiveDisabled : undefined,
      "aria-disabled": !isNativeElement && effectiveDisabled ? "true" : undefined,
      "aria-busy": ${hasLoadingOption ? 'loading ? "true" : undefined' : "undefined"},
${rootObjectAttrs}${controlledObjectLine}
    },
    children,
  );`
    : `  const rootElement = (
    <${root.element}
      {...props}
      ref={rootRef}
${reactMarkerAttributeLine(root)}
${rootAttrs}${controlledLine}
    >
      {children}
    </${root.element}>
  );`;
  const originalRootReturn = polymorphicRootPropName
    ? `  const Component = (${polymorphicRootPropName} ?? "${root.element}") as keyof React.JSX.IntrinsicElements;
  const isNativeElement = Component === "${polymorphicNativeElement}";
  const effectiveDisabled = Boolean(${effectiveDisabledExpression});

  return React.createElement(
    Component,
    {
      ...props,
      ref: rootRef,
${reactObjectAttributeLine(root, '""')}
      type: isNativeElement ? ((props as { type?: string }).type ?? ${polymorphicTypeDefault ? `"${polymorphicTypeDefault}"` : "undefined"}) : undefined,
      disabled: isNativeElement ? effectiveDisabled : undefined,
      "aria-disabled": !isNativeElement && effectiveDisabled ? "true" : undefined,
      "aria-busy": ${hasLoadingOption ? 'loading ? "true" : undefined' : "undefined"},
${rootObjectAttrs}${controlledObjectLine}
    },
    children,
  );`
    : `  return (
    <${root.element}
      {...props}
      ref={rootRef}
${reactMarkerAttributeLine(root)}
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
${controlledDeclaration}${ssrSelectedValueLine}${callbackRefsBlock}${controlledWarning}${callbackRefUpdateBlock}  React.useEffect(() => {
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
  }, [${effectDeps}]);

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

export function createReactArtifact(options) {
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

  const content = `// Generated by scripts/registry-refresh.mjs. Do not edit by hand.
import * as React from "react";
${helperImportLine}
${publicContractSource}
${primitivesBlock ? `\n${primitivesBlock}\n` : ""}
${behaviorSource}

${createReactWrapperSource({ contract, behaviorClassName, optionsTypeName, optionsNames, generatorOptions })}
`;

  return { files: { "index.tsx": `${content.trimEnd()}\n` }, usedHelpers };
}
