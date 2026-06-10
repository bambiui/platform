import type {
  ComponentContract,
  DefinedComponent,
} from "../core/define-component";
import type { EventDef, PartDef, PropDef } from "../core/shared";

export type ParsedPropType = "boolean" | "string" | "enum";

export interface ParsedProp {
  name: string;
  type: ParsedPropType;
  attr?: string;
  values?: readonly string[];
  defaultValue?: string | boolean;
  controlled?: boolean;
  description?: string;
}

export interface ParsedPart {
  name: string;
  tag: keyof HTMLElementTagNameMap;
  attr: string;
  role?: string;
  selector: string;
  description?: string;
}

export interface ParsedEvent {
  name: string;
  eventName: string;
  callbackName: string;
  detail?: EventDef["detail"];
  description?: string;
}

export interface ParsedComponent {
  name: string;
  componentName: string;
  tag: keyof HTMLElementTagNameMap;
  rootAttr: string;
  props: ParsedProp[];
  parts: ParsedPart[];
  events: ParsedEvent[];
  a11y?: ComponentContract<Record<string, PropDef>>["a11y"];
}

function pascalCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function parseProp(name: string, prop: PropDef): ParsedProp {
  return {
    name,
    type: prop.kind,
    attr: prop.attr,
    values: prop.kind === "enum" ? prop.values : undefined,
    defaultValue: prop.default,
    controlled: prop.controlled,
    description: prop.description,
  };
}

function parsePart(name: string, part: PartDef): ParsedPart {
  return {
    name,
    tag: part.tag,
    attr: part.attr,
    role: part.role,
    selector: `[${part.attr}]`,
    description: part.description,
  };
}

function parseEvent(name: string, event: EventDef): ParsedEvent {
  return {
    name,
    eventName: event.name,
    callbackName: `on${pascalCase(name)}`,
    detail: event.detail,
    description: event.description,
  };
}

export function parseContract<Props extends Record<string, PropDef>>(
  contract: ComponentContract<Props>,
): ParsedComponent {
  return {
    name: contract.name,
    componentName: pascalCase(contract.name),
    tag: contract.tag,
    rootAttr: contract.root,
    props: Object.entries(contract.props).map(([name, prop]) =>
      parseProp(name, prop),
    ),
    parts: Object.entries(contract.parts ?? {}).map(([name, part]) =>
      parsePart(name, part),
    ),
    events: Object.entries(contract.events ?? {}).map(([name, event]) =>
      parseEvent(name, event),
    ),
    a11y: contract.a11y,
  };
}

export function parseComponent<Props extends Record<string, PropDef>>(
  component: DefinedComponent<Props>,
): ParsedComponent {
  return parseContract(component.contract);
}
