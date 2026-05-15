import path from "node:path";
import { getConfig, getIndexContent, assertSupportedFramework } from "../utils/framework.js";
import { writeProjectFile } from "../utils/files.js";
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
  const component = /** @type {{ name: string, contract: string, contractFiles?: string[], primitiveFiles?: string[], controller: string, style: string, adapter?: Record<string, string[]>, adapters?: Record<string, { status: "active" | "legacy", mode: "generic" | "frozen" }>, files: Record<string, string[]>, exports?: Record<string, string[]> }} */ (
    getRegistryComponent(manifest, componentName)
  );

  const frameworkFiles = component.files?.[framework];
  if (!frameworkFiles || frameworkFiles.length === 0) {
    throw new Error(
      `No files found for framework "${framework}" in component "${componentName}".`,
    );
  }

  const adapterMetadata = component.adapters?.[framework];
  if (adapterMetadata?.mode === "generic") {
    const adapterFiles = component.adapter?.[framework];
    if (!adapterFiles || adapterFiles.length === 0) {
      throw new Error(
        `Component "${componentName}" declares a generic ${framework} adapter but has no adapter.${framework} files.`,
      );
    }
  }

  // componentDir/<name>/component/  — implementation files + CSS
  const implDir = path.join(cwd, componentDir, componentName, "component");
  // componentDir/<name>/tabs.ts  — single barrel
  const barrelPath = path.join(cwd, componentDir, componentName, `${componentName}.ts`);

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

  const withoutExt = (/** @type {string} */ filePath) =>
    path.basename(filePath).replace(/\.(tsx?|jsx?)$/, "");

  const contractImport = `./${withoutExt(component.contract)}`;
  const controllerImport = `./${withoutExt(component.controller)}`;
  const adapterEntry = (component.adapter?.[framework] ?? []).find((filePath) =>
    withoutExt(filePath) === `create-${framework}-adapter`
  );
  const adapterImport = adapterEntry ? `./${withoutExt(adapterEntry)}` : undefined;

  /** @type {Record<string, string>} */
  const packageImportMap = {
    "@bambiui/core/contract": "./types",
    [`@bambiui/core/components/${componentName}`]: controllerImport,
    [`@bambiui/core/components/${componentName}/${withoutExt(component.contract)}`]: contractImport,
  };
  if (adapterImport) packageImportMap[`@bambiui/adapters/${framework}`] = adapterImport;

  const rewriteBarePackageImports = (/** @type {string} */ content) => {
    let next = content;
    for (const [from, to] of Object.entries(packageImportMap)) {
      const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      next = next
        .replace(new RegExp(`from "${escaped}"`, "g"), `from "${to}"`)
        .replace(new RegExp(`import\\("${escaped}"\\)`, "g"), `import("${to}")`);
    }
    return next;
  };

  const flattenPackageImports = (/** @type {string} */ content) =>
    rewriteBarePackageImports(stripJsExt(content))
      .replace(/from "\.\.?\/(?:\.\.\/)*contract\/define-contract"/g, 'from "./define-contract"')
      .replace(/from "\.\.?\/(?:\.\.\/)*contract\/types"/g, 'from "./types"')
      // Rewrite @bambiui/core/primitives/<name> → ./primitives/<name>
      // This allows controllers to import shared primitives; the CLI copies those
      // files into the primitives/ subdirectory alongside the component files.
      .replace(/from "@bambiui\/core\/primitives\/([^"]+)"/g, 'from "./primitives/$1"')
      .replace(/import\("@bambiui\/core\/primitives\/([^"]+)"\)/g, 'import("./primitives/$1")');

  for (const filePath of component.contractFiles ?? []) {
    results.push(
      await copyRegistryFile(
        registryUrl,
        filePath,
        path.join(implDir, path.basename(filePath)),
        force,
        flattenPackageImports,
      ),
    );
  }

  // Shared files: contract, controller → implementation dir
  results.push(
    await copyRegistryFile(
      registryUrl,
      component.contract,
      path.join(implDir, path.basename(component.contract)),
      force,
      flattenPackageImports,
    ),
  );

  results.push(
    await copyRegistryFile(
      registryUrl,
      component.controller,
      path.join(implDir, path.basename(component.controller)),
      force,
      flattenPackageImports,
    ),
  );

  for (const filePath of component.adapter?.[framework] ?? []) {
    results.push(
      await copyRegistryFile(
        registryUrl,
        filePath,
        path.join(implDir, path.basename(filePath)),
        force,
        flattenPackageImports,
      ),
    );
  }

  // Primitive files → implementation dir/primitives/<basename>
  // Controllers that import from @bambiui/core/primitives/<name> will have those
  // imports rewritten to ./primitives/<name> by flattenPackageImports above.
  for (const filePath of component.primitiveFiles ?? []) {
    results.push(
      await copyRegistryFile(
        registryUrl,
        filePath,
        path.join(implDir, "primitives", path.basename(filePath)),
        force,
        flattenPackageImports,
      ),
    );
  }

  // Framework-specific files → implementation dir; resolve @bambiui/core imports to local siblings
  const flattenImports = (/** @type {string} */ content) =>
    flattenPackageImports(content);

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

  return { config, framework, componentName, results, exports: frameworkExports, adapter: adapterMetadata };
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
