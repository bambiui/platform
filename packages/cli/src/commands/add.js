import path from "node:path";
import {
  getConfig,
  getFrameworkSupportFiles,
  getIndexContent,
} from "../utils/framework.js";
import {
  moduleSpecifier,
  transformButtonTypesSource,
  transformComponentSource,
  writeProjectFile,
} from "../utils/files.js";
import {
  copyRegistryFile,
  getRegistryComponent,
  getRegistryUrl,
  readRegistryManifest,
} from "../utils/registry.js";

/**
 * @param {string} framework
 * @param {Record<string, string>} fileNames
 */
function getFrameworkTransform(framework, fileNames) {
  return /** @param {string} content */ (content) =>
    transformComponentSource(content, fileNames);
}

/**
 * @param {unknown} component
 */
function assertRegistryComponent(component) {
  if (!component || typeof component !== "object") {
    throw new Error("Invalid registry component entry.");
  }
}

/**
 * @param {string | undefined} componentName
 * @param {Record<string, string | boolean | undefined>} flags
 */
export async function addComponent(componentName, flags) {
  if (!componentName) {
    throw new Error("Missing component name. Example: bambiui add button");
  }

  const cwd = path.resolve(String(flags.cwd));
  const config = await getConfig(
    cwd,
    /** @type {Record<string, string | undefined>} */ (flags),
  );
  const framework = String(flags.framework ?? config.framework);
  const componentDir = String(flags.componentDir ?? config.componentDir);
  const registryUrl = getRegistryUrl(
    /** @type {Record<string, string | undefined>} */ (flags),
  );
  const manifest = await readRegistryManifest(registryUrl);
  const component = getRegistryComponent(manifest, componentName);
  assertRegistryComponent(component);

  const componentRecord = /** @type {{ exportName?: string, style?: { from: string, fileName: string }, shared?: Array<{ kind: string, from: string, to: string }>, files?: Record<string, Array<{ kind: string, from: string, to: string }>> }} */ (component);
  const frameworkFiles = componentRecord.files?.[framework];

  if (!frameworkFiles) {
    throw new Error(
      `Unknown framework "${framework}". Use react, svelte, vue, or astro.`,
    );
  }

  if (!componentRecord.style) {
    throw new Error(`Component "${componentName}" is missing a style entry.`);
  }

  const targetDir = path.join(cwd, componentDir, componentName);
  const files = [...(componentRecord.shared ?? []), ...frameworkFiles];
  const fileNames = Object.fromEntries(
    files.map((file) => [file.kind, file.to]),
  );
  fileNames.style = componentRecord.style.fileName;
  const exportName = componentRecord.exportName ?? componentName;
  const results = [];

  for (const file of files) {
    const targetName = file.to;
    const transform =
      file.kind === "types"
        ? transformButtonTypesSource
        : file.kind === "recipe"
          ? /** @param {string} content */ (content) =>
              transformComponentSource(content, { types: fileNames.types })
          : file.kind === framework
            ? getFrameworkTransform(framework, fileNames)
            : undefined;

    results.push(
      await copyRegistryFile(
        registryUrl,
        file.from,
        path.join(targetDir, targetName),
        Boolean(flags.force),
        transform,
      ),
    );
  }

  results.push(
    await copyRegistryFile(
      registryUrl,
      componentRecord.style.from,
      path.join(targetDir, fileNames.style),
      Boolean(flags.force),
    ),
  );

  results.push(
    await writeProjectFile(
      path.join(targetDir, "index.ts"),
      getIndexContent(framework, exportName, fileNames),
      Boolean(flags.force),
    ),
  );

  for (const supportFile of getFrameworkSupportFiles(framework)) {
    results.push(
      await writeProjectFile(
        path.join(targetDir, supportFile.fileName),
        supportFile.content,
        Boolean(flags.force),
      ),
    );
  }

  return { config, exportName, framework, results };
}

/**
 * @param {string} componentDir
 * @param {string} exportName
 * @param {string} componentName
 */
export function getImportHint(componentDir, exportName, componentName) {
  const sourceRelativeDir = componentDir.startsWith("src/")
    ? componentDir.slice("src/".length)
    : componentDir;

  return `import { ${exportName} } from "./${path.posix.join(sourceRelativeDir, componentName)}";`;
}
