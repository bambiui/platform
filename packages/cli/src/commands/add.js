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
  const component = /** @type {{ name: string, contract: string, controller: string, style: string, files: Record<string, string[]>, exports?: Record<string, string[]> }} */ (
    getRegistryComponent(manifest, componentName)
  );

  const frameworkFiles = component.files?.[framework];
  if (!frameworkFiles || frameworkFiles.length === 0) {
    throw new Error(
      `No files found for framework "${framework}" in component "${componentName}".`,
    );
  }

  // componentDir/<name>/component/  — implementation files + CSS
  const implDir = path.join(cwd, componentDir, componentName, "component");
  // componentDir/<name>/tabs.ts  — single barrel
  const barrelPath = path.join(cwd, componentDir, componentName, `${componentName}.ts`);

  const results = [];
  const force = Boolean(flags.force);

  // Component CSS → implementation dir (alongside other component files)
  results.push(
    await copyRegistryFile(
      registryUrl,
      component.style,
      path.join(implDir, path.basename(component.style)),
      force,
    ),
  );

  // Strips .js extensions from relative imports (ESM TS convention → bundler-friendly)
  const stripJsExt = (/** @type {string} */ content) =>
    content.replace(/from ("\.\.?\/[^"]+)\.js"/g, 'from $1"');

  // Shared files: contract, controller → implementation dir
  results.push(
    await copyRegistryFile(
      registryUrl,
      component.contract,
      path.join(implDir, path.basename(component.contract)),
      force,
      stripJsExt,
    ),
  );

  results.push(
    await copyRegistryFile(
      registryUrl,
      component.controller,
      path.join(implDir, path.basename(component.controller)),
      force,
      stripJsExt,
    ),
  );

  // Framework-specific files → implementation dir; resolve @bambiui/core imports to local siblings
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
        path.join(implDir, path.basename(filePath)),
        force,
        flattenImports,
      ),
    );
  }

  const frameworkExports = component.exports?.[framework];

  // Barrel at componentDir/<name>/<name>.ts
  results.push(
    await writeProjectFile(barrelPath, getIndexContent(framework, componentName, frameworkExports), force),
  );

  return { config, framework, componentName, results, exports: frameworkExports };
}

/**
 * @param {string} componentDir
 * @param {string} componentName
 * @param {string[]} [exports]
 */
export function getImportHint(componentDir, componentName, exports) {
  const sourceRelativeDir = componentDir.startsWith("src/")
    ? componentDir.slice("src/".length)
    : componentDir;

  const names = exports?.join(", ") ?? componentName;
  return `import { ${names} } from "./${path.posix.join(sourceRelativeDir, componentName, componentName)}";`;
}
