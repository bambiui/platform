import { Project, SyntaxKind } from "ts-morph";

// ── Core utilities ─────────────────────────────────────────────────────────

export function pascalCase(value) {
  return value
    .split(/[-_]/u)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join("");
}

function makeProject() {
  return new Project({ useInMemoryFileSystem: true, skipAddingFilesFromTsConfig: true });
}

function unwrapAs(node) {
  return node && node.getKind() === SyntaxKind.AsExpression ? node.getExpression() : node;
}

function stringLiteralValue(node) {
  if (!node) return undefined;
  const kind = node.getKind();
  if (kind === SyntaxKind.StringLiteral) return node.getLiteralValue();
  if (kind === SyntaxKind.AsExpression) return stringLiteralValue(node.getExpression());
  return undefined;
}

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

function resolveAttrNode(node, constMap) {
  if (!node) return { attribute: undefined, attributeConst: "" };
  if (node.getKind() === SyntaxKind.Identifier) {
    const name = node.getText();
    return { attribute: constMap.get(name), attributeConst: name };
  }
  return { attribute: stringLiteralValue(node), attributeConst: "" };
}

// ── Contract parsing ───────────────────────────────────────────────────────

export function parseContractSource(source, contractExportName) {
  const sf = makeProject().createSourceFile("contract.ts", source);
  const constMap = buildConstMap(sf);

  const statements = sf.getStatements();

  const contractIdx = statements.findIndex((s) => {
    if (s.getKind() !== SyntaxKind.VariableStatement) return false;
    return s.getDeclarationList().getDeclarations().some((d) => d.getName() === contractExportName);
  });
  if (contractIdx === -1) throw new Error(`Unable to find contract: ${contractExportName}`);

  const contractStmt = statements[contractIdx];

  const priorText = source.slice(0, contractStmt.getStart());
  const publicContractSource = priorText
    .replace(/^import[\s\S]*?;\n\n?/u, "")
    .replaceAll(/export const ([A-Z0-9_]+) =/gu, "const $1 =")
    .replace(/\n$/u, "");

  const contractDecl = contractStmt.getDeclarationList().getDeclarations()[0];
  const callExpr = unwrapAs(contractDecl.getInitializer());
  if (callExpr.getKind() !== SyntaxKind.CallExpression) {
    throw new Error(`${contractExportName}: expected CallExpression, got ${callExpr.getKindName()}`);
  }

  const arg = unwrapAs(callExpr.getArguments()[0]);
  if (arg.getKind() !== SyntaxKind.ObjectLiteralExpression) {
    throw new Error(`${contractExportName}: expected an ObjectLiteralExpression as the defineContract argument`);
  }

  const nameProp = arg.getProperty("name");
  if (!nameProp || nameProp.getKind() !== SyntaxKind.PropertyAssignment) {
    throw new Error(`${contractExportName}: missing or invalid 'name' property`);
  }
  const nameStr = stringLiteralValue(nameProp.getInitializer());
  if (!nameStr) throw new Error(`${contractExportName}: 'name' must be a string literal`);

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

    const typePropNode = propObj.getProperty("type");
    const type =
      typePropNode &&
      typePropNode.getKind() === SyntaxKind.PropertyAssignment &&
      stringLiteralValue(typePropNode.getInitializer()) === "boolean"
        ? "boolean"
        : "string";

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

  const eventsProp = arg.getProperty("events");
  const events = [];
  if (eventsProp && eventsProp.getKind() === SyntaxKind.PropertyAssignment) {
    const eventsObj = unwrapAs(eventsProp.getInitializer());
    if (eventsObj.getKind() === SyntaxKind.ObjectLiteralExpression) {
      for (const ep of eventsObj.getProperties()) {
        if (ep.getKind() !== SyntaxKind.PropertyAssignment) continue;
        const key = ep.getName();
        const evObj = unwrapAs(ep.getInitializer());
        if (evObj.getKind() !== SyntaxKind.ObjectLiteralExpression) continue;
        const namePropNode = evObj.getProperty("name");
        if (!namePropNode || namePropNode.getKind() !== SyntaxKind.PropertyAssignment) continue;
        const { attribute: eventConstValue, attributeConst: eventConstName } = resolveAttrNode(namePropNode.getInitializer(), constMap);
        if (!eventConstValue) continue;
        const callbackName = `on${pascalCase(key)}`;
        events.push({ key, callbackName, eventConstName, eventConstValue });
      }
    }
  }

  return {
    publicContractSource,
    contract: { name: nameStr, componentName: pascalCase(nameStr), parts, props, events },
  };
}

// ── Options interface parsing ──────────────────────────────────────────────

export function parseOptionsNames(source, optionsTypeName) {
  const sf = makeProject().createSourceFile("controller.ts", source);
  const iface = sf.getInterface(optionsTypeName);
  if (!iface) throw new Error(`Unable to parse options interface: ${optionsTypeName}`);
  return iface
    .getMembers()
    .filter((m) => m.getKind() === SyntaxKind.PropertySignature)
    .map((m) => m.getName());
}

// ── Generator option validation ───────────────────────────────────────────

export function validateGeneratorOptions(contract, options = {}) {
  const propNames = new Set(contract.props.map((prop) => prop.name));
  const partNames = new Set(contract.parts.map((part) => part.name));

  for (const [partsField, propField] of [
    ["valuePropParts", "valuePropName"],
    ["disabledPropParts", "disabledPropName"],
  ]) {
    if (options[partsField] !== undefined && options[propField] === undefined) {
      throw new Error(`${contract.name}: generator option ${partsField} requires ${propField}.`);
    }
  }

  for (const field of ["valuePropName", "disabledPropName"]) {
    const propName = options[field];
    if (propName !== undefined && !propNames.has(propName)) {
      throw new Error(`${contract.name}: generator option ${field} references unknown prop "${propName}".`);
    }
  }

  for (const field of ["valuePropParts", "disabledPropParts"]) {
    for (const partName of options[field] ?? []) {
      if (!partNames.has(partName)) {
        throw new Error(`${contract.name}: generator option ${field} references unknown part "${partName}".`);
      }
    }
  }

  if (options.polymorphicRootPropName !== undefined && typeof options.polymorphicRootPropName !== "string") {
    throw new Error(`${contract.name}: generator option polymorphicRootPropName must be a string.`);
  }
  if (options.defaultTypeParts !== undefined && options.defaultTypeValue === undefined) {
    throw new Error(`${contract.name}: generator option defaultTypeParts requires defaultTypeValue.`);
  }
  for (const partName of options.defaultTypeParts ?? []) {
    if (!partNames.has(partName)) {
      throw new Error(`${contract.name}: generator option defaultTypeParts references unknown part "${partName}".`);
    }
  }

  const ssrState = options.ssrSelectedState;
  if (ssrState !== undefined) {
    for (const propName of ssrState.selectedPropNames ?? []) {
      if (!propNames.has(propName)) {
        throw new Error(`${contract.name}: generator option ssrSelectedState.selectedPropNames references unknown prop "${propName}".`);
      }
    }
    if (!propNames.has(ssrState.valuePropName)) {
      throw new Error(`${contract.name}: generator option ssrSelectedState.valuePropName references unknown prop "${ssrState.valuePropName}".`);
    }
    for (const partName of Object.keys(ssrState.parts ?? {})) {
      if (!partNames.has(partName)) {
        throw new Error(`${contract.name}: generator option ssrSelectedState.parts references unknown part "${partName}".`);
      }
    }
  }
}

// ── Primitive inlining ────────────────────────────────────────────────────

export function inlinePrimitiveSource(source) {
  const sf = makeProject().createSourceFile("primitive.ts", source);
  [...sf.getImportDeclarations()].reverse().forEach((n) => n.remove());
  for (const iface of sf.getInterfaces()) iface.setIsExported(false);
  for (const fn of sf.getFunctions()) fn.setIsExported(false);
  for (const ta of sf.getTypeAliases()) ta.setIsExported(false);
  for (const cls of sf.getClasses()) cls.setIsExported(false);
  for (const vs of sf.getVariableStatements()) vs.setIsExported(false);
  return sf
    .getFullText()
    .replace(/\/\*\*[\s\S]*?\*\//gu, "")
    .replace(/^\s*\/\/.*\n/gmu, "")
    .trim();
}

// ── Controller behavior extraction ────────────────────────────────────────

const SHARED_HELPERS = ["getAttr", "setAttr", "getBoolAttr"];

export function extractControllerBehavior(source, componentName) {
  const sf = makeProject().createSourceFile("controller.ts", source);
  const usedHelpers = [];

  [...sf.getImportDeclarations()].reverse().forEach((n) => n.remove());
  [...sf.getExportDeclarations()].reverse().forEach((n) => n.remove());

  if (sf.getInterface("BambiController")) {
    sf.getInterface("BambiController").remove();
    usedHelpers.push("BambiBehavior");
  }

  for (const name of SHARED_HELPERS) {
    const fn = sf.getFunction(name);
    if (fn) {
      fn.remove();
      usedHelpers.push(name);
    }
  }

  const behaviorSource = sf
    .getFullText()
    .replaceAll("implements BambiController", "implements BambiBehavior")
    .replaceAll(`export class ${componentName}Controller`, `class ${componentName}Behavior`)
    .replaceAll(`${componentName}Controller`, `${componentName}Behavior`)
    .replace(/\/\*\*[\s\S]*?\*\//gu, "")
    .replace(/^\s*\/\/.*\n/gmu, "")
    .replace(/\n$/u, "");

  return { behaviorSource, usedHelpers };
}
