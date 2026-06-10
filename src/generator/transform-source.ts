export interface TransformSourceOptions {
  source: string;
  target: string;
  content: string;
}

const sharedSymbolModules: Record<string, string> = {
  A11yMetadata: "a11y",
  boolProp: "props",
  createAbortScope: "lifecycle",
  createId: "ids",
  directionFromKey: "keyboard",
  dispatchBambiEvent: "events",
  enumProp: "props",
  EventDef: "events",
  event: "events",
  focusElement: "focus",
  getAttr: "attributes",
  getBoolAttr: "attributes",
  getEnabledItems: "focus",
  InferProps: "props",
  isActivationKey: "keyboard",
  nextIndex: "keyboard",
  part: "parts",
  PartDef: "parts",
  PropDef: "props",
  safeIdPart: "ids",
  setAttr: "attributes",
  setBoolAttr: "attributes",
  setPresenceAttr: "attributes",
  stringProp: "props",
};

function modulePrefix(target: string): string {
  return target.startsWith("components/") ? "../shared" : ".";
}

function specifierName(specifier: string): string {
  return specifier
    .trim()
    .replace(/^type\s+/, "")
    .split(/\s+as\s+/)[0]
    .trim();
}

function groupSpecifiersBySharedModule(
  specifiers: string[],
): Map<string, string[]> {
  const groups = new Map<string, string[]>();

  for (const specifier of specifiers) {
    const name = specifierName(specifier);
    const module = sharedSymbolModules[name];

    if (!module) {
      throw new Error(`No shared module mapping found for "${name}".`);
    }

    groups.set(module, [...(groups.get(module) ?? []), specifier.trim()]);
  }

  return groups;
}

function rewriteSharedBarrelImport(
  target: string,
  typeOnly: boolean,
  specifierSource: string,
): string {
  const specifiers = specifierSource
    .split(",")
    .map((specifier) => specifier.trim())
    .filter(Boolean);
  const groups = groupSpecifiersBySharedModule(specifiers);
  const prefix = modulePrefix(target);

  return Array.from(groups.entries())
    .map(([module, moduleSpecifiers]) => {
      const importKind = typeOnly ? "import type" : "import";
      return `${importKind} { ${moduleSpecifiers.join(", ")} } from "${prefix}/${module}";`;
    })
    .join("\n");
}

function rewriteNamedImports(content: string, target: string): string {
  return content.replace(
    /^import\s+(type\s+)?\{([^}]+)\}\s+from\s+["'](.+)["'];$/gm,
    (
      statement,
      typeKeyword: string | undefined,
      specifiers: string,
      from: string,
    ) => {
      if (from === "../../shared" || from === "./shared") {
        return rewriteSharedBarrelImport(
          target,
          Boolean(typeKeyword),
          specifiers,
        );
      }

      if (from === "../../define-component") {
        return statement.replace(from, "../shared/define-component");
      }

      return statement;
    },
  );
}

export function transformAuthoringSource(
  options: TransformSourceOptions,
): string {
  return rewriteNamedImports(options.content, options.target);
}
