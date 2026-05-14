import type { BambiController } from "./controller.js";

export interface MountOptions {
  target: string | Element;
  root?: Element | Document;
}

export function mountController(
  createController: (el: Element) => BambiController,
  options: MountOptions,
): () => void {
  const root = options.root ?? document;
  const el =
    typeof options.target === "string"
      ? root.querySelector(options.target)
      : options.target;

  if (!el) return () => undefined;

  const controller = createController(el);
  controller.sync();
  return () => controller.destroy();
}

/**
 * Auto-mount for plain HTML / HTMX use only.
 * Do NOT use this in framework wrappers — use explicit mount/destroy instead.
 */
export function autoMount(
  selector: string,
  createController: (el: Element) => BambiController,
  root: Element | Document = document,
): () => void {
  const controllers = new Map<Element, BambiController>();

  function mount(el: Element): void {
    if (controllers.has(el)) return;
    const c = createController(el);
    c.sync();
    controllers.set(el, c);
  }

  function unmount(el: Element): void {
    const c = controllers.get(el);
    if (c) {
      c.destroy();
      controllers.delete(el);
    }
  }

  for (const el of root.querySelectorAll(selector)) mount(el);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof Element) {
          if (node.matches(selector)) mount(node);
          for (const child of node.querySelectorAll(selector)) mount(child);
        }
      }
      for (const node of mutation.removedNodes) {
        if (node instanceof Element) {
          if (controllers.has(node)) unmount(node);
          for (const child of node.querySelectorAll(selector)) unmount(child);
        }
      }
    }
  });

  observer.observe(root, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
    for (const el of [...controllers.keys()]) unmount(el);
  };
}
