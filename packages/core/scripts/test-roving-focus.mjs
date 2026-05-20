import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Run with: node packages/core/scripts/test-roving-focus.mjs
// Requires workspace dependencies — run `pnpm install` first if you see a module error.
let ts;
try {
  ts = (await import("typescript")).default;
} catch {
  console.error(
    "\n[test-roving-focus] Missing dependency: 'typescript'\n" +
      "Run 'pnpm install' in the repo root, then try again:\n" +
      "  node packages/core/scripts/test-roving-focus.mjs\n",
  );
  process.exit(1);
}

const rootDir = path.resolve(import.meta.dirname, "..");
const outDir = await mkdtemp(path.join(tmpdir(), "bambi-roving-focus-"));
await writeFile(path.join(outDir, "package.json"), '{"type":"module"}\n');

async function transpile(from, to = from) {
  const source = await import("node:fs/promises").then((fs) =>
    fs.readFile(path.join(rootDir, from), "utf8"),
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

await transpile("src/primitives/roving-focus.ts", "roving-focus.ts");

// ── Fake DOM ──────────────────────────────────────────────────────────────

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.parent = null;
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
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

  append(...children) {
    for (const child of children) {
      child.parent = this;
      this.children.push(child);
    }
  }

  addEventListener(type, listener, options = {}) {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
    options.signal?.addEventListener("abort", () => set.delete(listener), { once: true });
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
}

class FakeKeyboardEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.key = init.key ?? "";
    this.defaultPrevented = false;
    this.target = init.target ?? null;
  }
  preventDefault() {
    this.defaultPrevented = true;
  }
}

globalThis.Element = FakeElement;
globalThis.HTMLElement = FakeElement;
globalThis.document = { activeElement: null };

const { createRovingFocus } = await import(
  pathToFileURL(path.join(outDir, "roving-focus.js")).href
);

// ── Helpers ───────────────────────────────────────────────────────────────

function makeContainer(itemCount, disabledIndexes = []) {
  const container = new FakeElement("div");
  const items = Array.from({ length: itemCount }, (_, i) => {
    const item = new FakeElement("div");
    if (disabledIndexes.includes(i)) item.setAttribute("data-disabled", "true");
    container.append(item);
    return item;
  });
  return { container, items };
}

function focusedIndex(items) {
  return items.findIndex((item) => item === globalThis.document.activeElement);
}

function keydown(container, key) {
  container.dispatchEvent(new FakeKeyboardEvent("keydown", { key }));
}

test.after(async () => {
  await rm(outDir, { recursive: true, force: true });
});

// ── Tests ─────────────────────────────────────────────────────────────────

test("ArrowRight moves focus forward (horizontal)", () => {
  const { container, items } = makeContainer(3);
  items[0].focus();
  createRovingFocus(container, {
    orientation: "horizontal",
    getItems: () => items,
    onFocus: (item) => item.focus(),
  });
  keydown(container, "ArrowRight");
  assert.equal(focusedIndex(items), 1);
});

test("ArrowLeft moves focus backward (horizontal)", () => {
  const { container, items } = makeContainer(3);
  items[1].focus();
  createRovingFocus(container, {
    orientation: "horizontal",
    getItems: () => items,
    onFocus: (item) => item.focus(),
  });
  keydown(container, "ArrowLeft");
  assert.equal(focusedIndex(items), 0);
});

test("ArrowDown moves focus forward (vertical)", () => {
  const { container, items } = makeContainer(3);
  items[0].focus();
  createRovingFocus(container, {
    orientation: "vertical",
    getItems: () => items,
    onFocus: (item) => item.focus(),
  });
  keydown(container, "ArrowDown");
  assert.equal(focusedIndex(items), 1);
});

test("ArrowUp moves focus backward (vertical)", () => {
  const { container, items } = makeContainer(3);
  items[2].focus();
  createRovingFocus(container, {
    orientation: "vertical",
    getItems: () => items,
    onFocus: (item) => item.focus(),
  });
  keydown(container, "ArrowUp");
  assert.equal(focusedIndex(items), 1);
});

test("orientation: both handles all four arrow keys", () => {
  const { container, items } = makeContainer(3);
  createRovingFocus(container, {
    orientation: "both",
    getItems: () => items,
    onFocus: (item) => item.focus(),
  });

  items[0].focus();
  keydown(container, "ArrowDown");
  assert.equal(focusedIndex(items), 1, "ArrowDown should advance");

  items[1].focus();
  keydown(container, "ArrowRight");
  assert.equal(focusedIndex(items), 2, "ArrowRight should advance");

  items[2].focus();
  keydown(container, "ArrowUp");
  assert.equal(focusedIndex(items), 1, "ArrowUp should go back");

  items[1].focus();
  keydown(container, "ArrowLeft");
  assert.equal(focusedIndex(items), 0, "ArrowLeft should go back");
});

test("Home moves to first item, End to last", () => {
  const { container, items } = makeContainer(4);
  items[2].focus();
  createRovingFocus(container, {
    getItems: () => items,
    onFocus: (item) => item.focus(),
  });

  keydown(container, "Home");
  assert.equal(focusedIndex(items), 0);

  items[1].focus();
  keydown(container, "End");
  assert.equal(focusedIndex(items), 3);
});

test("disabled items are skipped via getItems filter", () => {
  const { container, items } = makeContainer(4, [1]);
  items[0].focus();
  createRovingFocus(container, {
    getItems: () => items.filter((item) => !item.hasAttribute("data-disabled")),
    onFocus: (item) => item.focus(),
  });
  keydown(container, "ArrowRight");
  assert.equal(globalThis.document.activeElement, items[2]);
});

test("disabled items are skipped via isDisabled option", () => {
  const { container, items } = makeContainer(4, [1]);
  items[0].focus();
  createRovingFocus(container, {
    getItems: () => items,
    isDisabled: (item) => item.hasAttribute("data-disabled"),
    onFocus: (item) => item.focus(),
  });
  keydown(container, "ArrowRight");
  assert.equal(globalThis.document.activeElement, items[2]);
});

test("loop: true wraps from last to first", () => {
  const { container, items } = makeContainer(3);
  items[2].focus();
  createRovingFocus(container, {
    loop: true,
    getItems: () => items,
    onFocus: (item) => item.focus(),
  });
  keydown(container, "ArrowRight");
  assert.equal(focusedIndex(items), 0);
});

test("loop: false stops at last item", () => {
  const { container, items } = makeContainer(3);
  items[2].focus();
  createRovingFocus(container, {
    loop: false,
    getItems: () => items,
    onFocus: (item) => item.focus(),
  });
  keydown(container, "ArrowRight");
  assert.equal(focusedIndex(items), 2, "Should stay at last item");
});

test("loop: false stops at first item when going backward", () => {
  const { container, items } = makeContainer(3);
  items[0].focus();
  createRovingFocus(container, {
    loop: false,
    getItems: () => items,
    onFocus: (item) => item.focus(),
  });
  keydown(container, "ArrowLeft");
  assert.equal(focusedIndex(items), 0, "Should stay at first item");
});

test("Enter activates the focused item", () => {
  const { container, items } = makeContainer(3);
  items[1].focus();
  let activated = null;
  createRovingFocus(container, {
    getItems: () => items,
    onFocus: (item) => item.focus(),
    onActivate: (item) => {
      activated = item;
    },
  });
  keydown(container, "Enter");
  assert.equal(activated, items[1]);
});

test("Space activates the focused item", () => {
  const { container, items } = makeContainer(3);
  items[0].focus();
  let activated = null;
  createRovingFocus(container, {
    getItems: () => items,
    onFocus: (item) => item.focus(),
    onActivate: (item) => {
      activated = item;
    },
  });
  keydown(container, " ");
  assert.equal(activated, items[0]);
});

test("destroy removes the keydown listener", () => {
  const { container, items } = makeContainer(3);
  items[0].focus();
  let focusCalled = false;
  const rf = createRovingFocus(container, {
    getItems: () => items,
    onFocus: () => {
      focusCalled = true;
    },
  });
  rf.destroy();
  keydown(container, "ArrowRight");
  assert.equal(focusCalled, false, "onFocus must not be called after destroy");
});
