function pascalCase(value) {
  return value
    .split(/[-_]/u)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join("");
}

function attrNameFromConst(constantsSource, constName) {
  const match = constantsSource.match(new RegExp(`const ${constName} = "([^"]+)" as const;`, "u"));
  if (!match) throw new Error(`Unable to resolve attribute constant: ${constName}`);
  return match[1];
}

function extractPublicContractSource(source, contractExportName) {
  const withoutImport = source.replace(/^import[\s\S]*?;\n\n/u, "");
  const [publicContract] = withoutImport.split(`\nexport const ${contractExportName} = `);

  if (!publicContract) {
    throw new Error(`Unable to extract public contract before ${contractExportName}.`);
  }

  return publicContract
    .replaceAll(/export const ([A-Z0-9_]+) =/gu, "const $1 =")
    .replace(/\n$/u, "");
}

function parseContract(source, publicContractSource, contractExportName) {
  const contractMatch = source.match(
    new RegExp(`export const ${contractExportName} = defineContract\\(([\\s\\S]*?)\\s+as const\\);`, "u"),
  );
  if (!contractMatch) {
    throw new Error(`Unable to parse contract: ${contractExportName}.`);
  }

  const contractBody = contractMatch[1];
  const nameMatch = contractBody.match(/name:\s*"([^"]+)"/u);
  if (!nameMatch) throw new Error(`Unable to parse contract name: ${contractExportName}.`);

  const partsBlock = contractBody.match(/parts:\s*\[([\s\S]*?)\],\n\s*props:/u)?.[1];
  const propsBlock = contractBody.match(/props:\s*\{([\s\S]*?)\},\n\s*events:/u)?.[1];
  if (!partsBlock || !propsBlock) {
    throw new Error(`Unable to parse contract parts or props: ${contractExportName}.`);
  }

  const parts = [];
  for (const match of partsBlock.matchAll(/\{\s*name:\s*"([^"]+)"[\s\S]*?attribute:\s*([A-Z0-9_]+)[\s\S]*?element:\s*"([^"]+)"/gu)) {
    parts.push({
      name: match[1],
      attributeConst: match[2],
      attribute: attrNameFromConst(publicContractSource, match[2]),
      element: match[3],
    });
  }

  const props = [];
  for (const match of propsBlock.matchAll(/(\w+):\s*\{([^}]+)\}/gu)) {
    const body = match[2];
    const attributeConst = body.match(/attribute:\s*([A-Z0-9_]+)/u)?.[1];
    if (!attributeConst) continue;

    props.push({
      name: match[1],
      attributeConst,
      attribute: attrNameFromConst(publicContractSource, attributeConst),
      type: body.includes('type: "boolean"') ? "boolean" : "string",
      controlled: body.includes("controlled: true"),
      defaultValue: body.match(/defaultValue:\s*"([^"]+)"/u)?.[1],
    });
  }

  return {
    name: nameMatch[1],
    componentName: pascalCase(nameMatch[1]),
    parts,
    props,
  };
}

function extractControllerBehavior(source, componentName) {
  return source
    .replace(/^import[\s\S]*?;\n\n/u, "")
    .replace(/^export type \{[\s\S]*?\} from "[^"]+";\n/gmu, "")
    .replace(/^export \{[\s\S]*?\} from "[^"]+";\n\n?/gmu, "")
    .replaceAll("export interface BambiController", "interface BambiBehavior")
    .replaceAll("implements BambiController", "implements BambiBehavior")
    .replaceAll(`export class ${componentName}Controller`, `class ${componentName}Behavior`)
    .replaceAll(`${componentName}Controller`, `${componentName}Behavior`)
    .replace(/\/\*\*[\s\S]*?\*\//gu, "")
    .replace(/^\s*\/\/.*\n/gmu, "")
    .replace(/\n$/u, "");
}

function parseOptionsNames(controllerSource, optionsTypeName) {
  const match = controllerSource.match(new RegExp(`export interface ${optionsTypeName} \\{([\\s\\S]*?)\\n\\}`, "u"));
  if (!match) throw new Error(`Unable to parse options interface: ${optionsTypeName}`);

  return Array.from(match[1].matchAll(/^\s*(\w+)\??:/gmu), (item) => item[1]);
}

function reactAttributeValue(prop) {
  if (prop.name === "controlled") return "controlled ? \"true\" : undefined";
  if (prop.type === "boolean") return `${prop.name} ? "true" : undefined`;
  return prop.name;
}

function reactAttributeLine(prop) {
  return `      ${prop.attribute}={${reactAttributeValue(prop)}}`;
}

function reactPartPropsSource(contract, options) {
  const valuePropParts = new Set(options.valuePropParts ?? []);
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

function reactPartComponentSource(contract, options) {
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
      const destructured = [
        valueHandling ? valuePropName : undefined,
        disabledHandling ? disabledPropName : undefined,
        "children",
        "...props",
      ].filter(Boolean).join(", ");
      const typeAttr = tag === "button" ? "\n      type={props.type ?? \"button\"}" : "";
      const valueAttribute = valueHandling ? `\n      ${valueAttr}={${valuePropName}}` : "";
      const disabledAttribute = disabledHandling ? `\n      disabled={${disabledPropName}}\n      ${disabledAttr}={${disabledPropName} ? "true" : undefined}` : "";

      return `export function ${componentName}({ ${destructured} }: ${propsName}) {
  return (
    <${tag}
      {...props}${typeAttr}${disabledAttribute}
      ${part.attribute}=""${valueAttribute}
    >
      {children}
    </${tag}>
  );
}`;
    })
    .join("\n\n");
}

function createReactAdapterSource({ contract, behaviorClassName, optionsTypeName, optionsNames, generatorOptions }) {
  const root = contract.parts.find((part) => part.name === "root");
  if (!root) throw new Error(`${contract.name}: missing root part in contract.`);

  const controlledProp = contract.props.find((prop) => prop.controlled);
  const defaultProp = controlledProp
    ? contract.props.find((prop) => prop.name === `default${pascalCase(controlledProp.name)}`)
    : undefined;
  const optionNames = optionsNames.filter((name) => name !== "controlled");
  const callbackOptionNames = optionNames.filter((name) => name.startsWith("on"));
  const propOptionNames = optionNames.filter((name) => !name.startsWith("on"));
  const contractPropsByName = new Map(contract.props.map((prop) => [prop.name, prop]));
  const destructuredOptions = propOptionNames.map((name) => {
    const defaultValue = contractPropsByName.get(name)?.defaultValue;
    return defaultValue === undefined ? name : `${name} = "${defaultValue}"`;
  });
  const destructured = [
    ...destructuredOptions,
    ...callbackOptionNames,
    "children",
    "...props",
  ].join(",\n  ");
  const effectDeps = [...propOptionNames, ...callbackOptionNames, "children"].join(", ");
  const behaviorOptions = [
    ...propOptionNames,
    "controlled",
    ...callbackOptionNames,
  ].map((name) => `      ${name},`).join("\n");
  const rootAttrs = contract.props
    .filter((prop) => prop.name !== "controlled")
    .map(reactAttributeLine)
    .join("\n");
  const controlledAttr = contract.props.find((prop) => prop.name === "controlled");
  const controlledLine = controlledAttr ? `\n      ${controlledAttr.attribute}={controlled ? "true" : undefined}` : "";
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

  return `export interface ${contract.componentName}Props extends ${optionsTypeName}, Omit<React.HTMLAttributes<HTMLDivElement>, keyof ${optionsTypeName}> {
  children?: React.ReactNode;
  className?: string;
}

${reactPartPropsSource(contract, generatorOptions)}

export function ${contract.componentName}({
  ${destructured}
}: ${contract.componentName}Props) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const behaviorRef = React.useRef<${behaviorClassName} | null>(null);
  const controlled = ${controlledExpression};
${controlledWarning}

  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const behavior = new ${behaviorClassName}(root, {
${behaviorOptions}
    });
    behaviorRef.current = behavior;
    behavior.sync();

    return () => {
      behaviorRef.current = null;
      behavior.destroy();
    };
  }, []);

  React.useEffect(() => {
    behaviorRef.current?.update?.({
${behaviorOptions}
    });
  }, [${effectDeps}]);

  return (
    <${root.element}
      {...props}
      ref={rootRef}
      ${root.attribute}=""
${rootAttrs}${controlledLine}
    >
      {children}
    </${root.element}>
  );
}

${reactPartComponentSource(contract, generatorOptions)}`;
}

export function createReactArtifact({ contractSource, controllerSource, contractExportName, generatorOptions = {} }) {
  const publicContract = extractPublicContractSource(contractSource, contractExportName);
  const contract = parseContract(contractSource, publicContract, contractExportName);
  const behaviorClassName = `${contract.componentName}Behavior`;
  const optionsTypeName = `${contract.componentName}Options`;
  const optionsNames = parseOptionsNames(controllerSource, optionsTypeName);

  return `// Generated by scripts/registry-refresh.mjs. Do not edit by hand.
import * as React from "react";
import "./${contract.name}.css";

${publicContract}

${extractControllerBehavior(controllerSource, contract.componentName)}

${createReactAdapterSource({ contract, behaviorClassName, optionsTypeName, optionsNames, generatorOptions })}
`;
}
