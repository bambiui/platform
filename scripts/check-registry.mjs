import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registryPath = path.join(repoRoot, "registry.json");
const contractsPath = path.join(repoRoot, "packages/core/src/contracts.ts");

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
    new RegExp(`export const ${exportName} = \\[(?<body>[\\s\\S]*?)\\] as const;`),
  );

  if (!match?.groups?.body) {
    throw new Error(`Could not find exported const array "${exportName}".`);
  }

  return [...match.groups.body.matchAll(/"([^"]+)"/g)].map((item) => item[1]);
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
 * @param {{ components?: Record<string, unknown>, tokens?: { css?: string } }} registry
 */
function assertRegistryFilesExist(registry) {
  const files = [registry.tokens?.css];

  for (const component of Object.values(registry.components ?? {})) {
    if (!component || typeof component !== "object") {
      throw new Error("Invalid component entry in registry.");
    }

    const entry = /** @type {{ style?: { from?: string }, shared?: Array<{ from?: string }>, files?: Record<string, Array<{ from?: string }>> }} */ (component);
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

  for (const file of files.filter(Boolean)) {
    const absolutePath = path.join(repoRoot, /** @type {string} */ (file));

    if (!existsSync(absolutePath)) {
      throw new Error(`Registry references a missing file: ${file}`);
    }
  }
}

const registry = await readJson(registryPath);
const contracts = await readFile(contractsPath, "utf8");
assertRegistryFilesExist(registry);

const button = registry.components?.button;
if (!button || typeof button !== "object") {
  throw new Error('Registry is missing the "button" component.');
}

const buttonApi = /** @type {{ api?: { types?: { consts?: Array<{ name: string, values: string[] }> } } }} */ (button).api;
const buttonConsts = Object.fromEntries(
  (buttonApi?.types?.consts ?? []).map((item) => [item.name, item.values]),
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
  readConstStringArray(contracts, "bambiSizes"),
  "buttonSizes",
);

process.stdout.write("Registry checks passed.\n");
