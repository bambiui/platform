import path from "node:path";
import { getConfig, assertSupportedFramework } from "../utils/framework.js";
import {
  copyRegistryFile,
  getRegistryComponent,
  getRegistryUrl,
  getStylePath,
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
  const component = /** @type {{ name: string, files: Record<string, string[]>, helpers?: Record<string, string[]>, hashes?: Record<string, Record<string, string>>, exports?: Record<string, string[]> }} */ (
    getRegistryComponent(manifest, componentName)
  );

  const frameworkFiles = component.files?.[framework];
  if (!frameworkFiles || frameworkFiles.length === 0) {
    throw new Error(
      `No files found for framework "${framework}" in component "${componentName}".`,
    );
  }

  const outputDir = path.join(cwd, componentDir, componentName);

  const results = [];
  const force = Boolean(flags.force);

  // Keep `add` usable even when `init` has not been run yet: component CSS is local to
  // the component, while global design tokens live at config.styleFile.
  results.push(
    await copyRegistryFile(
      registryUrl,
      getStylePath(manifest),
      path.join(cwd, config.styleFile),
      force,
    ),
  );

  for (const filePath of frameworkFiles) {
    results.push(
      await copyRegistryFile(
        registryUrl,
        filePath,
        path.join(outputDir, path.basename(filePath)),
        force,
        { expectedHash: component.hashes?.[framework]?.[filePath] },
      ),
    );
  }

  const sharedSrc = manifest.shared?.[framework];
  const needsHelper = (component.helpers?.[framework] ?? []).length > 0;
  if (sharedSrc && needsHelper) {
    results.push(
      await copyRegistryFile(
        registryUrl,
        sharedSrc,
        path.join(cwd, componentDir, "bambi-helpers.ts"),
        force,
        { expectedHash: manifest.sharedHashes?.[framework] },
      ),
    );
  }

  const frameworkExports = component.exports?.[framework];
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
  return `import { ${names} } from "./${path.posix.join(sourceRelativeDir, componentName)}";`;
}
