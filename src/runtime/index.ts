import { button } from "../core/components/button";
import { tabs } from "../core/components/tabs";
import type { ComponentRoot } from "../core/define-component";

export const components = [button, tabs] as const;

function getDefaultRoot(): Document | undefined {
  return typeof document === "undefined" ? undefined : document;
}

export function autoInit(
  root: ComponentRoot | undefined = getDefaultRoot(),
): void {
  if (!root) return;
  for (const component of components) component.init(root);
}

export function destroyAll(
  root: ComponentRoot | undefined = getDefaultRoot(),
): void {
  if (!root) return;
  for (const component of components) component.destroy(root);
}

export { button } from "../core/components/button";
export { tabs } from "../core/components/tabs";
