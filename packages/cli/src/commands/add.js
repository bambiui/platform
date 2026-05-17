import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { getConfig, assertSupportedFramework } from "../utils/framework.js";
import {
  copyRegistryFile,
  getRegistryComponent,
  getRegistryUrl,
  getStylePath,
  readRegistryManifest,
} from "../utils/registry.js";

/**
 * @param {string} styleFile
 * @param {string} cssFile
 */
async function ensureCssImport(styleFile, cssFile) {
  const relative = path
    .relative(path.dirname(styleFile), cssFile)
    .replaceAll(path.sep, "/");
  const specifier = relative.startsWith(".") ? relative : `./${relative}`;
  const importLine = `@import "${specifier}";`;
  const content = await readFile(styleFile, "utf8");

  if (content.includes(importLine)) {
    return {
      path: styleFile,
      reason: "exists",
      skipped: true,
      status: "skipped",
    };
  }

  await mkdir(path.dirname(styleFile), { recursive: true });
  await writeFile(styleFile, `${importLine}\n${content}`);

  return {
    path: styleFile,
    skipped: false,
    status: "updated",
  };
}

/**
 * @param {string} styleFile
 */
async function readExistingCssImports(styleFile) {
  try {
    const content = await readFile(styleFile, "utf8");
    return content.match(/^@import\s+"[^"]+\.css";\n?/gm) ?? [];
  } catch {
    return [];
  }
}

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
  const component = /** @type {{ name: string, css?: string, cssHash?: string, files: Record<string, string[]>, helpers?: Record<string, string[]>, hashes?: Record<string, Record<string, string>>, exports?: Record<string, string[]> }} */ (
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
  const styleFile = path.join(cwd, config.styleFile);
  const existingCssImports = await readExistingCssImports(styleFile);

  // Keep `add` usable even when `init` has not been run yet: global design
  // tokens and component CSS are both anchored from config.styleFile.
  results.push(
    await copyRegistryFile(
      registryUrl,
      getStylePath(manifest),
      styleFile,
      force,
      {
        expectedHash: manifest.styles?.globalHash,
        transform: (content) => {
          const preserved = existingCssImports.filter((line) => !content.includes(line.trim()));
          return preserved.length > 0 ? `${preserved.join("")}${content}` : content;
        },
      },
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

  if (component.css) {
    const cssDestination = path.join(path.dirname(styleFile), path.basename(component.css));
    results.push(
      await copyRegistryFile(
        registryUrl,
        component.css,
        cssDestination,
        force,
        { expectedHash: component.cssHash },
      ),
    );

    results.push(
      await ensureCssImport(styleFile, cssDestination),
    );
  }

  const sharedSrc = manifest.shared;
  const needsHelper = (component.helpers?.[framework] ?? []).length > 0;
  if (sharedSrc && needsHelper) {
    results.push(
      await copyRegistryFile(
        registryUrl,
        sharedSrc,
        path.join(cwd, componentDir, "bambi-helpers.ts"),
        force,
        { expectedHash: manifest.sharedHash },
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
