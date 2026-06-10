import {
  registry,
  type ComponentName,
  type FrameworkTarget,
  type RegistryFile,
  type RegistryFileKind,
} from "../registry/registry";
import { transformAuthoringSource } from "./transform-source";

export interface GeneratedCopyFile extends Omit<RegistryFile, "kind"> {
  kind: "copy";
  fileKind?: RegistryFileKind;
  transform?: "authoring-source";
}

export interface GeneratedTextFile {
  kind: "text";
  target: string;
  content: string;
  managed?: boolean;
}

export type GeneratedFile = GeneratedCopyFile | GeneratedTextFile;

export interface ResolvedInstallFile {
  target: string;
  content: string;
  managed?: boolean;
}

export type SourceResolver = (source: string) => string;

export interface GenerateInstallOptions {
  components: ComponentName[];
  framework?: FrameworkTarget;
}

export interface InstallPlan {
  components: ComponentName[];
  files: GeneratedFile[];
}

function uniqueByTarget(files: RegistryFile[]): RegistryFile[] {
  const seen = new Set<string>();
  const result: RegistryFile[] = [];

  for (const file of files) {
    if (seen.has(file.target)) continue;
    seen.add(file.target);
    result.push(file);
  }

  return result;
}

function shouldTransformCopy(file: RegistryFile): boolean {
  return file.source.endsWith(".ts");
}

function copyFiles(files: RegistryFile[]): GeneratedCopyFile[] {
  return uniqueByTarget(files).map(({ kind, ...file }) => ({
    ...file,
    kind: "copy",
    fileKind: kind,
    transform: shouldTransformCopy(file) ? "authoring-source" : undefined,
  }));
}

function createAutoInitSource(componentNames: ComponentName[]): string {
  const imports = componentNames
    .map((name) => `import { ${name} } from "./components/${name}";`)
    .join("\n");
  const list = componentNames.join(", ");

  return `${imports}

type ComponentRoot = Document | DocumentFragment | HTMLElement;

export const components = [${list}] as const;

function getDefaultRoot(): Document | undefined {
  return typeof document === "undefined" ? undefined : document;
}

export function autoInit(root: ComponentRoot | undefined = getDefaultRoot()): void {
  if (!root) return;
  for (const component of components) component.init(root);
}

export function destroyAll(root: ComponentRoot | undefined = getDefaultRoot()): void {
  if (!root) return;
  for (const component of components) component.destroy(root);
}
`;
}

function createStylesIndexSource(componentNames: ComponentName[]): string {
  const imports = [
    '@import "./tokens.css";',
    ...componentNames.map((name) => `@import "./${name}.css";`),
  ];
  return `${imports.join("\n")}\n`;
}

function createFrameworkFiles(
  framework: FrameworkTarget,
  componentNames: ComponentName[],
): GeneratedTextFile[] {
  const artifacts = registry.frameworks[framework];
  if (!artifacts) return [];

  return artifacts
    .generateFiles({
      componentNames,
      components: registry.components,
    })
    .map((file) => ({
      kind: "text",
      target: file.target,
      content: file.content,
      managed: file.managed,
    }));
}

function resolveCopyFile(
  file: GeneratedCopyFile,
  resolveSource: SourceResolver,
): ResolvedInstallFile {
  const content = resolveSource(file.source);

  return {
    target: file.target,
    managed: false,
    content:
      file.transform === "authoring-source"
        ? transformAuthoringSource({
            source: file.source,
            target: file.target,
            content,
          })
        : content,
  };
}

export function resolveInstallPlan(
  plan: InstallPlan,
  resolveSource: SourceResolver,
): ResolvedInstallFile[] {
  return plan.files.map((file) => {
    if (file.kind === "text") {
      return {
        target: file.target,
        content: file.content,
        managed: file.managed,
      };
    }

    return resolveCopyFile(file, resolveSource);
  });
}

export function generateInstallPlan(
  options: GenerateInstallOptions,
): InstallPlan {
  const componentNames = Array.from(new Set(options.components));
  const selected = componentNames.map((name) => registry.components[name]);
  const framework = options.framework ?? "vanilla";

  const copies = copyFiles([
    ...registry.base.files,
    ...selected.flatMap((component) => component.helpers),
    ...selected.flatMap(
      (component) => component.helpersByFramework?.[framework] ?? [],
    ),
    ...selected.flatMap((component) => component.files),
    ...selected.flatMap((component) => component.styles),
  ]);

  const generated: GeneratedTextFile[] = [
    {
      kind: "text",
      target: "auto-init.ts",
      content: createAutoInitSource(componentNames),
      managed: true,
    },
    {
      kind: "text",
      target: "styles/index.css",
      content: createStylesIndexSource(componentNames),
      managed: true,
    },
    ...createFrameworkFiles(framework, componentNames),
  ];

  return {
    components: componentNames,
    files: [...copies, ...generated],
  };
}
