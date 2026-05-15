import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Run with: node packages/core/scripts/test-tabs-controller.mjs
// Requires workspace dependencies — run `pnpm install` first if you see a module error.
let ts;
try {
  ts = (await import("typescript")).default;
} catch {
  console.error(
    "\n[test-tabs-controller] Missing dependency: 'typescript'\n" +
    "Run 'pnpm install' in the repo root, then try again:\n" +
    "  node packages/core/scripts/test-tabs-controller.mjs\n",
  );
  process.exit(1);
}

const rootDir = path.resolve(import.meta.dirname, "..");
const outDir = await mkdtemp(path.join(tmpdir(), "bambi-tabs-controller-"));

async function transpile(from, to = from, transform = (source) => source) {
  const source = transform(
    await import("node:fs/promises").then((fs) =>
      fs.readFile(path.join(rootDir, from), "utf8"),
    ),
  );
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: true,
    },
  }).outputText;
  await writeFile(path.join(outDir, to.replace(/\.ts$/, ".js")), output);
}

await transpile("contract/define-contract.ts", "define-contract.ts");
await transpile("src/components/tabs/tabs.contract.ts", "tabs.contract.ts", (source) =>
  source.replace("../../../contract/define-contract.js", "./define-contract.js"),
);
await transpile("src/components/tabs/tabs.controller.ts", "tabs.controller.ts");

class FakeEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.key = init.key;
    this.target = init.target;
    this.defaultPrevented = false;
  }

  preventDefault() {
    this.defaultPrevented = true;
  }
}

class FakeCustomEvent extends FakeEvent {
  constructor(type, init = {}) {
    super(type, init);
    this.detail = init.detail;
  }
}

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.parent = null;
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
  }

  get id() {
    return this.getAttribute("id") ?? "";
  }

  set id(value) {
    if (value) this.setAttribute("id", value);
    else this.removeAttribute("id");
  }

  append(...children) {
    for (const child of children) {
      child.parent = this;
      this.children.push(child);
    }
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  addEventListener(type, listener, options = {}) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
    options.signal?.addEventListener("abort", () => listeners.delete(listener), { once: true });
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatchEvent(event) {
    if (!event.target) event.target = this;
    for (const listener of this.listeners.get(event.type) ?? []) listener(event);
    if (this.parent) this.parent.dispatchEvent(event);
    return !event.defaultPrevented;
  }

  focus() {
    globalThis.document.activeElement = this;
  }

  contains(node) {
    if (node === this) return true;
    return this.children.some((child) => child.contains(node));
  }

  closest(selector) {
    let current = this;
    while (current) {
      if (current.matches(selector)) return current;
      current = current.parent;
    }
    return null;
  }

  matches(selector) {
    const attr = selector.match(/^\[([^\]]+)\]$/)?.[1];
    return Boolean(attr && this.hasAttribute(attr));
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector) {
    const results = [];
    const visit = (node) => {
      for (const child of node.children) {
        if (child.matches(selector)) results.push(child);
        visit(child);
      }
    };
    visit(this);
    return results;
  }
}

globalThis.Element = FakeElement;
globalThis.HTMLElement = FakeElement;
globalThis.CustomEvent = FakeCustomEvent;
globalThis.document = { activeElement: null };

const {
  TabsController,
} = await import(pathToFileURL(path.join(outDir, "tabs.controller.js")).href);

function el(tag, attrs = {}) {
  const node = new FakeElement(tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  return node;
}

function fixture() {
  const root = el("div", { "data-bambi-tabs": "" });
  const list = el("div", { "data-bambi-tabs-list": "" });
  const one = el("button", { "data-bambi-tabs-trigger": "", "data-value": "one" });
  const two = el("button", { "data-bambi-tabs-trigger": "", "data-value": "two" });
  const disabled = el("button", {
    "data-bambi-tabs-trigger": "",
    "data-value": "disabled",
    "data-disabled": "true",
  });
  const panelOne = el("div", { "data-bambi-tabs-content": "", "data-value": "one" });
  const panelTwo = el("div", { "data-bambi-tabs-content": "", "data-value": "two" });
  const panelDisabled = el("div", { "data-bambi-tabs-content": "", "data-value": "disabled" });
  list.append(one, two, disabled);
  root.append(list, panelOne, panelTwo, panelDisabled);
  return { root, list, one, two, disabled, panelOne, panelTwo };
}

test.after(async () => {
  await rm(outDir, { recursive: true, force: true });
});

test("sync selects the default tab and writes ARIA state", () => {
  const { root, list, one, two, panelOne, panelTwo } = fixture();
  new TabsController(root, { defaultValue: "one" }).sync();

  assert.equal(root.getAttribute("data-value"), "one");
  assert.equal(list.getAttribute("role"), "tablist");
  assert.equal(list.getAttribute("aria-orientation"), "horizontal");
  assert.equal(one.getAttribute("aria-selected"), "true");
  assert.equal(two.getAttribute("aria-selected"), "false");
  assert.equal(panelOne.hasAttribute("hidden"), false);
  assert.equal(panelTwo.hasAttribute("hidden"), true);
});

test("click dispatches detail and disabled triggers do not activate", () => {
  const { root, two, disabled } = fixture();
  new TabsController(root, { defaultValue: "one" }).sync();
  let detail = null;
  root.addEventListener("bambi:value-change", (event) => {
    detail = event.detail;
  });

  two.dispatchEvent(new FakeEvent("click"));

  assert.deepEqual(detail, { value: "two", previousValue: "one", source: "click" });
  assert.equal(root.getAttribute("data-value"), "two");

  disabled.dispatchEvent(new FakeEvent("click"));
  assert.equal(root.getAttribute("data-value"), "two");
});

test("automatic keyboard navigation activates the focused trigger", () => {
  const { root, one, two } = fixture();
  new TabsController(root, { defaultValue: "one" }).sync();
  one.focus();

  one.dispatchEvent(new FakeEvent("keydown", { key: "ArrowRight" }));

  assert.equal(globalThis.document.activeElement, two);
  assert.equal(root.getAttribute("data-value"), "two");
});

test("manual keyboard navigation waits for Enter or Space", () => {
  const { root, one, two } = fixture();
  new TabsController(root, { defaultValue: "one", activationMode: "manual" }).sync();
  one.focus();

  one.dispatchEvent(new FakeEvent("keydown", { key: "ArrowRight" }));
  assert.equal(globalThis.document.activeElement, two);
  assert.equal(root.getAttribute("data-value"), "one");

  two.dispatchEvent(new FakeEvent("keydown", { key: "Enter" }));
  assert.equal(root.getAttribute("data-value"), "two");
});

test("vertical orientation uses ArrowDown and syncs aria-orientation", () => {
  const { root, list, one, two } = fixture();
  new TabsController(root, { defaultValue: "one", orientation: "vertical" }).sync();
  one.focus();

  one.dispatchEvent(new FakeEvent("keydown", { key: "ArrowDown" }));

  assert.equal(list.getAttribute("aria-orientation"), "vertical");
  assert.equal(globalThis.document.activeElement, two);
  assert.equal(root.getAttribute("data-value"), "two");
});

test("controlled mode dispatches without mutating source state until update", () => {
  const { root, two } = fixture();
  const controller = new TabsController(root, { value: "one", controlled: true });
  controller.sync();
  let detail = null;
  root.addEventListener("bambi:value-change", (event) => {
    detail = event.detail;
  });

  two.dispatchEvent(new FakeEvent("click"));

  assert.deepEqual(detail, { value: "two", previousValue: "one", source: "click" });
  assert.equal(root.getAttribute("data-value"), null);
  assert.equal(two.getAttribute("aria-selected"), "false");

  controller.update({ value: "two", controlled: true });
  assert.equal(two.getAttribute("aria-selected"), "true");
  assert.equal(root.getAttribute("data-value"), null);
});
