import "./tabs.css";
import { createEffect, onCleanup, type JSX } from "solid-js";
import { TabsController } from "@bambiui/core/components/tabs";
import type { TabsOptions } from "@bambiui/core/components/tabs";

export type { BambiController, TabsOptions, TabsOrientation } from "@bambiui/core/components/tabs";
export type { TabsValueChangeDetail } from "@bambiui/core/components/tabs";

export interface TabsProps extends Omit<TabsOptions, "onValueChange"> {
  children?: JSX.Element;
  class?: string;
  onValueChange?: (value: string) => void;
}

export function Tabs(props: TabsProps) {
  let rootEl: HTMLDivElement | undefined;
  let controller: TabsController | undefined;
  const isControlled = () => props.controlled ?? props.value !== undefined;

  createEffect(() => {
    if (!rootEl) return;
    controller = new TabsController(rootEl, {
      value: props.value,
      defaultValue: props.defaultValue,
      controlled: isControlled(),
      orientation: props.orientation ?? "horizontal",
      disabled: props.disabled,
      onValueChange: props.onValueChange,
    });
    controller.sync();
    onCleanup(() => controller?.destroy());
  });

  createEffect(() => {
    controller?.update({
      value: props.value,
      disabled: props.disabled,
      orientation: props.orientation,
      onValueChange: props.onValueChange,
    });
  });

  return (
    <div
      ref={rootEl}
      data-bambi-tabs=""
      data-orientation={props.orientation ?? "horizontal"}
      data-controlled={isControlled() ? "true" : "false"}
      class={props.class}
    >
      {props.children}
    </div>
  );
}

export interface TabsListProps {
  children?: JSX.Element;
  class?: string;
}

export function TabsList(props: TabsListProps) {
  return (
    <div role="tablist" data-bambi-tabs-list="" class={props.class}>
      {props.children}
    </div>
  );
}

export interface TabsTriggerProps {
  value: string;
  children?: JSX.Element;
  class?: string;
  disabled?: boolean;
}

export function TabsTrigger(props: TabsTriggerProps) {
  return (
    <button
      role="tab"
      type="button"
      data-bambi-tabs-trigger=""
      data-value={props.value}
      data-disabled={props.disabled ? "true" : undefined}
      disabled={props.disabled}
      class={props.class}
    >
      {props.children}
    </button>
  );
}

export interface TabsContentProps {
  value: string;
  children?: JSX.Element;
  class?: string;
}

export function TabsContent(props: TabsContentProps) {
  return (
    <div
      role="tabpanel"
      data-bambi-tabs-content=""
      data-value={props.value}
      class={props.class}
      tabIndex={0}
    >
      {props.children}
    </div>
  );
}
