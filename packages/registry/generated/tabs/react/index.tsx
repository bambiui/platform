import * as React from "react";
import "./tabs.css";

type TabsOrientation = "horizontal" | "vertical";
type TabsActivationMode = "automatic" | "manual";

export interface TabsValueChangeDetail {
  value: string;
  previousValue: string | null;
  source: "click" | "keyboard";
}

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  orientation?: TabsOrientation;
  activationMode?: TabsActivationMode;
  disabled?: boolean;
  onValueChange?: (detail: TabsValueChangeDetail) => void;
}

export type TabsListProps = React.HTMLAttributes<HTMLDivElement>;

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const TABS_ROOT = "data-bambi-tabs";
const TABS_LIST = "data-bambi-tabs-list";
const TABS_TRIGGER = "data-bambi-tabs-trigger";
const TABS_CONTENT = "data-bambi-tabs-content";
const TABS_VALUE = "data-value";
const TABS_DEFAULT_VALUE = "data-default-value";
const TABS_CONTROLLED = "data-controlled";
const TABS_ORIENTATION = "data-orientation";
const TABS_ACTIVATION_MODE = "data-activation-mode";
const TABS_DISABLED = "data-disabled";
const TABS_STATE = "data-state";
const TABS_EVENT_VALUE_CHANGE = "bambi:value-change";

function setAttr(el: Element, name: string, value: string | null): void {
  if (value === null) {
    el.removeAttribute(name);
  } else {
    el.setAttribute(name, value);
  }
}

function getBoolAttr(el: Element, name: string): boolean {
  return el.getAttribute(name) === "true";
}

function getTabsTriggers(root: Element): Element[] {
  return Array.from(root.querySelectorAll(`[${TABS_TRIGGER}]`));
}

function getTabsContents(root: Element): Element[] {
  return Array.from(root.querySelectorAll(`[${TABS_CONTENT}]`));
}

function applyTabsState(root: Element, idBase: string, nextValue: string, controlled: boolean): void {
  if (!controlled) setAttr(root, TABS_VALUE, nextValue);

  for (const trigger of getTabsTriggers(root)) {
    const value = trigger.getAttribute(TABS_VALUE) ?? "";
    if (!trigger.id) trigger.id = `${idBase}-trigger-${value}`;
    trigger.setAttribute("role", "tab");
    trigger.setAttribute("aria-controls", `${idBase}-content-${value}`);

    const active = value === nextValue;
    setAttr(trigger, TABS_STATE, active ? "active" : "inactive");
    trigger.setAttribute("aria-selected", String(active));
    trigger.setAttribute("tabindex", active ? "0" : "-1");
    if (getBoolAttr(trigger, TABS_DISABLED)) {
      trigger.setAttribute("aria-disabled", "true");
    } else {
      trigger.removeAttribute("aria-disabled");
    }
  }

  for (const content of getTabsContents(root)) {
    const value = content.getAttribute(TABS_VALUE) ?? "";
    if (!content.id) content.id = `${idBase}-content-${value}`;
    content.setAttribute("role", "tabpanel");
    content.setAttribute("aria-labelledby", `${idBase}-trigger-${value}`);
    if (!content.hasAttribute("tabindex")) content.setAttribute("tabindex", "0");

    const active = value === nextValue;
    setAttr(content, TABS_STATE, active ? "active" : "inactive");
    if (active) {
      content.removeAttribute("hidden");
    } else {
      content.setAttribute("hidden", "");
    }
  }
}

export function Tabs({
  value,
  defaultValue,
  orientation = "horizontal",
  activationMode = "automatic",
  disabled = false,
  onValueChange,
  children,
  ...props
}: TabsProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const reactId = React.useId();
  const idBase = props.id || `bambi-tabs-${reactId.replaceAll(":", "")}`;
  const controlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = React.useState<string | undefined>(defaultValue);
  const currentValue = controlled ? value : uncontrolledValue;
  const currentValueRef = React.useRef<string | null>(currentValue ?? null);
  const onValueChangeRef = React.useRef(onValueChange);

  React.useEffect(() => {
    onValueChangeRef.current = onValueChange;
  }, [onValueChange]);

  React.useEffect(() => {
    if (value !== undefined && defaultValue !== undefined) {
      console.warn(
        "[bambiui/tabs] Tabs received both `value` and `defaultValue`. Use `value` for controlled mode or `defaultValue` for uncontrolled mode, not both.",
      );
    }
  }, [defaultValue, value]);

  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    setAttr(root, TABS_ORIENTATION, orientation);
    setAttr(root, TABS_ACTIVATION_MODE, activationMode);
    setAttr(root, TABS_DISABLED, disabled ? "true" : null);

    for (const list of Array.from(root.querySelectorAll(`[${TABS_LIST}]`))) {
      list.setAttribute("role", "tablist");
      list.setAttribute("aria-orientation", orientation);
    }

    const nextValue =
      currentValue ??
      root.getAttribute(TABS_VALUE) ??
      root.getAttribute(TABS_DEFAULT_VALUE) ??
      getTabsTriggers(root)[0]?.getAttribute(TABS_VALUE) ??
      null;

    if (!nextValue) return;
    currentValueRef.current = nextValue;
    if (!controlled && uncontrolledValue === undefined) setUncontrolledValue(nextValue);
    applyTabsState(root, idBase, nextValue, controlled);
  }, [activationMode, controlled, currentValue, disabled, idBase, orientation, uncontrolledValue]);

  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const changeValue = (nextValue: string, source: "click" | "keyboard") => {
      if (nextValue === currentValueRef.current) return;

      const previousValue = currentValueRef.current;
      currentValueRef.current = nextValue;
      if (!controlled) {
        setUncontrolledValue(nextValue);
        applyTabsState(root, idBase, nextValue, false);
      }

      const detail = { value: nextValue, previousValue, source };
      root.dispatchEvent(
        new CustomEvent<TabsValueChangeDetail>(TABS_EVENT_VALUE_CHANGE, {
          bubbles: true,
          detail,
        }),
      );
      onValueChangeRef.current?.(detail);
    };

    const onClick = (event: MouseEvent) => {
      if (disabled) return;
      const target = (event.target as Element | null)?.closest(`[${TABS_TRIGGER}]`);
      if (!target || !root.contains(target)) return;
      if (getBoolAttr(target, TABS_DISABLED) || target.getAttribute("aria-disabled") === "true") return;

      const nextValue = target.getAttribute(TABS_VALUE);
      if (nextValue) changeValue(nextValue, "click");
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (disabled) return;
      const activeTriggers = getTabsTriggers(root).filter(
        (trigger) => !getBoolAttr(trigger, TABS_DISABLED) && trigger.getAttribute("aria-disabled") !== "true",
      );
      const focused = activeTriggers.findIndex((trigger) => trigger === document.activeElement);
      if (focused === -1) return;

      const prevKey = orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
      const nextKey = orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
      let nextTrigger: Element | undefined;

      if (event.key === nextKey) {
        event.preventDefault();
        nextTrigger = activeTriggers[(focused + 1) % activeTriggers.length];
      } else if (event.key === prevKey) {
        event.preventDefault();
        nextTrigger = activeTriggers[(focused - 1 + activeTriggers.length) % activeTriggers.length];
      } else if (event.key === "Home") {
        event.preventDefault();
        nextTrigger = activeTriggers[0];
      } else if (event.key === "End") {
        event.preventDefault();
        nextTrigger = activeTriggers[activeTriggers.length - 1];
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const nextValue = activeTriggers[focused]?.getAttribute(TABS_VALUE);
        if (nextValue) changeValue(nextValue, "keyboard");
        return;
      }

      if (!(nextTrigger instanceof HTMLElement)) return;
      nextTrigger.focus();
      if (activationMode === "automatic") {
        const nextValue = nextTrigger.getAttribute(TABS_VALUE);
        if (nextValue) changeValue(nextValue, "keyboard");
      }
    };

    root.addEventListener("click", onClick);
    root.addEventListener("keydown", onKeyDown);
    return () => {
      root.removeEventListener("click", onClick);
      root.removeEventListener("keydown", onKeyDown);
    };
  }, [activationMode, controlled, disabled, idBase, orientation]);

  return (
    <div
      {...props}
      ref={rootRef}
      data-bambi-tabs=""
      data-value={value}
      data-default-value={defaultValue}
      data-controlled={controlled ? "true" : undefined}
      data-orientation={orientation}
      data-activation-mode={activationMode}
      data-disabled={disabled ? "true" : undefined}
    >
      {children}
    </div>
  );
}

export function TabsList({ children, ...props }: TabsListProps) {
  return (
    <div {...props} data-bambi-tabs-list="">
      {children}
    </div>
  );
}

export function TabsTrigger({ value, disabled, children, ...props }: TabsTriggerProps) {
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      disabled={disabled}
      data-bambi-tabs-trigger=""
      data-value={value}
      data-disabled={disabled ? "true" : undefined}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children, ...props }: TabsContentProps) {
  return (
    <div {...props} data-bambi-tabs-content="" data-value={value}>
      {children}
    </div>
  );
}
