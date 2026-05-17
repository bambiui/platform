#!/usr/bin/env node
// Validates the public CLI registry and the internal authoring manifest.

import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv/dist/2020.js";
import { parseContractSource } from "../packages/generator/src/shared.js";
import { KNOWN_FRAMEWORKS, KNOWN_FRAMEWORK_SET } from "./frameworks.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const registryPath = resolve(root, "registry.json");
const authoringPath = resolve(root, "registry.authoring.json");
const registrySchemaPath = resolve(root, "registry.schema.json");
const authoringSchemaPath = resolve(root, "registry.authoring.schema.json");
const corePackagePath = resolve(root, "packages/core/package.json");

let errors = 0;

const PUBLIC_FORBIDDEN_FIELDS = [
  "contract",
  "contractFiles",
  "controller",
  "adapter",
  "adapters",
  "primitiveFiles",
  "style",
];
const FORBIDDEN_STRINGS = [
  "create-react-adapter",
  "create-react-part",
  "define-contract",
  "use-bambi-controller",
  "@bambiui/core",
  "@bambiui/generator",
  "@bambiui/adapters",
];

function fail(msg) {
  console.error(`  x ${msg}`);
  errors++;
}

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}

function readJson(filePath, label) {
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    fail(`${label} is not valid JSON`);
    return undefined;
  }
}

function validateWithSchema(data, schemaPath, label) {
  const schema = readJson(schemaPath, `${label} schema`);
  if (!schema) return undefined;
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(schema);
  if (!validate(data)) {
    for (const err of validate.errors ?? []) {
      fail(`${label} schema: ${err.instancePath || "root"} — ${err.message}`);
    }
  } else {
    ok(`${label}: passes JSON Schema validation`);
  }
  return schema;
}

function checkRegistryPath(filePath, context) {
  if (typeof filePath !== "string" || filePath.length === 0) {
    fail(`${context}: path must be a non-empty string`);
    return false;
  }
  if (filePath.startsWith("/") || filePath.split("/").includes("..")) {
    fail(`${context}: path must be repo-relative and must not contain '..' — ${filePath}`);
    return false;
  }
  return true;
}

function checkFileExists(filePath, context) {
  const abs = resolve(root, filePath);
  if (!existsSync(abs)) {
    fail(`${context}: file not found — ${filePath}`);
    return false;
  }
  return true;
}

function checkPathAndFile(filePath, context) {
  if (!checkRegistryPath(filePath, context)) return false;
  return checkFileExists(filePath, context);
}

function forbiddenStringsFor(componentName) {
  if (!componentName) return FORBIDDEN_STRINGS;
  return [
    ...FORBIDDEN_STRINGS,
    `${componentName}.contract`,
    `${componentName}.controller`,
  ];
}

function checkFileList(files, context, { generatedOnly = false, scanForbidden = false, componentName } = {}) {
  if (!Array.isArray(files) || files.length === 0) {
    fail(`${context} must be a non-empty array`);
    return;
  }

  for (const filePath of files) {
    if (typeof filePath !== "string") {
      fail(`${context} contains non-string entry`);
      continue;
    }
    if (!checkPathAndFile(filePath, context)) continue;

    if (generatedOnly && !filePath.startsWith("packages/registry/generated/")) {
      fail(`${context}: public files must live under packages/registry/generated/ — ${filePath}`);
    }

    if (scanForbidden) {
      const content = readFileSync(resolve(root, filePath), "utf-8");
      for (const forbidden of forbiddenStringsFor(componentName)) {
        if (content.includes(forbidden)) {
          fail(`${context}: generated file contains forbidden string "${forbidden}" — ${filePath}`);
        }
      }
    }
  }
}

function checkGeneratedComponentFilePath(filePath, componentName, framework, context) {
  const expectedPrefix = `packages/registry/generated/${componentName}/${framework}/`;
  if (!filePath.startsWith(expectedPrefix)) {
    fail(`${context}: must live under ${expectedPrefix} — ${filePath}`);
  }
  if (filePath.endsWith(".css")) {
    fail(`${context}: CSS must be declared via component.css/generatedCss, not framework files — ${filePath}`);
  }
  if (basename(filePath) === "bambi-helpers.ts") {
    fail(`${context}: workspace helper shim must not be a public framework file — ${filePath}`);
  }
}

function checkGeneratedCssPath(filePath, componentName, context) {
  const expectedPrefix = `packages/registry/generated/${componentName}/`;
  if (!filePath.startsWith(expectedPrefix)) {
    fail(`${context}: CSS must live under ${expectedPrefix} — ${filePath}`);
  }
  if (!filePath.endsWith(".css")) {
    fail(`${context}: CSS path must end in .css — ${filePath}`);
  }
  for (const framework of KNOWN_FRAMEWORKS) {
    if (filePath.startsWith(`${expectedPrefix}${framework}/`)) {
      fail(`${context}: shared component CSS must not live in a framework subdirectory — ${filePath}`);
    }
  }
}

function checkExports(exports, files, context) {
  if (!exports || typeof exports !== "object") {
    fail(`${context}: missing exports object`);
    return;
  }

  for (const [framework, names] of Object.entries(exports)) {
    if (!KNOWN_FRAMEWORKS.includes(framework)) {
      fail(`${context}: exports has unknown framework "${framework}"`);
      continue;
    }
    if (!Array.isArray(names) || names.length === 0) {
      fail(`${context}: exports.${framework} must be a non-empty array`);
      continue;
    }
    for (const name of names) {
      if (typeof name !== "string" || name.length === 0) {
        fail(`${context}: exports.${framework} contains invalid entry`);
      }
    }
    ok(`${context}: exports.${framework}: ${names.join(", ")}`);
  }

  for (const framework of Object.keys(files ?? {})) {
    if (!(framework in exports)) {
      fail(`${context}: exports missing entry for framework "${framework}"`);
    }
  }
}

function sorted(value) {
  return [...(value ?? [])].sort();
}

function assertSameList(actual, expected, context) {
  const sortedActual = sorted(actual);
  const sortedExpected = sorted(expected);
  if (sortedActual.join("\n") !== sortedExpected.join("\n")) {
    fail(
      `${context}: mismatch\n` +
      `    Expected: ${sortedExpected.join(", ") || "(none)"}\n` +
      `    Actual:   ${sortedActual.join(", ") || "(none)"}`,
    );
  }
}

function checkRequiredFrameworks(record, context) {
  if (!record || typeof record !== "object") {
    fail(`${context}: missing framework map`);
    return;
  }
  for (const framework of KNOWN_FRAMEWORKS) {
    if (!(framework in record)) {
      fail(`${context}: missing framework "${framework}"`);
    }
  }
}

function contractExportName(componentName) {
  return `${componentName.replace(/-([a-z0-9])/gu, (_match, char) => char.toUpperCase())}Contract`;
}

function checkGeneratorOptions(componentName, component, contract) {
  const propNames = new Set(contract.props.map((prop) => prop.name));
  const partNames = new Set(contract.parts.map((part) => part.name));

  for (const [framework, options] of Object.entries(component.generator ?? {})) {
    if (!KNOWN_FRAMEWORK_SET.has(framework) || !options || typeof options !== "object") continue;

    for (const field of ["valuePropName", "disabledPropName"]) {
      if (options[field] !== undefined && !propNames.has(options[field])) {
        fail(`${componentName}: generator.${framework}.${field} references unknown contract prop "${options[field]}"`);
      }
    }

    const propForParts = {
      valuePropParts: "valuePropName",
      disabledPropParts: "disabledPropName",
    };
    for (const [partsField, propField] of Object.entries(propForParts)) {
      if (options[partsField] !== undefined && options[propField] === undefined) {
        fail(`${componentName}: generator.${framework}.${partsField} requires ${propField}`);
      }
      for (const partName of options[partsField] ?? []) {
        if (!partNames.has(partName)) {
          fail(`${componentName}: generator.${framework}.${partsField} references unknown contract part "${partName}"`);
        }
      }
    }
  }
}

function helpersUsedByFiles(files) {
  const used = new Set();
  for (const filePath of files ?? []) {
    const abs = resolve(root, filePath);
    if (!existsSync(abs)) continue;
    const content = readFileSync(abs, "utf-8");
    for (const match of content.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']\.\.\/bambi-helpers["']/gu)) {
      for (const helper of match[1].split(",")) {
        const name = helper.trim().replace(/^type\s+/u, "").split(/\s+as\s+/u)[0]?.trim();
        if (name) used.add(name);
      }
    }
  }
  return [...used].sort();
}

function checkHelpersMatchFiles(componentName, framework, component) {
  const declared = sorted(component.helpers?.[framework]);
  const detected = helpersUsedByFiles(component.files?.[framework]);
  if (declared.join("\n") !== detected.join("\n")) {
    fail(
      `${componentName}: helpers.${framework} must match imports from ../bambi-helpers\n` +
      `    Declared: ${declared.join(", ") || "(none)"}\n` +
      `    Detected: ${detected.join(", ") || "(none)"}`,
    );
  }
}

function checkSchemaFrameworkKeys(schema, label) {
  const componentDef = schema?.$defs?.component;
  const frameworkObjects = [
    ["files", componentDef?.properties?.files],
    ["exports", componentDef?.properties?.exports],
    ["hashes", componentDef?.properties?.hashes],
    ["helpers", componentDef?.properties?.helpers],
    ["generatedFiles", componentDef?.properties?.generatedFiles],
    ["generator", componentDef?.properties?.generator],
  ];

  for (const [field, schemaNode] of frameworkObjects) {
    if (!schemaNode?.properties) continue;
    assertSameList(Object.keys(schemaNode.properties), KNOWN_FRAMEWORKS, `${label}: ${field} framework keys`);
    if (schemaNode.required) {
      assertSameList(schemaNode.required, KNOWN_FRAMEWORKS, `${label}: ${field} required frameworks`);
    }
  }
}

console.log("Checking registry.json...\n");
const registry = readJson(registryPath, "registry.json");
if (!registry) process.exit(1);
const registrySchema = validateWithSchema(registry, registrySchemaPath, "registry.json");
checkSchemaFrameworkKeys(registrySchema, "registry.schema.json");

if (registry.version !== 2) fail(`version must be 2, got ${registry.version}`);
else ok("version: 2");

if (!registry.styles || typeof registry.styles.global !== "string") {
  fail("missing styles.global path");
} else {
  checkPathAndFile(registry.styles.global, "styles.global");
  ok(`styles.global: ${registry.styles.global}`);

  if (registry.styles.globalHash === undefined) {
    fail("styles.globalHash: missing (required for integrity verification)");
  } else if (!/^[a-f0-9]{64}$/.test(registry.styles.globalHash)) {
    fail("styles.globalHash: invalid SHA-256 hex string");
  } else {
    const abs = resolve(root, registry.styles.global);
    if (existsSync(abs)) {
      const actual = createHash("sha256").update(readFileSync(abs, "utf-8")).digest("hex");
      if (actual !== registry.styles.globalHash) {
        fail(`styles.globalHash: hash mismatch for ${registry.styles.global}`);
      } else {
        ok("styles.globalHash: verified");
      }
    }
  }
}

if (registry.shared !== undefined) {
  if (typeof registry.shared !== "string" || registry.shared.length === 0) {
    fail("shared must be a non-empty string when present");
  } else if (checkPathAndFile(registry.shared, "shared")) {
    const content = readFileSync(resolve(root, registry.shared), "utf-8");
    for (const forbidden of FORBIDDEN_STRINGS) {
      if (content.includes(forbidden)) {
        fail(`shared: file contains forbidden string "${forbidden}"`);
      }
    }
    ok(`shared: ${registry.shared}`);
  }
}

if (registry.sharedHash !== undefined) {
  if (!/^[a-f0-9]{64}$/.test(registry.sharedHash)) {
    fail("sharedHash: invalid SHA-256 hex string");
  } else if (!registry.shared) {
    fail("sharedHash: no corresponding shared path");
  } else {
    const abs = resolve(root, registry.shared);
    if (existsSync(abs)) {
      const actual = createHash("sha256").update(readFileSync(abs, "utf-8")).digest("hex");
      if (actual !== registry.sharedHash) {
        fail("sharedHash: hash mismatch");
      } else {
        ok("sharedHash: verified");
      }
    }
  }
}

// Enforce: sharedHash must be present when shared is declared.
if (registry.shared && !registry.sharedHash) {
  fail("sharedHash: missing (required when shared is declared)");
}

if (!registry.components || typeof registry.components !== "object") {
  fail("missing components object");
  process.exit(1);
}

for (const [componentName, component] of Object.entries(registry.components)) {
  console.log(`\nPublic component: ${componentName}`);

  if (component.name !== componentName) fail(`name field "${component.name}" does not match key "${componentName}"`);
  else ok(`name: ${componentName}`);

  for (const field of PUBLIC_FORBIDDEN_FIELDS) {
    if (Object.hasOwn(component, field)) {
      fail(`public registry must not contain internal field "${field}"`);
    }
  }

  if (!component.files || typeof component.files !== "object") {
    fail("missing files object");
    continue;
  }

  for (const [framework, files] of Object.entries(component.files)) {
    if (!KNOWN_FRAMEWORKS.includes(framework)) {
      fail(`unknown framework key "${framework}"`);
      continue;
    }
    checkFileList(files, `files.${framework}`, { generatedOnly: true, scanForbidden: true, componentName });
    for (const filePath of files) {
      checkGeneratedComponentFilePath(filePath, componentName, framework, `files.${framework}`);
    }
    ok(`files.${framework}: ${files.length} generated file(s)`);

    // Enforce: every file must have a hash entry.
    const frameworkHashes = component.hashes?.[framework];
    if (!frameworkHashes || typeof frameworkHashes !== "object") {
      fail(`${componentName}: hashes.${framework}: missing (required for all component files)`);
    } else {
      for (const filePath of files) {
        const hash = frameworkHashes[filePath];
        if (!hash) {
          fail(`${componentName}: hashes.${framework}.${basename(filePath)}: missing hash`);
          continue;
        }
        if (!/^[a-f0-9]{64}$/.test(hash)) {
          fail(`${componentName}: hashes.${framework}.${basename(filePath)}: invalid SHA-256 hex string`);
          continue;
        }
        const abs = resolve(root, filePath);
        if (existsSync(abs)) {
          const actual = createHash("sha256").update(readFileSync(abs, "utf-8")).digest("hex");
          if (actual !== hash) {
            fail(`${componentName}: hashes.${framework}.${basename(filePath)}: hash mismatch`);
          } else {
            ok(`${componentName}: hashes.${framework}.${basename(filePath)}: hash verified`);
          }
        }
      }
    }
  }

  if (component.css !== undefined) {
    if (checkPathAndFile(component.css, `${componentName}.css`)) {
      checkGeneratedCssPath(component.css, componentName, `${componentName}.css`);
      if (!component.css.startsWith("packages/registry/generated/")) {
        fail(`${componentName}.css: must live under packages/registry/generated/ — ${component.css}`);
      }
      const content = readFileSync(resolve(root, component.css), "utf-8");
      for (const forbidden of forbiddenStringsFor(componentName)) {
        if (content.includes(forbidden)) {
          fail(`${componentName}.css: contains forbidden string "${forbidden}"`);
        }
      }
      if (!component.cssHash) {
        fail(`${componentName}: cssHash missing (required when css is declared)`);
      } else if (!/^[a-f0-9]{64}$/.test(component.cssHash)) {
        fail(`${componentName}: cssHash invalid SHA-256 hex string`);
      } else {
        const actual = createHash("sha256").update(content).digest("hex");
        if (actual !== component.cssHash) {
          fail(`${componentName}: cssHash mismatch for ${component.css}`);
        } else {
          ok(`${componentName}: cssHash verified`);
        }
      }
    }
  }

  if (component.helpers !== undefined) {
    if (!component.helpers || typeof component.helpers !== "object") {
      fail(`${componentName}: helpers must be an object when present`);
    } else {
      for (const [framework, names] of Object.entries(component.helpers)) {
        if (!KNOWN_FRAMEWORKS.includes(framework)) {
          fail(`${componentName}: helpers has unknown framework "${framework}"`);
          continue;
        }
        if (!Array.isArray(names) || names.length === 0) {
          fail(`${componentName}: helpers.${framework} must be a non-empty array`);
        }
        ok(`${componentName}: helpers.${framework}: ${names.join(", ")}`);
      }
    }
  }

  for (const framework of Object.keys(component.files ?? {})) {
    if (KNOWN_FRAMEWORK_SET.has(framework)) {
      checkHelpersMatchFiles(componentName, framework, component);
    }
  }

  checkExports(component.exports, component.files, componentName);
}

console.log("\nChecking registry.authoring.json...\n");
const authoring = readJson(authoringPath, "registry.authoring.json");
if (!authoring) process.exit(1);
const authoringSchema = validateWithSchema(authoring, authoringSchemaPath, "registry.authoring.json");
checkSchemaFrameworkKeys(authoringSchema, "registry.authoring.schema.json");
const corePackage = readJson(corePackagePath, "packages/core/package.json");

if (authoring.version !== 1) fail(`authoring version must be 1, got ${authoring.version}`);
else ok("authoring version: 1");

if (!authoring.components || typeof authoring.components !== "object") {
  fail("authoring: missing components object");
  process.exit(1);
}

for (const [componentName, component] of Object.entries(authoring.components)) {
  console.log(`\nAuthoring component: ${componentName}`);

  if (component.name !== componentName) fail(`name field "${component.name}" does not match key "${componentName}"`);
  else ok(`name: ${componentName}`);

  const publicComponent = registry.components?.[componentName];
  if (!publicComponent) {
    fail(`authoring ${componentName}: missing public registry component`);
  }

  for (const field of ["contract", "controller", "style", "generatedCss"]) {
    if (typeof component[field] !== "string") fail(`missing authoring field "${field}"`);
    else checkPathAndFile(component[field], field);
  }
  if (typeof component.generatedCss === "string") {
    checkGeneratedCssPath(component.generatedCss, componentName, "generatedCss");
  }

  let parsedContract;
  if (typeof component.contract === "string" && existsSync(resolve(root, component.contract))) {
    try {
      const contractSource = readFileSync(resolve(root, component.contract), "utf-8");
      parsedContract = parseContractSource(contractSource, contractExportName(componentName)).contract;
      ok(`${componentName}: contract parsed for authoring validation`);
    } catch (error) {
      fail(`${componentName}: unable to parse contract for authoring validation — ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (corePackage?.exports && typeof corePackage.exports === "object") {
    const exportKey = `./components/${componentName}`;
    if (!Object.hasOwn(corePackage.exports, exportKey)) {
      fail(`@bambiui/core exports missing "${exportKey}"`);
    } else {
      ok(`@bambiui/core exports ${exportKey}`);
    }
  }

  if (component.contractFiles !== undefined) {
    checkFileList(component.contractFiles, "contractFiles");
  }
  if (component.primitiveFiles !== undefined) {
    checkFileList(component.primitiveFiles, "primitiveFiles");
  }

  checkRequiredFrameworks(component.generatedFiles, `authoring ${componentName}.generatedFiles`);
  for (const [framework, files] of Object.entries(component.generatedFiles ?? {})) {
    if (!KNOWN_FRAMEWORKS.includes(framework)) fail(`generatedFiles has unknown framework "${framework}"`);
    else {
      checkFileList(files, `generatedFiles.${framework}`, { generatedOnly: true });
      for (const filePath of files) {
        checkGeneratedComponentFilePath(filePath, componentName, framework, `generatedFiles.${framework}`);
      }
    }
  }

  if (component.generator !== undefined) {
    if (!component.generator || typeof component.generator !== "object") {
      fail("generator must be an object when present");
    } else {
      for (const [framework, options] of Object.entries(component.generator)) {
        if (!KNOWN_FRAMEWORKS.includes(framework)) {
          fail(`generator has unknown framework "${framework}"`);
          continue;
        }
        if (!options || typeof options !== "object") {
          fail(`generator.${framework} must be an object`);
          continue;
        }
        for (const field of ["valuePropName", "disabledPropName"]) {
          if (options[field] !== undefined && (typeof options[field] !== "string" || options[field].length === 0)) {
            fail(`generator.${framework}.${field} must be a non-empty string when present`);
          }
        }
        for (const field of ["valuePropParts", "disabledPropParts"]) {
          if (options[field] !== undefined) {
            if (!Array.isArray(options[field])) {
              fail(`generator.${framework}.${field} must be an array when present`);
              continue;
            }
            for (const part of options[field]) {
              if (typeof part !== "string" || part.length === 0) {
                fail(`generator.${framework}.${field} contains invalid part name`);
              }
            }
          }
        }
        ok(`generator.${framework}: configured`);
      }
    }
  }
  if (parsedContract) {
    checkGeneratorOptions(componentName, component, parsedContract);
  }

  checkExports(component.exports, component.generatedFiles, `authoring ${componentName}`);

  if (publicComponent) {
    checkRequiredFrameworks(publicComponent.files, `${componentName}.files`);
    checkRequiredFrameworks(publicComponent.exports, `${componentName}.exports`);
    for (const framework of KNOWN_FRAMEWORKS) {
      assertSameList(
        publicComponent.files?.[framework],
        component.generatedFiles?.[framework],
        `${componentName}/${framework}: public files must match authoring generatedFiles`,
      );
      assertSameList(
        publicComponent.exports?.[framework],
        component.exports?.[framework],
        `${componentName}/${framework}: public exports must match authoring exports`,
      );
    }
  }
}

console.log("");
if (errors > 0) {
  console.error(`Registry check failed with ${errors} error(s).`);
  process.exit(1);
}

console.log("Registry OK.");
