import {
  createElement,
  forwardRef,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import type { BambiPartDefinition } from "./types";

export interface BambiPartProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
  value?: string;
  disabled?: boolean;
}

function toDataValue(value: unknown): string | undefined {
  if (value === undefined || value === null || value === false) return undefined;
  if (value === true) return "true";
  return String(value);
}

export function createReactPart(part: BambiPartDefinition) {
  const element = (part.element ?? "div") as ElementType;

  return forwardRef<HTMLElement, BambiPartProps>(function BambiPart(
    { value, disabled, ...props },
    ref,
  ) {
    const attributes: Record<string, string | undefined> = {
      [part.attribute]: "",
    };

    if (part.role) attributes.role = part.role;
    if (value !== undefined) attributes["data-value"] = value;
    if (disabled !== undefined) attributes["data-disabled"] = toDataValue(disabled);

    if (part.name === "trigger") attributes.type = element === "button" ? "button" : undefined;

    if (part.name === "content") {
      return createElement("div", {
        ...attributes,
        ...props,
        ref,
        tabIndex: props.tabIndex ?? 0,
      });
    }

    return createElement(element, { ...attributes, ...props, disabled, ref });
  });
}
