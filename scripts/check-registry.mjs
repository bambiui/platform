import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const registryPath = path.join(repoRoot, "registry.json");
const contractsPath = path.join(repoRoot, "packages/core/src/contracts.ts");
const frameworkOptions = ["react", "svelte", "vue", "astro"];

/**
 * @param {string} filePath
 */
async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    throw new Error(
      `Failed to parse ${path.relative(repoRoot, filePath)}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * @param {string} source
 * @param {string} exportName
 */
function readConstStringArray(source, exportName) {
  const match = source.match(
    new RegExp(
      `export const ${exportName} = \\[(?<body>[\\s\\S]*?)\\] as const;`,
    ),
  );

  if (!match?.groups?.body) {
    throw new Error(`Could not find exported const array "${exportName}".`);
  }

  return [...match.groups.body.matchAll(/"([^"]+)"/g)].map((item) => item[1]);
}

/**
 * @param {string} source
 */
function readExportedNames(source) {
  return new Set(
    [
      ...source.matchAll(
        /export\s+(?:declare\s+)?(?:const|type|interface)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g,
      ),
    ].map((match) => match[1]),
  );
}

/**
 * @param {string} source
 * @param {string} interfaceName
 */
function readInterfaceProps(source, interfaceName) {
  const match = source.match(
    new RegExp(
      `export interface ${interfaceName}[^\\{]*\\{(?<body>[\\s\\S]*?)\\n\\}`,
    ),
  );

  if (!match?.groups?.body) {
    throw new Error(`Could not find exported interface "${interfaceName}".`);
  }

  return [
    ...match.groups.body.matchAll(
      /([A-Za-z_$][A-Za-z0-9_$]*)(\?)?:\s*([^;\n]+);/g,
    ),
  ].map((item) => ({
    name: item[1],
    optional: Boolean(item[2]),
    type: item[3].trim(),
  }));
}

/**
 * @param {string} source
 */
function readRecipeDefaults(source) {
  const match = source.match(
    /defaults:\s*\{(?<body>[\s\S]*?)\}\s*,\s*variants:/,
  );

  if (!match?.groups?.body) {
    return undefined;
  }

  return Object.fromEntries(
    [
      ...match.groups.body.matchAll(
        /([A-Za-z_$][A-Za-z0-9_$]*)\s*:\s*("([^"]+)"|true|false)/g,
      ),
    ].map((item) => [item[1], item[3] ?? item[2] === "true"]),
  );
}

/**
 * @param {unknown} actual
 * @param {unknown} expected
 * @param {string} label
 */
function assertDeepEqual(actual, expected, label) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);

  if (actualJson !== expectedJson) {
    throw new Error(
      `${label} drifted.\nExpected: ${expectedJson}\nActual:   ${actualJson}`,
    );
  }
}

/**
 * @param {unknown} value
 * @param {string} label
 */
function assertPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

/**
 * @param {unknown[]} values
 * @param {string} label
 */
function assertUnique(values, label) {
  const seen = new Set();

  for (const value of values) {
    if (seen.has(value)) {
      throw new Error(`${label} contains a duplicate value: ${String(value)}`);
    }

    seen.add(value);
  }
}

/**
 * @param {string | undefined} file
 * @param {string} label
 */
function assertRegistryPath(file, label) {
  if (!file) {
    throw new Error(`${label} is missing a source path.`);
  }

  const normalized = file.replaceAll("\\", "/");

  if (path.isAbsolute(normalized) || normalized.split("/").includes("..")) {
    throw new Error(
      `${label} must be a relative path inside the repo: ${file}`,
    );
  }

  const absolutePath = path.join(repoRoot, normalized);

  if (!existsSync(absolutePath)) {
    throw new Error(`${label} references a missing file: ${file}`);
  }

  return normalized;
}

/**
 * @param {{ components?: Record<string, unknown>, tokens?: { css?: string } }} registry
 */
function getRegistrySourceFiles(registry) {
  const files = [registry.tokens?.css];

  for (const component of Object.values(registry.components ?? {})) {
    const entry =
      /** @type {{ style?: { from?: string }, shared?: Array<{ from?: string }>, files?: Record<string, Array<{ from?: string }>> }} */ (
        component
      );
    files.push(entry.style?.from);

    for (const file of entry.shared ?? []) {
      files.push(file.from);
    }

    for (const frameworkFiles of Object.values(entry.files ?? {})) {
      for (const file of frameworkFiles) {
        files.push(file.from);
      }
    }
  }

  return files.filter(Boolean);
}

/**
 * @param {{ consts?: Array<{ name: string, values: string[] }>, aliasesFromConsts?: Array<{ name: string, constName: string }>, interfaces?: Array<{ name: string, props: Array<{ name: string, type: string, optional?: boolean }> }>, requiredPicks?: Array<{ name: string, source: string, keys: string[] }> }} types
 */
function getGeneratedTypeExports(types) {
  return new Set([
    ...(types.aliasesFromConsts ?? []).map((item) => item.name),
    ...(types.interfaces ?? []).map((item) => item.name),
    ...(types.requiredPicks ?? []).map((item) => item.name),
  ]);
}

/**
 * @param {{ consts?: Array<{ name: string, values: string[] }>, aliasesFromConsts?: Array<{ name: string, constName: string }>, interfaces?: Array<{ name: string, props: Array<{ name: string, type: string, optional?: boolean }> }>, requiredPicks?: Array<{ name: string, source: string, keys: string[] }> }} types
 * @param {string} componentName
 */
function assertGeneratedTypes(types, componentName) {
  const constNames = new Set((types.consts ?? []).map((item) => item.name));
  const interfaces = new Map(
    (types.interfaces ?? []).map((item) => [item.name, item]),
  );
  const exportedTypes = getGeneratedTypeExports(types);

  assertUnique(
    types.consts?.map((item) => item.name) ?? [],
    `${componentName}.api.types.consts`,
  );
  assertUnique([...exportedTypes], `${componentName}.api.types exports`);

  for (const item of types.consts ?? []) {
    assertUnique(
      item.values,
      `${componentName}.api.types.consts.${item.name}.values`,
    );

    if (item.values.length === 0) {
      throw new Error(
        `${componentName}.api.types.consts.${item.name} must not be empty.`,
      );
    }
  }

  for (const item of types.aliasesFromConsts ?? []) {
    if (!constNames.has(item.constName)) {
      throw new Error(
        `${componentName}.api.types.aliasesFromConsts.${item.name} references unknown const "${item.constName}".`,
      );
    }
  }

  for (const item of types.interfaces ?? []) {
    assertUnique(
      item.props.map((prop) => prop.name),
      `${componentName}.api.types.interfaces.${item.name}.props`,
    );
  }

  for (const item of types.requiredPicks ?? []) {
    const source = interfaces.get(item.source);

    if (!source) {
      throw new Error(
        `${componentName}.api.types.requiredPicks.${item.name} references unknown interface "${item.source}".`,
      );
    }

    const props = new Set(source.props.map((prop) => prop.name));

    for (const key of item.keys) {
      if (!props.has(key)) {
        throw new Error(
          `${componentName}.api.types.requiredPicks.${item.name} references unknown key "${key}".`,
        );
      }
    }
  }
}

/**
 * @param {Record<string, unknown>} defaults
 * @param {{ consts?: Array<{ name: string, values: string[] }>, aliasesFromConsts?: Array<{ name: string, constName: string }>, interfaces?: Array<{ name: string, props: Array<{ name: string, type: string, optional?: boolean }> }>, requiredPicks?: Array<{ name: string, source: string, keys: string[] }> }} types
 * @param {string} componentName
 */
function assertDefaultsMatchMetadata(defaults, types, componentName) {
  const [requiredPick] = types.requiredPicks ?? [];

  if (!requiredPick) {
    return;
  }

  assertDeepEqual(
    Object.keys(defaults).sort(),
    [...requiredPick.keys].sort(),
    `${componentName} recipe defaults keys`,
  );

  const source = (types.interfaces ?? []).find(
    (item) => item.name === requiredPick.source,
  );
  const aliases = new Map(
    (types.aliasesFromConsts ?? []).map((item) => [item.name, item.constName]),
  );
  const consts = new Map(
    (types.consts ?? []).map((item) => [item.name, item.values]),
  );

  for (const key of requiredPick.keys) {
    const prop = source?.props.find((item) => item.name === key);
    const value = defaults[key];

    if (!prop) {
      continue;
    }

    if (prop.type === "boolean" && typeof value !== "boolean") {
      throw new Error(`${componentName} default "${key}" must be boolean.`);
    }

    const constName = aliases.get(prop.type);
    const values = constName ? consts.get(constName) : undefined;

    if (values && !values.includes(/** @type {string} */ (value))) {
      throw new Error(
        `${componentName} default "${key}" has value "${String(value)}", expected one of ${values.join(", ")}.`,
      );
    }
  }
}

/**
 * @param {string} coreComponent
 * @param {{ interfaces?: Array<{ name: string, props: Array<{ name: string, type: string, optional?: boolean }> }> }} types
 * @param {string} componentName
 */
function assertCoreInterfacesMatchMetadata(
  coreComponent,
  types,
  componentName,
) {
  for (const item of types.interfaces ?? []) {
    const coreProps = readInterfaceProps(coreComponent, item.name);
    const registryProps = item.props.map((prop) => ({
      name: prop.name,
      optional: Boolean(prop.optional),
      type: prop.type,
    }));

    assertDeepEqual(
      registryProps,
      coreProps,
      `${componentName}.api.types.interfaces.${item.name}`,
    );
  }
}

/**
 * @param {string} componentName
 * @param {unknown} component
 * @param {string} contracts
 */
async function assertComponentManifest(componentName, component, contracts) {
  assertPlainObject(component, `components.${componentName}`);

  const entry =
    /** @type {{ exportName?: string, api?: { typeExports?: string[], types?: { consts?: Array<{ name: string, values: string[] }>, aliasesFromConsts?: Array<{ name: string, constName: string }>, interfaces?: Array<{ name: string, props: Array<{ name: string, type: string, optional?: boolean }> }>, requiredPicks?: Array<{ name: string, source: string, keys: string[] }> } }, style?: { from?: string, fileName?: string }, shared?: Array<{ kind?: string, from?: string, to?: string, generate?: string }>, files?: Record<string, Array<{ kind?: string, from?: string, to?: string, generate?: string }>> }} */ (
      component
    );
  const apiTypes = entry.api?.types;

  if (!entry.exportName) {
    throw new Error(`${componentName} is missing exportName.`);
  }

  if (!entry.api?.typeExports) {
    throw new Error(`${componentName} is missing api.typeExports.`);
  }

  assertUnique(entry.api.typeExports, `${componentName}.api.typeExports`);

  const styleFrom = assertRegistryPath(
    entry.style?.from,
    `${componentName}.style.from`,
  );
  const componentSourceRoot = `packages/components/${componentName}/src/`;

  if (!styleFrom.startsWith(componentSourceRoot)) {
    throw new Error(
      `${componentName}.style.from must live under ${componentSourceRoot}.`,
    );
  }

  if (!entry.style?.fileName?.endsWith(".css")) {
    throw new Error(`${componentName}.style.fileName must be a CSS file.`);
  }

  const shared = entry.shared ?? [];
  const generatedTypes = shared.filter((file) => file.generate === "types");

  if (entry.api.typeExports.length > 0 && generatedTypes.length !== 1) {
    throw new Error(
      `${componentName} must have exactly one shared generated types file.`,
    );
  }

  if (generatedTypes.length > 0 && !apiTypes) {
    throw new Error(
      `${componentName} generates types but is missing api.types metadata.`,
    );
  }

  for (const file of shared) {
    if (file.from) {
      const from = assertRegistryPath(
        file.from,
        `${componentName}.shared.${file.to}.from`,
      );

      if (!from.startsWith(componentSourceRoot)) {
        throw new Error(
          `${componentName}.shared.${file.to}.from must live under ${componentSourceRoot}.`,
        );
      }
    }
  }

  for (const framework of frameworkOptions) {
    const files = entry.files?.[framework];

    if (!files?.length) {
      throw new Error(`${componentName} is missing ${framework} files.`);
    }

    for (const file of files) {
      if (file.kind !== framework) {
        throw new Error(
          `${componentName}.${framework}.${file.to} kind must be "${framework}".`,
        );
      }

      const from = assertRegistryPath(
        file.from,
        `${componentName}.${framework}.${file.to}.from`,
      );

      if (!from.startsWith(componentSourceRoot)) {
        throw new Error(
          `${componentName}.${framework}.${file.to}.from must live under ${componentSourceRoot}.`,
        );
      }
    }
  }

  if (apiTypes) {
    assertGeneratedTypes(apiTypes, componentName);

    const generatedTypeExports = getGeneratedTypeExports(apiTypes);

    for (const typeExport of entry.api.typeExports) {
      if (!generatedTypeExports.has(typeExport)) {
        throw new Error(
          `${componentName}.api.typeExports includes "${typeExport}" but api.types does not generate it.`,
        );
      }
    }
  }

  const coreComponentPath = path.join(
    repoRoot,
    `packages/core/src/${componentName}.ts`,
  );

  let coreComponent = "";

  if (existsSync(coreComponentPath)) {
    coreComponent = await readFile(coreComponentPath, "utf8");
    const coreExports = readExportedNames(coreComponent);

    for (const typeExport of entry.api.typeExports) {
      if (!coreExports.has(typeExport)) {
        throw new Error(
          `${componentName}.api.typeExports includes "${typeExport}" but packages/core/src/${componentName}.ts does not export it.`,
        );
      }
    }

    if (apiTypes) {
      assertCoreInterfacesMatchMetadata(coreComponent, apiTypes, componentName);
    }
  }

  if (componentName === "button" && apiTypes) {
    const buttonConsts = Object.fromEntries(
      (apiTypes.consts ?? []).map((item) => [item.name, item.values]),
    );

    assertDeepEqual(
      buttonConsts.buttonIntents,
      readConstStringArray(contracts, "bambiIntents"),
      "buttonIntents",
    );
    assertDeepEqual(
      buttonConsts.buttonAppearances,
      readConstStringArray(contracts, "bambiAppearances"),
      "buttonAppearances",
    );
    assertDeepEqual(
      buttonConsts.buttonSizes,
      readConstStringArray(coreComponent, "buttonSizes"),
      "buttonSizes",
    );
  }

  const recipe = shared.find((file) => file.kind === "recipe" && file.from);

  if (recipe?.from && apiTypes) {
    const recipeSource = await readFile(
      path.join(repoRoot, recipe.from),
      "utf8",
    );
    const defaults = readRecipeDefaults(recipeSource);

    if (defaults) {
      assertDefaultsMatchMetadata(defaults, apiTypes, componentName);
    }
  }
}

const registry = await readJson(registryPath);
const contracts = await readFile(contractsPath, "utf8");
assertPlainObject(registry, "registry");

if (registry.version !== 1) {
  throw new Error(`Unsupported registry version: ${String(registry.version)}`);
}

assertRegistryPath(registry.tokens?.css, "tokens.css");

for (const file of getRegistrySourceFiles(registry)) {
  if (path.isAbsolute(/** @type {string} */ (file))) {
    throw new Error(`Registry source path must be relative: ${file}`);
  }
}

assertPlainObject(registry.components, "components");

for (const [componentName, component] of Object.entries(registry.components)) {
  await assertComponentManifest(componentName, component, contracts);
}

process.stdout.write("Registry checks passed.\n");
