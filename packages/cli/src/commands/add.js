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

  // Implementation files go into componentDir/<name>/
  const targetDir = path.join(cwd, componentDir, componentName);
  // Style goes alongside the global CSS in the styles directory
  const styleDir = path.join(cwd, path.dirname(config.styleFile));
  // Barrel goes one level above the implementation dir
  const barrelPath = path.join(cwd, componentDir, `${componentName}.ts`);

  const results = [];
  const force = Boolean(flags.force);

  // Copy component style to styles directory
  results.push(
    await copyRegistryFile(
      registryUrl,
      component.style,
      path.join(styleDir, path.basename(component.style)),
      force,
    ),
  );

  // Copy shared files: contract, controller
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

  // Copy framework-specific files; resolve @bambiui/core imports to local siblings
  const flattenImports = (/** @type {string} */ content) =>
    content.replace(
      new RegExp(`from "@bambiui/core/components/${componentName}"`, "g"),
      `from "./${componentName}.controller"`,
    );

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

  // Write barrel file at componentDir level (e.g. src/components/ui/tabs.ts)
  results.push(
    await writeProjectFile(
      barrelPath,
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
