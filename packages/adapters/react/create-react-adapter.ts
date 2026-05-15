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
  activationMode?: "automatic" | "manual";
  controlled?: boolean;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
  controllerOptions?: Partial<TOptions>;
  [key: string]: unknown;
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
  return undefined;
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
  const propEntries = Object.entries(contract.props ?? {});
  const propAttributes = new Map(
    propEntries
      .map(([prop, definition]) => [prop, propAttribute(prop, definition)] as const)
      .filter((entry): entry is readonly [string, string] => Boolean(entry[1])),
  );
  const valueAttribute = propAttributes.get("value");
  const disabledAttribute = propAttributes.get("disabled");
  const eventEntries = Object.entries(contract.events ?? {});
  const eventCallbacks = eventEntries.map(([eventKey, eventDefinition]) => {
    const eventName =
      eventDefinition && typeof eventDefinition === "object" && "name" in eventDefinition
        ? eventDefinition.name
        : undefined;
    const callbackProp = `on${eventKey[0].toUpperCase()}${eventKey.slice(1)}`;
    return { eventName, callbackProp };
  });

  const Root = forwardRef<RootElement, BambiRootProps<TOptions>>(function BambiRoot(
    {
      children,
      value,
      defaultValue,
      orientation = "horizontal",
      activationMode,
      controlled,
      disabled,
      controllerOptions,
      ...props
    },
    forwardedRef,
  ) {
    const rootRef = useMemo(() => ({ current: null as RootElement | null }), []);
    const isControlled = controlled ?? value !== undefined;
    const propValues = useMemo(() => {
      const values: Record<string, unknown> = {
        value,
        defaultValue,
        orientation,
        activationMode,
        controlled: isControlled,
        disabled,
      };

      for (const [prop] of propEntries) {
        if (prop in props) values[prop] = props[prop];
      }

      return values;
    }, [props, value, defaultValue, orientation, activationMode, isControlled, disabled]);

    const domProps = useMemo(() => {
      const next = { ...props };
      for (const { callbackProp } of eventCallbacks) delete next[callbackProp];
      for (const [prop] of propEntries) delete next[prop];
      return next;
    }, [props]);

    const controllerState = useMemo(
      () => ({ ...(controllerOptions ?? {}), ...propValues }) as TOptions,
      [controllerOptions, propValues],
    );

    useBambiController(rootRef, options.controller, controllerState);

    useEffect(() => {
      const root = rootRef.current;
      if (!root || eventCallbacks.length === 0) return;

      const cleanups: Array<() => void> = [];

      for (const { eventName, callbackProp } of eventCallbacks) {
        const callback = props[callbackProp];
        if (!eventName || typeof callback !== "function") continue;
        const eventListener = (event: Event) => {
          const detail = (event as CustomEvent<{ value?: string }>).detail;
          if (typeof detail?.value === "string") callback(detail.value);
        };
        root.addEventListener(eventName, eventListener);
        cleanups.push(() => root.removeEventListener(eventName, eventListener));
      }

      return () => {
        for (const cleanup of cleanups) cleanup();
      };
    }, [props, rootRef]);

    const rootAttributes: Record<string, string | undefined> = {
      [rootPart.attribute]: "",
    };

    for (const [prop, attribute] of propAttributes) {
      rootAttributes[attribute] = toAttributeValue(propValues[prop]);
    }

    return createElement(
      rootPart.element ?? "div",
      {
        ...rootAttributes,
        ...domProps,
        ref: (node: RootElement | null) => {
          rootRef.current = node;
          assignRef(forwardedRef, node);
        },
      },
      children as ReactNode,
    );
  });

  const adapter: Record<string, unknown> = { Root };
  for (const part of restParts) {
    adapter[part.name[0].toUpperCase() + part.name.slice(1)] = createReactPart(part, {
      valueAttribute,
      disabledAttribute,
    });
  }

  return adapter as {
    Root: typeof Root;
    List: ReturnType<typeof createReactPart>;
    Trigger: ReturnType<typeof createReactPart>;
    Content: ReturnType<typeof createReactPart>;
  };
}
