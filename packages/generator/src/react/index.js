import { Project, SyntaxKind } from "ts-morph";

// ── Core utilities ─────────────────────────────────────────────────────────

function pascalCase(value) {
  return value
    .split(/[-_]/u)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join("");
}

function makeProject() {
  return new Project({ useInMemoryFileSystem: true, skipAddingFilesFromTsConfig: true });
}

// Unwrap a single `as const` / `as T` layer from an expression node.
function unwrapAs(node) {
  return node && node.getKind() === SyntaxKind.AsExpression ? node.getExpression() : node;
}

// Extract the raw string value from a StringLiteral node, handling an optional
// enclosing AsExpression.
function stringLiteralValue(node) {
  if (!node) return undefined;
  const kind = node.getKind();
  if (kind === SyntaxKind.StringLiteral) return node.getLiteralValue();
  if (kind === SyntaxKind.AsExpression) return stringLiteralValue(node.getExpression());
  return undefined;
}

// Build a name→value map for every top-level `const NAME = "..." as const`
// declaration found in the source file.
function buildConstMap(sf) {
  const map = new Map();
  for (const vs of sf.getVariableStatements()) {
    for (const decl of vs.getDeclarationList().getDeclarations()) {
      const val = stringLiteralValue(decl.getInitializer());
      if (val !== undefined) map.set(decl.getName(), val);
    }
  }
  return map;
}

// Resolve a DOM-attribute node that is either an Identifier (const reference)
// or a StringLiteral.  Returns { attribute, attributeConst }.
function resolveAttrNode(node, constMap) {
  if (!node) return { attribute: undefined, attributeConst: "" };
  if (node.getKind() === SyntaxKind.Identifier) {
    const name = node.getText();
    return { attribute: constMap.get(name), attributeConst: name };
  }
  return { attribute: stringLiteralValue(node), attributeConst: "" };
}

// ── Contract parsing ───────────────────────────────────────────────────────

function parseContractSource(source, contractExportName) {
  const sf = makeProject().createSourceFile("contract.ts", source);
  const constMap = buildConstMap(sf);

  const statements = sf.getStatements();

  // Locate the VariableStatement that exports the contract object.
  const contractIdx = statements.findIndex((s) => {
    if (s.getKind() !== SyntaxKind.VariableStatement) return false;
    return s.getDeclarationList().getDeclarations().some((d) => d.getName() === contractExportName);
  });
  if (contractIdx === -1) throw new Error(`Unable to find contract: ${contractExportName}`);

  const contractStmt = statements[contractIdx];

  // Public contract source: everything before the contract declaration, minus the
  // import block.  Uses the AST start position to avoid splitting on the export
  // name string, which is fragile.
  const priorText = source.slice(0, contractStmt.getStart());
  const publicContractSource = priorText
    .replace(/^import[\s\S]*?;\n\n?/u, "")
    .replaceAll(/export const ([A-Z0-9_]+) =/gu, "const $1 =")
    .replace(/\n$/u, "");

  // ── Parse the defineContract() call ──────────────────────────────────────

  const contractDecl = contractStmt.getDeclarationList().getDeclarations()[0];
  const callExpr = unwrapAs(contractDecl.getInitializer());
  if (callExpr.getKind() !== SyntaxKind.CallExpression) {
    throw new Error(`${contractExportName}: expected CallExpression, got ${callExpr.getKindName()}`);
  }

  const arg = unwrapAs(callExpr.getArguments()[0]);
  if (arg.getKind() !== SyntaxKind.ObjectLiteralExpression) {
    throw new Error(`${contractExportName}: expected an ObjectLiteralExpression as the defineContract argument`);
  }

  // name
  const nameProp = arg.getProperty("name");
  if (!nameProp || nameProp.getKind() !== SyntaxKind.PropertyAssignment) {
    throw new Error(`${contractExportName}: missing or invalid 'name' property`);
  }
  const nameStr = stringLiteralValue(nameProp.getInitializer());
  if (!nameStr) throw new Error(`${contractExportName}: 'name' must be a string literal`);

  // parts
  const partsProp = arg.getProperty("parts");
  if (!partsProp || partsProp.getKind() !== SyntaxKind.PropertyAssignment) {
    throw new Error(`${contractExportName}: missing or invalid 'parts' property`);
  }
  const partsArr = unwrapAs(partsProp.getInitializer());
  if (partsArr.getKind() !== SyntaxKind.ArrayLiteralExpression) {
    throw new Error(`${contractExportName}: 'parts' must be an ArrayLiteralExpression`);
  }

  const parts = [];
  for (const el of partsArr.getElements()) {
    const obj = unwrapAs(el);
    if (obj.getKind() !== SyntaxKind.ObjectLiteralExpression) continue;

    const elNameProp = obj.getProperty("name");
    const elAttrProp = obj.getProperty("attribute");
    const elElemProp = obj.getProperty("element");
    if (
      !elNameProp || elNameProp.getKind() !== SyntaxKind.PropertyAssignment ||
      !elAttrProp || elAttrProp.getKind() !== SyntaxKind.PropertyAssignment ||
      !elElemProp || elElemProp.getKind() !== SyntaxKind.PropertyAssignment
    ) continue;

    const partName = stringLiteralValue(elNameProp.getInitializer());
    const { attribute, attributeConst } = resolveAttrNode(elAttrProp.getInitializer(), constMap);
    const element = stringLiteralValue(elElemProp.getInitializer());
    if (!partName || !attribute || !element) continue;

    parts.push({ name: partName, attributeConst, attribute, element });
  }

  // props
  const propsProp = arg.getProperty("props");
  if (!propsProp || propsProp.getKind() !== SyntaxKind.PropertyAssignment) {
    throw new Error(`${contractExportName}: missing or invalid 'props' property`);
  }
  const propsObj = unwrapAs(propsProp.getInitializer());
  if (propsObj.getKind() !== SyntaxKind.ObjectLiteralExpression) {
    throw new Error(`${contractExportName}: 'props' must be an ObjectLiteralExpression`);
  }

  const props = [];
  for (const pp of propsObj.getProperties()) {
    if (pp.getKind() !== SyntaxKind.PropertyAssignment) continue;

    const propName = pp.getName();
    const propObj = unwrapAs(pp.getInitializer());
    if (propObj.getKind() !== SyntaxKind.ObjectLiteralExpression) continue;

    const attrPropNode = propObj.getProperty("attribute");
    if (!attrPropNode || attrPropNode.getKind() !== SyntaxKind.PropertyAssignment) continue;
    const { attribute, attributeConst } = resolveAttrNode(attrPropNode.getInitializer(), constMap);
    if (!attribute) continue;

    // `type: "boolean"` → boolean; array literal or any other value → string
    const typePropNode = propObj.getProperty("type");
    const type =
      typePropNode &&
      typePropNode.getKind() === SyntaxKind.PropertyAssignment &&
      stringLiteralValue(typePropNode.getInitializer()) === "boolean"
        ? "boolean"
        : "string";

    // `controlled: true` (TrueKeyword only — not a truthy presence check)
    const controlledNode = propObj.getProperty("controlled");
    const controlled =
      !!controlledNode &&
      controlledNode.getKind() === SyntaxKind.PropertyAssignment &&
      controlledNode.getInitializer().getKind() === SyntaxKind.TrueKeyword;

    const defaultValueNode = propObj.getProperty("defaultValue");
    const defaultValue =
      defaultValueNode && defaultValueNode.getKind() === SyntaxKind.PropertyAssignment
        ? stringLiteralValue(defaultValueNode.getInitializer())
        : undefined;

    props.push({ name: propName, attributeConst, attribute, type, controlled, defaultValue });
  }

  return {
    publicContractSource,
    contract: { name: nameStr, componentName: pascalCase(nameStr), parts, props },
  };
}

// ── Options interface parsing ──────────────────────────────────────────────

function parseOptionsNames(source, optionsTypeName) {
  const sf = makeProject().createSourceFile("controller.ts", source);
  const iface = sf.getInterface(optionsTypeName);
  if (!iface) throw new Error(`Unable to parse options interface: ${optionsTypeName}`);
  return iface
    .getMembers()
    .filter((m) => m.getKind() === SyntaxKind.PropertySignature)
    .map((m) => m.getName());
}

// ── Controller behavior extraction ────────────────────────────────────────

function extractControllerBehavior(source, componentName) {
  const sf = makeProject().createSourceFile("controller.ts", source);

  // Remove all import declarations and module re-exports via AST so that format
  // variations (multi-line imports, extra blank lines, etc.) never matter.
  [...sf.getImportDeclarations()].reverse().forEach((n) => n.remove());
  [...sf.getExportDeclarations()].reverse().forEach((n) => n.remove());

  return sf
    .getFullText()
    .replaceAll("export interface BambiController", "interface BambiBehavior")
    .replaceAll("implements BambiController", "implements BambiBehavior")
    .replaceAll(`export class ${componentName}Controller`, `class ${componentName}Behavior`)
    .replaceAll(`${componentName}Controller`, `${componentName}Behavior`)
    .replace(/\/\*\*[\s\S]*?\*\//gu, "")
    .replace(/^\s*\/\/.*\n/gmu, "")
    .replace(/\n$/u, "");
}

// ── React code generation (unchanged from original) ───────────────────────

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

// ── Public API ─────────────────────────────────────────────────────────────

export function createReactArtifact({ contractSource, controllerSource, contractExportName, generatorOptions = {} }) {
  const { publicContractSource, contract } = parseContractSource(contractSource, contractExportName);
  const behaviorClassName = `${contract.componentName}Behavior`;
  const optionsTypeName = `${contract.componentName}Options`;
  const optionsNames = parseOptionsNames(controllerSource, optionsTypeName);

  return `// Generated by scripts/registry-refresh.mjs. Do not edit by hand.
import * as React from "react";
import "./${contract.name}.css";

${publicContractSource}

${extractControllerBehavior(controllerSource, contract.componentName)}

${createReactAdapterSource({ contract, behaviorClassName, optionsTypeName, optionsNames, generatorOptions })}
`;
}
