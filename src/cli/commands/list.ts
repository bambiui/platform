import { registry } from "../../registry/registry";
import { frameworkOptions } from "../utils/framework";

export interface ListOptions {
  json?: boolean;
}

export function listComponents(options: ListOptions = {}): string {
  const components = Object.values(registry.components)
    .map((component) => ({
      name: component.name,
      parts: component.parsed.parts.map((part) => part.name),
      props: component.parsed.props.map((prop) => prop.name),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
  const frameworks = [...frameworkOptions];

  if (options.json) {
    return `${JSON.stringify({ components, frameworks }, null, 2)}\n`;
  }

  const componentLines = components
    .map((component) => `  ${component.name}`)
    .join("\n");
  const frameworkLines = frameworks
    .map((framework) => `  ${framework}`)
    .join("\n");

  return `Available components:\n${componentLines}\n\nSupported frameworks:\n${frameworkLines}\n`;
}
