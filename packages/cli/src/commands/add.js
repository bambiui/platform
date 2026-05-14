import path from "node:path";
import { getConfig, getIndexContent, assertSupportedFramework } from "../utils/framework.js";
import { writeProjectFile } from "../utils/files.js";
import {
  copyRegistryFile,
  getRegistryComponent,
  getRegistryUrl,
  readRegistryManifest,
} from "../utils/registry.js";

/**
 * @param {string | undefined} componentName
 * @param {Record<string, string | boolean | undefined>} flags
 */
export async function addComponent(componentName, flags) {
  if (!componentName) {
    throw new Error("Missing component name. Example: bambiui add tabs");
  }

  const cwd = path.resolve(String(flags.cwd));
  const config = await getConfig(
    cwd,
    /** @type {Record<string, string | undefined>} */ (flags),
  );
  const framework = String(flags.framework ?? config.framework);
  assertSupportedFramework(framework);

  const componentDir = String(flags.componentDir ?? config.componentDir);
  const registryUrl = getRegistryUrl(
    /** @type {Record<string, string | undefined>} */ (flags),
  );
  const manifest = await readRegistryManifest(registryUrl);
  const component = /** @type {{ name: string, contract: string, controller: string, style: string, files: Record<string, string[]> }} */ (
    getRegistryComponent(manifest, componentName)
  );

  const frameworkFiles = component.files?.[framework];
  if (!frameworkFiles || frameworkFiles.length === 0) {
    throw new Error(
      `No files found for framework "${framework}" in component "${componentName}".`,
    );
  }

  const targetDir = path.join(cwd, componentDir, componentName);
  const results = [];
  const force = Boolean(flags.force);

  // Copy shared files: contract, controller, style
  results.push(
    await copyRegistryFile(
      registryUrl,
      component.contract,
      path.join(targetDir, path.basename(component.contract)),
      force,
    ),
  );

  results.push(
    await copyRegistryFile(
      registryUrl,
      component.controller,
      path.join(targetDir, path.basename(component.controller)),
      force,
    ),
  );

  results.push(
    await copyRegistryFile(
      registryUrl,
      component.style,
      path.join(targetDir, path.basename(component.style)),
      force,
    ),
  );

  // Copy framework-specific files; flatten subdir imports (../core/ → ./)
  const flattenImports = (/** @type {string} */ content) =>
    content.replace(/from "\.\.\/core\//g, 'from "./');

  for (const filePath of frameworkFiles) {
    results.push(
      await copyRegistryFile(
        registryUrl,
        filePath,
        path.join(targetDir, path.basename(filePath)),
        force,
        flattenImports,
      ),
    );
  }

  // Write generated index.ts
  results.push(
    await writeProjectFile(
      path.join(targetDir, "index.ts"),
      getIndexContent(framework, componentName),
      force,
    ),
  );

  return { config, framework, componentName, results };
}

/**
 * @param {string} componentDir
 * @param {string} componentName
 */
export function getImportHint(componentDir, componentName) {
  const sourceRelativeDir = componentDir.startsWith("src/")
    ? componentDir.slice("src/".length)
    : componentDir;

  return `import { Tabs, TabsList, TabsTrigger, TabsContent } from "./${path.posix.join(sourceRelativeDir, componentName)}";`;
}
