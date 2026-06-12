import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { registry, type ComponentName } from "../../registry/registry";
import {
  generateInstallPlan,
  resolveInstallPlan,
  writeInstallFiles,
  type GeneratedFile,
  type InstallPlan,
  type InstallWriterHost,
  type ResolvedInstallFile,
} from "../../generator";
import type { CliFlags } from "../utils/args";
import type { WriteResult } from "../utils/files";
import { getConfig, type CliFramework } from "../utils/framework";
import {
  createRegistryFileIndex,
  getRegistryUrl,
  readRegistryFile,
  readRegistryManifest,
  verifyRegistryFile,
} from "../utils/registry";
import { didYouMean } from "../utils/suggest";

export interface AddComponentResult {
  componentName: ComponentName;
  dryRun: boolean;
  framework: CliFramework;
  results: WriteResult[];
}

export interface AddPlanFile {
  target: string;
  managed: boolean;
}

export interface AddPlanResult {
  componentName: ComponentName;
  components: ComponentName[];
  framework: CliFramework;
  outDir: string;
  styleFile: string;
  files: AddPlanFile[];
}

function isComponentName(value: string): value is ComponentName {
  return value in registry.components;
}

function createNodeWriterHost(
  managedUpdatePaths = new Set<string>(),
  existingBefore = new Set<string>(),
  dryRun = false,
): InstallWriterHost {
  return {
    exists(filePath) {
      const exists = existsSync(filePath);
      if (exists) existingBefore.add(filePath);
      return managedUpdatePaths.has(filePath) ? false : exists;
    },
    async writeFile(filePath, content) {
      if (dryRun) return;
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, content);
    },
  };
}

async function getInstalledComponentNames(
  rootDir: string,
): Promise<ComponentName[]> {
  try {
    const files = await readdir(path.join(rootDir, "components"));
    const installed = new Set(
      files
        .filter((file) => file.endsWith(".ts"))
        .map((file) => path.basename(file, ".ts"))
        .filter(isComponentName),
    );

    return Object.keys(registry.components).filter(
      (name): name is ComponentName => installed.has(name as ComponentName),
    );
  } catch {
    return [];
  }
}

function resolveComponentSelection(
  installed: ComponentName[],
  requested: ComponentName,
): ComponentName[] {
  const selected = new Set<ComponentName>([...installed, requested]);

  return Object.keys(registry.components).filter(
    (name): name is ComponentName => selected.has(name as ComponentName),
  );
}

function getRegistryGeneratedPath(
  generatedRoot: string,
  framework: CliFramework,
  target: string,
): string {
  return path.posix.join(generatedRoot, framework, target);
}

function resolveLocalSourceInstallPlan(
  plan: InstallPlan,
  sourceDir: string,
): ResolvedInstallFile[] {
  const root = path.resolve(sourceDir);

  return resolveInstallPlan(plan, (source) => {
    const filePath = path.resolve(root, source);

    if (!filePath.startsWith(`${root}${path.sep}`)) {
      throw new Error(`Unsafe local source path "${source}".`);
    }

    return readFileSync(filePath, "utf8");
  });
}

async function resolveRemoteInstallPlan(
  plan: InstallPlan,
  framework: CliFramework,
  registryUrl: string,
): Promise<ResolvedInstallFile[]> {
  const manifest = await readRegistryManifest(registryUrl);

  if (!manifest.frameworks.includes(framework)) {
    throw new Error(
      `Registry at ${registryUrl} does not support framework "${framework}".`,
    );
  }

  for (const component of plan.components) {
    if (!manifest.components.includes(component)) {
      throw new Error(
        `Registry at ${registryUrl} does not include component "${component}".`,
      );
    }
  }

  const generatedRoot = manifest.entrypoints.generated;
  const fileIndex = createRegistryFileIndex(manifest);
  const files: ResolvedInstallFile[] = [];

  for (const file of plan.files) {
    if (file.kind === "text") {
      files.push({
        target: file.target,
        content: file.content,
        managed: file.managed,
      });
      continue;
    }

    files.push(
      await resolveRemoteCopyFile(
        file,
        framework,
        registryUrl,
        generatedRoot,
        fileIndex,
      ),
    );
  }

  return files;
}

async function resolveRemoteCopyFile(
  file: Extract<GeneratedFile, { kind: "copy" }>,
  framework: CliFramework,
  registryUrl: string,
  generatedRoot: string,
  fileIndex: ReturnType<typeof createRegistryFileIndex>,
): Promise<ResolvedInstallFile> {
  const registryPath = getRegistryGeneratedPath(
    generatedRoot,
    framework,
    file.target,
  );
  const content = await readRegistryFile(registryUrl, registryPath);

  verifyRegistryFile(registryPath, content, fileIndex.get(registryPath));

  return {
    target: file.target,
    content,
    managed: false,
  };
}

async function ensureCssImport(
  styleFile: string,
  cssFile: string,
  dryRun = false,
): Promise<WriteResult> {
  const relative = path
    .relative(path.dirname(styleFile), cssFile)
    .replaceAll(path.sep, "/");
  const specifier = relative.startsWith(".") ? relative : `./${relative}`;
  const importLine = `@import "${specifier}";`;

  let content = "";
  try {
    content = await readFile(styleFile, "utf8");
  } catch {
    // The generated bundle normally creates the style file. If it does not
    // exist yet, create a tiny import-only file so the user's configured style
    // entry remains valid.
  }

  if (content.includes(importLine)) {
    return {
      path: styleFile,
      reason: "exists",
      skipped: true,
      status: "skipped",
    };
  }

  if (!dryRun) {
    await mkdir(path.dirname(styleFile), { recursive: true });
    await writeFile(styleFile, `${importLine}\n${content}`);
  }

  return {
    path: styleFile,
    skipped: false,
    status: content ? "updated" : "created",
  };
}

function assertComponentName(componentName: string | undefined): ComponentName {
  if (!componentName) {
    throw new Error("Missing component name. Example: bambi add tabs");
  }

  if (!isComponentName(componentName)) {
    const availableComponents = Object.keys(registry.components);
    const available = availableComponents.join(", ");
    throw new Error(
      `Unknown component "${componentName}".${didYouMean(componentName, availableComponents)} Available: ${available}`,
    );
  }

  return componentName;
}

export async function createAddPlan(
  componentName: string | undefined,
  flags: CliFlags,
): Promise<AddPlanResult> {
  const requested = assertComponentName(componentName);
  const cwd = path.resolve(flags.cwd);
  const config = await getConfig(cwd, flags);
  const rootDir = path.join(cwd, config.outDir);
  const installedComponents = await getInstalledComponentNames(rootDir);
  const components = resolveComponentSelection(installedComponents, requested);
  const plan = generateInstallPlan({
    components,
    framework: config.framework,
  });
  const files = plan.files.map((file) => ({
    target: path.posix.join(config.outDir, file.target),
    managed: file.kind === "text" ? Boolean(file.managed) : false,
  }));

  return {
    componentName: requested,
    components,
    framework: config.framework,
    outDir: config.outDir,
    styleFile: config.styleFile,
    files,
  };
}

export async function addComponent(
  componentName: string | undefined,
  flags: CliFlags,
): Promise<AddComponentResult> {
  const requested = assertComponentName(componentName);
  const cwd = path.resolve(flags.cwd);
  const config = await getConfig(cwd, flags);
  const rootDir = path.join(cwd, config.outDir);
  const installedComponents = await getInstalledComponentNames(rootDir);
  const components = resolveComponentSelection(installedComponents, requested);
  const plan = generateInstallPlan({
    components,
    framework: config.framework,
  });
  const files = flags.localSourceDir
    ? resolveLocalSourceInstallPlan(plan, flags.localSourceDir)
    : await resolveRemoteInstallPlan(
        plan,
        config.framework,
        getRegistryUrl(flags),
      );

  const managedUpdatePaths = new Set(
    files
      .filter((file) => file.managed)
      .map((file) => path.join(rootDir, file.target)),
  );
  const existingBefore = new Set<string>();
  const result = await writeInstallFiles(
    files,
    createNodeWriterHost(managedUpdatePaths, existingBefore, flags.dryRun),
    {
      rootDir,
      overwrite: flags.force,
    },
  );

  const results: WriteResult[] = result.operations.map((operation) => {
    const skipped = operation.action === "skip";
    const status: WriteResult["status"] =
      operation.action === "create"
        ? existingBefore.has(operation.path)
          ? "updated"
          : "created"
        : operation.action === "overwrite"
          ? "updated"
          : "skipped";

    return {
      path: operation.path,
      reason: skipped ? "exists" : undefined,
      skipped,
      status,
    };
  });

  const generatedStyleFile = path.join(rootDir, "styles/index.css");
  const configuredStyleFile = path.join(cwd, config.styleFile);

  if (path.resolve(configuredStyleFile) !== path.resolve(generatedStyleFile)) {
    results.push(
      await ensureCssImport(
        configuredStyleFile,
        generatedStyleFile,
        flags.dryRun,
      ),
    );
  }

  return {
    componentName: requested,
    dryRun: flags.dryRun,
    framework: config.framework,
    results,
  };
}

export function getImportHint(
  outDir: string,
  framework: CliFramework,
  componentName: ComponentName,
): string {
  const component = registry.components[componentName];
  const frameworkArtifacts = registry.frameworks[framework];

  return (
    frameworkArtifacts?.getImportHint?.({
      componentName,
      component,
      outDir,
    }) ?? `import { autoInit } from "./${outDir}/auto-init";`
  );
}
