/**
 * Plain HTML / HTMX auto-mount helper.
 * Import once in your entry file. All [data-bambi-tabs] elements are mounted automatically,
 * including those added dynamically.
 */
import { TabsController } from "../core/tabs.controller";

const controllers = new Map<Element, TabsController>();

export function mount(el: Element): void {
  if (controllers.has(el)) return;
  const controller = new TabsController(el);
  controller.sync();
  controllers.set(el, controller);
}

export function unmount(el: Element): void {
  const controller = controllers.get(el);
  if (controller) {
    controller.destroy();
    controllers.delete(el);
  }
}

function mountAll(root: Document | Element = document): void {
  for (const el of root.querySelectorAll("[data-bambi-tabs]")) {
    mount(el);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => mountAll());
} else {
  mountAll();
}

new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node instanceof Element) {
        if (node.matches("[data-bambi-tabs]")) mount(node);
        for (const child of node.querySelectorAll("[data-bambi-tabs]")) mount(child);
      }
    }
    for (const node of mutation.removedNodes) {
      if (node instanceof Element) {
        if (controllers.has(node)) unmount(node);
        for (const child of node.querySelectorAll("[data-bambi-tabs]")) unmount(child);
      }
    }
  }
}).observe(document.body, { childList: true, subtree: true });
