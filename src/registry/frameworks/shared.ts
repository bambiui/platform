import type {
  ParsedComponent,
  ParsedPart,
  ParsedProp,
} from "../../generator/parse-component";
import type {
  RegistryFrameworkArtifactContext,
  RegistryGeneratedFile,
} from "../types";

export function pascalCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function propTypeSource(prop: ParsedProp): string {
  if (prop.type === "boolean") return "boolean";
  if (prop.type === "string") return "string";
  return (
    prop.values?.map((value) => JSON.stringify(value)).join(" | ") ?? "string"
  );
}

export function propDefaultExpression(prop: ParsedProp): string | undefined {
  if (prop.defaultValue === undefined) return undefined;
  return JSON.stringify(prop.defaultValue);
}

export function rootComponentName(component: ParsedComponent): string {
  return pascalCase(component.name);
}

export function partComponentName(
  component: ParsedComponent,
  part: ParsedPart,
): string {
  return `${rootComponentName(component)}${pascalCase(part.name)}`;
}

export function componentPropInterfaceName(component: ParsedComponent): string {
  return `${rootComponentName(component)}Props`;
}

export function partPropInterfaceName(
  component: ParsedComponent,
  part: ParsedPart,
): string {
  return `${partComponentName(component, part)}Props`;
}

export function dataAttrPropName(attr: string): string {
  return JSON.stringify(attr);
}

export function jsString(value: string): string {
  return JSON.stringify(value);
}

export function componentStyleImport(component: ParsedComponent): string {
  return `../styles/${component.name}.css`;
}

export function componentModuleImport(component: ParsedComponent): string {
  return `../components/${component.name}`;
}

export function componentBehaviorExportName(
  component: ParsedComponent,
): string {
  return component.name;
}

export function componentFileStem(component: ParsedComponent): string {
  return component.name;
}

export function sfcFileStem(component: ParsedComponent): string {
  return rootComponentName(component);
}

export function propLines(component: ParsedComponent): string {
  return component.props
    .map((prop) => `  ${prop.name}?: ${propTypeSource(prop)};`)
    .join("\n");
}

export function propNames(component: ParsedComponent): string[] {
  return component.props.map((prop) => prop.name);
}

export function propDefaultsDestructure(component: ParsedComponent): string {
  return component.props
    .map((prop) => {
      const fallback = propDefaultExpression(prop);
      return fallback === undefined ? prop.name : `${prop.name} = ${fallback}`;
    })
    .join(",\n      ");
}

export function behaviorOptionsObject(component: ParsedComponent): string {
  return propNames(component)
    .map((name) => `        ${name},`)
    .join("\n");
}

export function behaviorUpdateObject(component: ParsedComponent): string {
  return propNames(component)
    .map((name) => `        ${name},`)
    .join("\n");
}

export function selectedParsedComponents(
  context: RegistryFrameworkArtifactContext,
): ParsedComponent[] {
  return context.componentNames.map((name) => context.components[name].parsed);
}

export function generatedComponentFiles(
  context: RegistryFrameworkArtifactContext,
  createFile: (component: ParsedComponent) => RegistryGeneratedFile,
): RegistryGeneratedFile[] {
  return selectedParsedComponents(context).map(createFile);
}

export function reactRootAttributeLines(component: ParsedComponent): string {
  const lines = [`        ${component.rootAttr}=""`];

  for (const prop of component.props) {
    if (!prop.attr) continue;
    if (prop.type === "boolean") {
      lines.push(`        ${prop.attr}={${prop.name} ? "true" : undefined}`);
    } else {
      lines.push(`        ${prop.attr}={${prop.name}}`);
    }
  }

  return lines.join("\n");
}

export function reactRootObjectAttributeLines(
  component: ParsedComponent,
): string {
  const lines = [`    ${dataAttrPropName(component.rootAttr)}: "",`];

  for (const prop of component.props) {
    if (!prop.attr) continue;
    const fallback =
      prop.defaultValue === undefined
        ? `options.${prop.name}`
        : `options.${prop.name} ?? ${JSON.stringify(prop.defaultValue)}`;

    if (prop.type === "boolean") {
      lines.push(
        `    ${dataAttrPropName(prop.attr)}: options.${prop.name} ? "true" : undefined,`,
      );
    } else {
      lines.push(`    ${dataAttrPropName(prop.attr)}: ${fallback},`);
    }
  }

  return lines.join("\n");
}

export function reactPartAttributeLines(part: ParsedPart): string {
  const lines = [`        ${part.attr}=""`];
  if (part.role) lines.push(`        role=${jsString(part.role)}`);
  return lines.join("\n");
}

export function solidRootAttributeLines(component: ParsedComponent): string {
  const lines = [`      ${component.rootAttr}=""`];

  for (const prop of component.props) {
    if (!prop.attr) continue;
    if (prop.type === "boolean") {
      lines.push(`      ${prop.attr}={${prop.name}() ? "true" : undefined}`);
    } else {
      lines.push(`      ${prop.attr}={${prop.name}()}`);
    }
  }

  return lines.join("\n");
}

export function sveltePropInterface(component: ParsedComponent): string {
  const lines = propLines(component);
  return `interface Props {\n${lines ? `${lines}\n` : ""}  children?: import("svelte").Snippet;\n  [key: string]: unknown;\n}`;
}

export function vuePropType(component: ParsedComponent): string {
  const lines = propLines(component);
  return `interface Props {\n${lines}\n}`;
}
