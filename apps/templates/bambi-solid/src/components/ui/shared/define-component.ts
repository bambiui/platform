import type { A11yMetadata } from "./a11y";
import type { EventDef } from "./events";
import type { InferProps, PropDef } from "./props";
import type { PartDef } from "./parts";

export type ComponentRoot = Document | DocumentFragment | HTMLElement;

export interface ComponentContract<Props extends Record<string, PropDef>> {
  name: string;
  tag: keyof HTMLElementTagNameMap;
  root: string;
  props: Props;
  parts?: Record<string, PartDef>;
  events?: Record<string, EventDef>;
  a11y?: A11yMetadata;
}

export type ComponentOptions<Props extends Record<string, PropDef>> =
  InferProps<Props> & Record<string, unknown>;

export type ComponentRuntimeOptions<Props extends Record<string, PropDef>> =
  ComponentOptions<Props> & InferProps<Props>;

export type ComponentElement<Props extends Record<string, PropDef>> =
  HTMLElement & {
    update(options?: Partial<ComponentOptions<Props>>): void;
    destroy(): void;
  };

export interface DefineComponentConfig<Props extends Record<string, PropDef>> {
  name: string;
  tag: keyof HTMLElementTagNameMap;
  root: string;
  props: Props;
  parts?: Record<string, PartDef>;
  events?: Record<string, EventDef>;
  a11y?: A11yMetadata;
  sync(el: HTMLElement, options: ComponentRuntimeOptions<Props>): void;
  destroy?(el: HTMLElement): void;
}

export interface DefinedComponent<Props extends Record<string, PropDef>> {
  init(root?: ComponentRoot): ComponentElement<Props>[];
  mount(
    element: HTMLElement,
    options?: ComponentOptions<Props>,
  ): ComponentElement<Props>;
  destroy(root?: ComponentRoot): void;
  contract: ComponentContract<Props>;
}

function propDefaults<Props extends Record<string, PropDef>>(
  props: Props,
): Partial<InferProps<Props>> {
  const defaults: Record<string, unknown> = {};

  for (const [name, prop] of Object.entries(props)) {
    if (prop.default !== undefined) defaults[name] = prop.default;
  }

  return defaults as Partial<InferProps<Props>>;
}

function readElementOptions<Props extends Record<string, PropDef>>(
  el: HTMLElement,
  props: Props,
): Partial<InferProps<Props>> {
  const options: Record<string, unknown> = {};

  for (const [name, prop] of Object.entries(props)) {
    if (!prop.attr) continue;
    const value = el.getAttribute(prop.attr);
    if (value === null) continue;

    if (prop.kind === "boolean")
      options[name] = value === "true" || value === "";
    else options[name] = value;
  }

  return options as Partial<InferProps<Props>>;
}

function findRoots(root: ComponentRoot, selector: string): HTMLElement[] {
  const results = Array.from(root.querySelectorAll<HTMLElement>(selector));

  if (root instanceof HTMLElement && root.matches(selector)) {
    results.unshift(root);
  }

  return results;
}

function hasOptions(options: Record<string, unknown>): boolean {
  return Object.keys(options).length > 0;
}

export function defineComponent<Props extends Record<string, PropDef>>(
  config: DefineComponentConfig<Props>,
): DefinedComponent<Props> {
  const defaults = propDefaults(config.props);
  const states = new WeakMap<HTMLElement, ComponentOptions<Props>>();
  const selector = `[${config.root}]`;
  const contract: ComponentContract<Props> = {
    name: config.name,
    tag: config.tag,
    root: config.root,
    props: config.props,
    parts: config.parts,
    events: config.events,
    a11y: config.a11y,
  };

  function mount(
    el: HTMLElement,
    options: ComponentOptions<Props> = {},
  ): ComponentElement<Props> {
    const mounted = el as ComponentElement<Props>;

    if (states.has(el)) {
      if (hasOptions(options)) mounted.update(options);
      return mounted;
    }

    const state = {
      ...defaults,
      ...readElementOptions(el, config.props),
      ...options,
    } as ComponentOptions<Props>;

    states.set(el, state);
    el.setAttribute(config.root, "");
    config.sync(el, state as ComponentRuntimeOptions<Props>);

    mounted.update = (updateOptions: Partial<ComponentOptions<Props>> = {}) => {
      const nextState = {
        ...states.get(el),
        ...updateOptions,
      } as ComponentOptions<Props>;
      states.set(el, nextState);
      config.sync(el, nextState as ComponentRuntimeOptions<Props>);
    };

    mounted.destroy = () => {
      config.destroy?.(el);
      states.delete(el);
    };

    return mounted;
  }

  return {
    init(root: ComponentRoot = document) {
      return findRoots(root, selector).map((el) => mount(el));
    },
    mount,
    destroy(root: ComponentRoot = document) {
      for (const el of findRoots(root, selector)) {
        const instance = el as ComponentElement<Props>;
        instance.destroy?.();
      }
    },
    contract,
  };
}
