import { button } from "./components/button";
import { tabs } from "./components/tabs";

type ComponentRoot = Document | DocumentFragment | HTMLElement;

export const components = [button, tabs] as const;

function getDefaultRoot(): Document | undefined {
  return typeof document === "undefined" ? undefined : document;
}

export function autoInit(root: ComponentRoot | undefined = getDefaultRoot()): void {
  if (!root) return;
  for (const component of components) component.init(root);
}

export function destroyAll(root: ComponentRoot | undefined = getDefaultRoot()): void {
  if (!root) return;
  for (const component of components) component.destroy(root);
}
