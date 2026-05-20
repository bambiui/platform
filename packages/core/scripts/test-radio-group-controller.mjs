import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

let ts;
try {
  ts = (await import("typescript")).default;
} catch {
  console.error(
    "\n[test-radio-group-controller] Missing dependency: 'typescript'\n" +
      "Run 'pnpm install' in the repo root, then try again:\n" +
      "  node packages/core/scripts/test-radio-group-controller.mjs\n",
  );
  process.exit(1);
}

const rootDir = path.resolve(import.meta.dirname, "..");
const outDir = await mkdtemp(path.join(tmpdir(), "bambi-radio-group-controller-"));
await writeFile(path.join(outDir, "package.json"), '{"type":"module"}\n');

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
await transpile("src/components/radio-group/radio-group.contract.ts", "radio-group.contract.ts", (source) =>
  source.replace("../../../contract/define-contract.js", "./define-contract.js"),
);
await transpile("src/primitives/roving-focus.ts", "roving-focus.ts");
await transpile("src/components/radio-group/radio-group.controller.ts", "radio-group.controller.ts", (source) =>
  source.replace("@bambiui/core/primitives/roving-focus", "./roving-focus.js"),
);

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
    this._checked = false;
    this._disabled = false;
    this._required = false;
    this._tabIndex = 0;
    this._value = "";
    this._form = null;
  }

  get id() {
    return this.getAttribute("id") ?? "";
  }

  set id(value) {
    if (value) this.setAttribute("id", value);
    else this.removeAttribute("id");
  }

  get checked() {
    return this._checked;
  }

  set checked(value) {
    this._checked = Boolean(value);
  }

  get disabled() {
    return this._disabled;
  }

  set disabled(value) {
    this._disabled = Boolean(value);
  }

  get required() {
    return this._required;
  }

  set required(value) {
    this._required = Boolean(value);
  }

  get tabIndex() {
    return this._tabIndex;
  }

  set tabIndex(value) {
    this._tabIndex = Number(value);
  }

  get value() {
    return this._value || this.getAttribute("value") || "";
  }

  set value(value) {
    this._value = String(value);
    this.setAttribute("value", value);
  }

  get type() {
    return this.getAttribute("type") || "";
  }

  set type(value) {
    this.setAttribute("type", value);
  }

  get name() {
    return this.getAttribute("name") || "";
  }

  set name(value) {
    this.setAttribute("name", value);
  }

  get form() {
    return this._form;
  }

  set form(value) {
    this._form = value;
  }

  get htmlFor() {
    return this.getAttribute("for") || "";
  }

  set htmlFor(value) {
    if (value) this.setAttribute("for", value);
    else this.removeAttribute("for");
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
globalThis.HTMLInputElement = FakeElement;
globalThis.HTMLLabelElement = FakeElement;
globalThis.CustomEvent = FakeCustomEvent;
globalThis.document = { activeElement: null };
globalThis.window = { setTimeout: (fn) => fn() };

const { RadioGroupController } = await import(
  pathToFileURL(path.join(outDir, "radio-group.controller.js")).href
);

function el(tag, attrs = {}) {
  const node = new FakeElement(tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  return node;
}

function item(value, attrs = {}) {
  const wrapper = el("div", { "data-bambi-radio-group-item": "", "data-value": value, ...attrs });
  const input = el("input", { "data-bambi-radio-group-input": "", value });
  const indicator = el("span", { "data-bambi-radio-group-indicator": "" });
  const label = el("label", { "data-bambi-radio-group-label": "" });
  wrapper.append(input, indicator, label);
  return { wrapper, input, indicator, label };
}

function fixture() {
  const root = el("div", { "data-bambi-radio-group": "" });
  const one = item("one");
  const two = item("two");
  const disabled = item("disabled", { "data-disabled": "true" });
  root.append(one.wrapper, two.wrapper, disabled.wrapper);
  return { root, one, two, disabled };
}

test.after(async () => {
  await rm(outDir, { recursive: true, force: true });
});

test("sync selects default value and writes native radio state", () => {
  const { root, one, two } = fixture();
  new RadioGroupController(root, { defaultValue: "two", name: "choice", required: true }).sync();

  assert.equal(root.getAttribute("role"), "radiogroup");
  assert.equal(root.getAttribute("data-value"), "two");
  assert.equal(root.getAttribute("aria-required"), "true");
  assert.equal(one.input.name, "choice");
  assert.equal(two.input.checked, true);
  assert.equal(two.wrapper.getAttribute("data-state"), "checked");
  assert.equal(two.indicator.getAttribute("data-state"), "checked");
  assert.equal(two.input.required, true);
  assert.equal(two.label.htmlFor, two.input.id);
});

test("click updates uncontrolled value and skips disabled items", () => {
  const { root, two, disabled } = fixture();
  new RadioGroupController(root, { defaultValue: "one" }).sync();
  let detail = null;
  root.addEventListener("bambi:value-change", (event) => {
    detail = event.detail;
  });

  two.wrapper.dispatchEvent(new FakeEvent("click"));

  assert.deepEqual(detail, { value: "two", previousValue: "one", source: "click" });
  assert.equal(root.getAttribute("data-value"), "two");
  assert.equal(two.input.checked, true);

  disabled.wrapper.dispatchEvent(new FakeEvent("click"));
  assert.equal(root.getAttribute("data-value"), "two");
});

test("keyboard navigation moves focus and selection", () => {
  const { root, one, two } = fixture();
  new RadioGroupController(root, { defaultValue: "one" }).sync();
  one.input.focus();

  one.input.dispatchEvent(new FakeEvent("keydown", { key: "ArrowDown" }));

  assert.equal(globalThis.document.activeElement, two.input);
  assert.equal(root.getAttribute("data-value"), "two");
});

test("controlled mode dispatches without committing until update", () => {
  const { root, one, two } = fixture();
  const controller = new RadioGroupController(root, { value: "one", controlled: true });
  controller.sync();
  let detail = null;
  root.addEventListener("bambi:value-change", (event) => {
    detail = event.detail;
  });

  two.wrapper.dispatchEvent(new FakeEvent("click"));

  assert.deepEqual(detail, { value: "two", previousValue: "one", source: "click" });
  assert.equal(root.getAttribute("data-value"), null);
  assert.equal(one.input.checked, true);
  assert.equal(two.input.checked, false);

  controller.update({ value: "two", controlled: true });
  assert.equal(two.input.checked, true);
  assert.equal(root.getAttribute("data-value"), null);
});

test("form reset restores default value in uncontrolled mode", () => {
  const { root, one, two } = fixture();
  const form = el("form");
  one.input.form = form;
  two.input.form = form;
  const controller = new RadioGroupController(root, { defaultValue: "one" });
  controller.sync();
  two.wrapper.dispatchEvent(new FakeEvent("click"));

  form.dispatchEvent(new FakeEvent("reset"));

  assert.equal(root.getAttribute("data-value"), "one");
  assert.equal(one.input.checked, true);
});
