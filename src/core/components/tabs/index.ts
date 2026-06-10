import { defineComponent } from "../../define-component";
import {
  createAbortScope,
  createId,
  directionFromKey,
  dispatchBambiEvent,
  enumProp,
  event,
  focusElement,
  getEnabledItems,
  isActivationKey,
  nextIndex,
  part,
  safeIdPart,
  setAttr,
  stringProp,
} from "../../shared";

const TABS_ROOT = "data-bambi-tabs";
const TABS_LIST = "data-bambi-tabs-list";
const TABS_TRIGGER = "data-bambi-tabs-trigger";
const TABS_CONTENT = "data-bambi-tabs-content";
const TABS_VALUE = "data-value";
const TABS_DEFAULT_VALUE = "data-default-value";
const TABS_ORIENTATION = "data-orientation";
const TABS_ACTIVATION_MODE = "data-activation-mode";
const TABS_STATE = "data-state";
const TABS_EVENT_VALUE_CHANGE = "bambi:value-change";

const orientations = ["horizontal", "vertical"] as const;
const activationModes = ["automatic", "manual"] as const;
const scopes = new WeakMap<HTMLElement, ReturnType<typeof createAbortScope>>();
const callbacks = new WeakMap<
  HTMLElement,
  TabsValueChangeCallback | undefined
>();

export type TabsOrientation = (typeof orientations)[number];
export type TabsActivationMode = (typeof activationModes)[number];

export interface TabsValueChangeDetail {
  value: string;
  previousValue: string | null;
  source: "click" | "keyboard";
}

export type TabsValueChangeCallback = (detail: TabsValueChangeDetail) => void;

interface TabsRootRuntimeOptions {
  value?: string;
  defaultValue?: string;
  onValueChange?: TabsValueChangeCallback;
}

function triggers(root: HTMLElement): HTMLElement[] {
  return getEnabledItems(
    Array.from(root.querySelectorAll<HTMLElement>(`[${TABS_TRIGGER}]`)),
  );
}

function contents(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(`[${TABS_CONTENT}]`));
}

function values(root: HTMLElement): string[] {
  return triggers(root)
    .map((trigger) => trigger.getAttribute(TABS_VALUE) ?? "")
    .filter(Boolean);
}

function syncRelationships(root: HTMLElement): void {
  const rootId = root.id || createId("bambi-tabs");
  root.id = rootId;

  for (const list of root.querySelectorAll<HTMLElement>(`[${TABS_LIST}]`)) {
    list.setAttribute("role", "tablist");
    list.setAttribute(
      "aria-orientation",
      root.getAttribute(TABS_ORIENTATION) ?? "horizontal",
    );
  }

  for (const trigger of root.querySelectorAll<HTMLElement>(
    `[${TABS_TRIGGER}]`,
  )) {
    const value = trigger.getAttribute(TABS_VALUE) ?? "item";
    const idPart = safeIdPart(value);
    trigger.id ||= `${rootId}-trigger-${idPart}`;
    trigger.setAttribute("role", "tab");
    trigger.setAttribute("aria-controls", `${rootId}-content-${idPart}`);
  }

  for (const content of contents(root)) {
    const value = content.getAttribute(TABS_VALUE) ?? "item";
    const idPart = safeIdPart(value);
    content.id ||= `${rootId}-content-${idPart}`;
    content.setAttribute("role", "tabpanel");
    content.setAttribute("aria-labelledby", `${rootId}-trigger-${idPart}`);
    if (!content.hasAttribute("tabindex"))
      content.setAttribute("tabindex", "0");
  }
}

function emitValueChange(
  root: HTMLElement,
  value: string,
  previousValue: string | null,
  source: TabsValueChangeDetail["source"],
): void {
  const detail: TabsValueChangeDetail = { value, previousValue, source };
  callbacks.get(root)?.(detail);
  dispatchBambiEvent<TabsValueChangeDetail>(
    root,
    TABS_EVENT_VALUE_CHANGE,
    detail,
  );
}

function applyTabsState(root: HTMLElement, value: string): void {
  root.setAttribute(TABS_VALUE, value);

  for (const trigger of root.querySelectorAll<HTMLElement>(
    `[${TABS_TRIGGER}]`,
  )) {
    const isActive = trigger.getAttribute(TABS_VALUE) === value;
    setAttr(trigger, TABS_STATE, isActive ? "active" : "inactive");
    trigger.setAttribute("aria-selected", String(isActive));
    trigger.setAttribute("tabindex", isActive ? "0" : "-1");
  }

  for (const content of contents(root)) {
    const isActive = content.getAttribute(TABS_VALUE) === value;
    setAttr(content, TABS_STATE, isActive ? "active" : "inactive");
    content.toggleAttribute("hidden", !isActive);
  }
}

function requestValueChange(
  root: HTMLElement,
  value: string,
  source: TabsValueChangeDetail["source"],
  controlled: boolean,
): void {
  const previousValue = root.getAttribute(TABS_VALUE);
  if (previousValue === value) return;

  if (!controlled) applyTabsState(root, value);
  emitValueChange(root, value, previousValue, source);
}

function bindTabs(root: HTMLElement, controlled: boolean): void {
  const scope = scopes.get(root) ?? createAbortScope();
  scopes.set(root, scope);
  const signal = scope.reset();
  const tabTriggers = triggers(root);
  const tabValues = values(root);
  const orientation = (root.getAttribute(TABS_ORIENTATION) ??
    "horizontal") as TabsOrientation;
  const activationMode = (root.getAttribute(TABS_ACTIVATION_MODE) ??
    "automatic") as TabsActivationMode;

  for (const trigger of tabTriggers) {
    trigger.addEventListener(
      "click",
      () => {
        const value = trigger.getAttribute(TABS_VALUE);
        if (value) requestValueChange(root, value, "click", controlled);
      },
      { signal },
    );

    trigger.addEventListener(
      "keydown",
      (keyboardEvent) => {
        const current = trigger.getAttribute(TABS_VALUE) ?? "";
        const currentIndex = tabValues.indexOf(current);
        if (currentIndex === -1) return;

        const direction = directionFromKey(keyboardEvent.key, orientation);

        if (!direction) {
          if (
            activationMode === "manual" &&
            isActivationKey(keyboardEvent.key)
          ) {
            keyboardEvent.preventDefault();
            requestValueChange(root, current, "keyboard", controlled);
          }
          return;
        }

        keyboardEvent.preventDefault();
        const targetIndex = nextIndex(
          currentIndex,
          tabValues.length,
          direction,
        );
        const targetValue = tabValues[targetIndex];
        const targetTrigger = tabTriggers.find(
          (item) => item.getAttribute(TABS_VALUE) === targetValue,
        );

        focusElement(targetTrigger);
        if (activationMode === "automatic" && targetValue) {
          requestValueChange(root, targetValue, "keyboard", controlled);
        }
      },
      { signal },
    );
  }
}

export const tabs = defineComponent({
  name: "tabs",
  tag: "div",
  root: TABS_ROOT,
  props: {
    value: stringProp({ attr: TABS_VALUE, controlled: true }),
    defaultValue: stringProp({ attr: TABS_DEFAULT_VALUE }),
    orientation: enumProp(orientations, {
      attr: TABS_ORIENTATION,
      default: "horizontal",
    }),
    activationMode: enumProp(activationModes, {
      attr: TABS_ACTIVATION_MODE,
      default: "automatic",
    }),
  },
  parts: {
    root: part("div", TABS_ROOT),
    list: part("div", TABS_LIST, { role: "tablist" }),
    trigger: part("button", TABS_TRIGGER, { role: "tab" }),
    content: part("div", TABS_CONTENT, { role: "tabpanel" }),
  },
  events: {
    valueChange: event(TABS_EVENT_VALUE_CHANGE, { detail: "object" }),
  },
  a11y: {
    roles: {
      list: "tablist",
      trigger: "tab",
      content: "tabpanel",
    },
    keyboard: [
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Home",
      "End",
      "Enter",
      "Space",
    ],
    relationships: {
      trigger: "aria-controls -> content",
      content: "aria-labelledby -> trigger",
    },
  },
  sync(el, props) {
    const runtimeProps = props as typeof props & TabsRootRuntimeOptions;
    const controlled = runtimeProps.value !== undefined;

    callbacks.set(el, runtimeProps.onValueChange);
    el.setAttribute(TABS_ORIENTATION, props.orientation ?? "horizontal");
    el.setAttribute(TABS_ACTIVATION_MODE, props.activationMode ?? "automatic");

    syncRelationships(el);

    const initialValue =
      runtimeProps.value ?? runtimeProps.defaultValue ?? values(el)[0];
    if (initialValue) applyTabsState(el, initialValue);
    bindTabs(el, controlled);
  },
  destroy(el) {
    scopes.get(el)?.destroy();
    scopes.delete(el);
    callbacks.delete(el);
  },
});

export const tabsContract = tabs.contract;
