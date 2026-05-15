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
} from "./types";
import { createReactPart } from "./create-react-part";
import { useBambiController, type BambiControllerConstructor } from "./use-bambi-controller";

type RootElement = HTMLElement;
type PartName<TPart> = TPart extends string
  ? TPart
  : TPart extends { name: infer TName extends string }
    ? TName
    : never;
// Converts kebab-case part names to PascalCase component names at the type level.
// e.g. "trigger" → "Trigger", "tab-trigger" → "TabTrigger"
type KebabToPascal<T extends string> = T extends `${infer Head}-${infer Tail}`
  ? `${Capitalize<Head>}${KebabToPascal<Tail>}`
  : Capitalize<T>;
type ComponentName<TName extends string> = KebabToPascal<TName>;
type PartComponentMap<TContract extends BambiComponentContract> = {
  [TName in PartName<TContract["parts"][number]> as TName extends "root"
    ? never
    : ComponentName<TName>]: ReturnType<typeof createReactPart>;
};

/**
 * Props accepted by the generated Root component.
 * Includes all HTML element attributes, all controller option fields (Partial<TOptions>),
 * plus children and controllerOptions. No framework-specific fields are hardcoded here.
 */
export type BambiRootProps<TOptions extends object> = HTMLAttributes<RootElement> &
  Partial<TOptions> & {
    children?: ReactNode;
    controllerOptions?: Partial<TOptions>;
  };

export interface ReactAdapterOptions<TOptions> {
  controller?: BambiControllerConstructor<TOptions>;
}

function toPascalCase(name: string): string {
  return name
    .split("-")
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join("");
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

function propAttribute(_prop: string, definition: unknown): string | undefined {
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

export function createReactAdapter<
  TOptions extends object = Record<string, unknown>,
  TContract extends BambiComponentContract = BambiComponentContract,
>(
  contract: TContract,
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

  // The prop marked `controlled: true` in the contract is the "value" prop whose presence
  // indicates controlled mode (e.g. `value` for Tabs).
  const controlledValuePropName = propEntries.find(
    ([, def]) =>
      def !== null &&
      typeof def === "object" &&
      !Array.isArray(def) &&
      (def as BambiPropDefinition).controlled === true,
  )?.[0];

  // The `controlled` boolean prop in the contract (distinct from the controlled-value prop).
  // Used to override computed controlled mode and to set the data-controlled attribute.
  const controlledBoolPropName = propEntries.find(([name]) => name === "controlled")?.[0];

  const Root = forwardRef<RootElement, BambiRootProps<TOptions>>(function BambiRoot(
    rawProps,
    forwardedRef,
  ) {
    // Cast through unknown: forwardRef's React 19 types widen the props parameter to a union,
    // preventing destructuring of known fields from the intersection type.
    const { children, controllerOptions, ...rest } = rawProps as unknown as {
      children?: ReactNode;
      controllerOptions?: Partial<TOptions>;
    } & Record<string, unknown>;
    const rootRef = useMemo(() => ({ current: null as RootElement | null }), []);

    // Controlled mode: explicit `controlled` prop takes precedence; otherwise inferred from
    // whether the controlled-value prop (e.g. `value`) is provided.
    const isControlled = useMemo(
      () =>
        (rest.controlled as boolean | undefined) ??
        (controlledValuePropName !== undefined
          ? rest[controlledValuePropName] !== undefined
          : false),
      [rest],
    );

    // Build controller state from every prop declared in the contract.
    // The controlled boolean is always set to the computed value, not the raw prop.
    const propValues = useMemo(() => {
      const values: Record<string, unknown> = {};
      for (const [prop] of propEntries) {
        if (prop in rest) values[prop] = rest[prop];
      }
      if (controlledBoolPropName !== undefined) values[controlledBoolPropName] = isControlled;
      return values;
    }, [rest, isControlled]);

    // DOM props: all remaining props after removing contract props and event callbacks.
    const domProps = useMemo(() => {
      const next = { ...rest };
      for (const { callbackProp } of eventCallbacks) delete next[callbackProp];
      for (const [prop] of propEntries) delete next[prop];
      return next as HTMLAttributes<RootElement>;
    }, [rest]);

    const controllerState = useMemo(
      () => ({ ...(controllerOptions ?? {}), ...propValues }) as TOptions,
      [controllerOptions, propValues],
    );

    useBambiController(rootRef, options.controller, controllerState);

    // Forward DOM events to React callback props. The full CustomEvent.detail is passed —
    // the callback receives the same object the controller dispatched, not a subset.
    useEffect(() => {
      const root = rootRef.current;
      if (!root || eventCallbacks.length === 0) return;

      const cleanups: Array<() => void> = [];

      for (const { eventName, callbackProp } of eventCallbacks) {
        const callback = rest[callbackProp];
        if (!eventName || typeof callback !== "function") continue;
        const eventListener = (event: Event) => {
          callback((event as CustomEvent).detail);
        };
        root.addEventListener(eventName, eventListener);
        cleanups.push(() => root.removeEventListener(eventName, eventListener));
      }

      return () => {
        for (const cleanup of cleanups) cleanup();
      };
    }, [rest, rootRef]);

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
    adapter[toPascalCase(part.name)] = createReactPart(part, {
      valueAttribute,
      disabledAttribute,
    });
  }

  return adapter as { Root: typeof Root } & PartComponentMap<TContract>;
}
