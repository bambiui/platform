import {
  createElement,
  forwardRef,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import type { BambiPartDefinition } from "@bambiui/core/contract";

export interface BambiPartProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
  value?: string;
  disabled?: boolean;
  type?: string;
}

export interface BambiPartOptions {
  valueAttribute?: string;
  disabledAttribute?: string;
}

function toDataValue(value: unknown): string | undefined {
  if (value === undefined || value === null || value === false) return undefined;
  if (value === true) return "true";
  return String(value);
}

export function createReactPart(part: BambiPartDefinition, options: BambiPartOptions = {}) {
  const element = (part.element ?? "div") as ElementType;

  return forwardRef<HTMLElement, BambiPartProps>(function BambiPart(
    { value, disabled, type, ...props },
    ref,
  ) {
    const attributes: Record<string, string | undefined> = {
      [part.attribute]: "",
    };

    if (part.role) attributes.role = part.role;
    if (value !== undefined) attributes[options.valueAttribute ?? "data-value"] = value;
    if (disabled !== undefined) {
      attributes[options.disabledAttribute ?? "data-disabled"] = toDataValue(disabled);
    }
    if (element === "button") attributes.type = String(type ?? "button");

    return createElement(element, { ...attributes, ...props, disabled, ref });
  });
}
