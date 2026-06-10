declare namespace JSX {
  interface IntrinsicElements {
    [name: string]: Record<string, unknown>;
  }
}

declare module "*.css" {}
declare module "*.svelte" {
  const component: unknown;
  export default component;
}
declare module "*.vue" {
  const component: unknown;
  export default component;
}

declare module "react" {
  export type ReactNode = unknown;
  export type DependencyList = readonly unknown[];
  export type ElementType = keyof JSX.IntrinsicElements | ((props: Record<string, unknown>) => unknown);
  export type ComponentPropsWithoutRef<T extends ElementType> = HTMLAttributes<HTMLElement> & { as?: T; children?: ReactNode; };
  export namespace JSX {
    export type Element = unknown;
    export interface IntrinsicElements {
      [name: string]: Record<string, unknown>;
    }
  }
  export interface RefObject<T> { current: T; }
  export interface HTMLAttributes<T> { children?: ReactNode; [key: string]: unknown; }
  export function createElement(type: unknown, props?: unknown, ...children: unknown[]): unknown;
  export function forwardRef<T, P>(render: (props: P, ref: unknown) => unknown): (props: P & { children?: ReactNode }) => unknown;
  export function useEffect(effect: () => void | (() => void), deps?: DependencyList): void;
  export function useImperativeHandle<T>(ref: unknown, init: () => T, deps?: DependencyList): void;
  export function useRef<T>(value: T | null): { current: T | null };
}

declare module "solid-js" {
  export namespace JSX { interface HTMLAttributes<T> { children?: unknown; [key: string]: unknown; } }
  export function createEffect(fn: () => void): void;
  export function onCleanup(fn: () => void): void;
  export function onMount(fn: () => void): void;
  export function splitProps<T, K extends readonly (keyof T)[]>(props: T, keys: K): [Pick<T, K[number]>, Omit<T, K[number]>];
}
