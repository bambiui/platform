import type { ParsedComponent } from "../generator/parse-component";

export type ComponentName = "badge" | "button" | "kbd" | "tabs";

export type FrameworkTarget = "vanilla" | "react" | "solid" | "svelte" | "vue";

export type RegistryFileKind = "component" | "helper" | "style";

export interface RegistryFile {
  source: string;
  target: string;
  kind?: RegistryFileKind;
}

export interface RegistryGeneratedFile {
  target: string;
  content: string;
  managed?: boolean;
}

export interface RegistryFrameworkArtifactContext {
  componentNames: ComponentName[];
  components: Record<ComponentName, RegistryComponent>;
}

export interface RegistryFrameworkImportHintContext {
  componentName: ComponentName;
  component: RegistryComponent;
  outDir: string;
}

export interface RegistryFrameworkArtifacts {
  generateFiles(
    context: RegistryFrameworkArtifactContext,
  ): RegistryGeneratedFile[];
  getImportHint?(context: RegistryFrameworkImportHintContext): string;
}

export type ComponentHelpers = Partial<Record<FrameworkTarget, RegistryFile[]>>;

export interface RegistryComponent {
  name: ComponentName;
  exportName: string;
  parsed: ParsedComponent;
  files: RegistryFile[];
  helpers: RegistryFile[];
  helpersByFramework?: ComponentHelpers;
  styles: RegistryFile[];
  ssr: {
    reactAttrs: boolean;
    requiresStableId?: boolean;
  };
}

export interface BambiRegistry {
  version: 1;
  base: {
    files: RegistryFile[];
  };
  frameworks: Partial<Record<FrameworkTarget, RegistryFrameworkArtifacts>>;
  components: Record<ComponentName, RegistryComponent>;
}
