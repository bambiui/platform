import {
  createElement,
  forwardRef,
  useEffect,
  useMemo,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import type {
  BambiComponentContract,
  BambiPartDefinition,
  BambiPropDefinition,
} from "@bambiui/core/contract";
import { createReactPart } from "./create-react-part.js";
import { useBambiController, type BambiControllerConstructor } from "./use-bambi-controller.js";

type RootElement = HTMLDivElement;

export interface BambiRootProps<TOptions> extends HTMLAttributes<RootElement> {
  children?: ReactNode;
  value?: string;
  defaultValue?: string;
  orientation?: "horizontal" | "vertical";
  controlled?: boolean;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
  controllerOptions?: Partial<TOptions>;
}

export interface ReactAdapterOptions<TOptions> {
  controller?: BambiControllerConstructor<TOptions>;
}

function normalizePart(part: string | BambiPartDefinition): BambiPartDefinition {
  if (typeof part !== "string") return part;
  return {
    name: part,
    selector: `[data-bambi-${part}]`,
    attribute: `data-bambi-${part}`,
    element: "div",
  };
}

function propAttribute(prop: string, definition: unknown): string | undefined {
  if (definition && typeof definition === "object" && "attribute" in definition) {
    return (definition as BambiPropDefinition).attribute;
  }
  return prop === "value" ? "data-value" : undefined;
}

function toAttributeValue(value: unknown): string | undefined {
  if (value === undefined || value === null || value === false) return undefined;
  if (value === true) return "true";
  return String(value);
}

function assignRef<T>(target: Ref<T> | undefined, value: T | null): void {
  if (!target) return;
  if (typeof target === "function") target(value);
  else target.current = value;
}

export function createReactAdapter<TOptions extends object = Record<string, unknown>>(
  contract: BambiComponentContract,
  options: ReactAdapterOptions<TOptions> = {},
) {
  const parts = contract.parts.map(normalizePart);
  const rootPart = parts.find((part) => part.name === "root") ?? parts[0];
  const restParts = parts.filter((part) => part.name !== "root");

  const Root = forwardRef<RootElement, BambiRootProps<TOptions>>(function BambiRoot(
    {
      children,
      value,
      defaultValue,
      orientation = "horizontal",
      controlled,
      disabled,
      onValueChange,
      controllerOptions,
      ...props
    },
    forwardedRef,
  ) {
    const rootRef = useMemo(() => ({ current: null as RootElement | null }), []);
    const isControlled = controlled ?? value !== undefined;
    const controllerState = useMemo(
      () =>
        ({
          ...controllerOptions,
          value,
          defaultValue,
          controlled: isControlled,
          orientation,
          disabled,
        }) as TOptions,
      [controllerOptions, value, defaultValue, isControlled, orientation, disabled],
    );

    useBambiController(rootRef, options.controller, controllerState);

    useEffect(() => {
      const root = rootRef.current;
      if (!root || !onValueChange) return;

      const eventName =
        typeof contract.events?.valueChange === "object" && "name" in contract.events.valueChange
          ? contract.events.valueChange.name
          : "bambi:value-change";

      const listener = (event: Event) => {
        const detail = (event as CustomEvent<{ value?: string }>).detail;
        if (typeof detail?.value === "string") onValueChange(detail.value);
      };

      root.addEventListener(eventName, listener);
      return () => root.removeEventListener(eventName, listener);
    }, [onValueChange, rootRef]);

    const rootAttributes: Record<string, string | undefined> = {
      [rootPart.attribute]: "",
    };

    for (const [prop, definition] of Object.entries(contract.props ?? {})) {
      const attribute = propAttribute(prop, definition);
      if (!attribute) continue;
      const propValue =
        prop === "value"
          ? value
          : prop === "defaultValue"
            ? defaultValue
            : prop === "orientation"
              ? orientation
              : prop === "controlled"
                ? isControlled
                : prop === "disabled"
                  ? disabled
                  : undefined;
      rootAttributes[attribute] = toAttributeValue(propValue);
    }

    return createElement(
      rootPart.element ?? "div",
      {
        ...rootAttributes,
        ...props,
        ref: (node: RootElement | null) => {
          rootRef.current = node;
          assignRef(forwardedRef, node);
        },
      },
      children,
    );
  });

  const adapter: Record<string, unknown> = { Root };
  for (const part of restParts) {
    adapter[part.name[0].toUpperCase() + part.name.slice(1)] = createReactPart(part);
  }

  return adapter as {
    Root: typeof Root;
    List: ReturnType<typeof createReactPart>;
    Trigger: ReturnType<typeof createReactPart>;
    Content: ReturnType<typeof createReactPart>;
  };
}
