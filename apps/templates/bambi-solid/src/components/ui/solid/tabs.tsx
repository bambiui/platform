import { createEffect, onCleanup, onMount, splitProps, type JSX } from "solid-js";
import { tabs } from "../components/tabs";
import "../styles/tabs.css";

export interface TabsProps
  extends JSX.HTMLAttributes<HTMLElement> {
  value?: string;
  defaultValue?: string;
  orientation?: "horizontal" | "vertical";
  activationMode?: "automatic" | "manual";
}

export function Tabs(props: TabsProps) {
  const [local, rest] = splitProps(props, [
    "value",
    "defaultValue",
    "orientation",
    "activationMode"
  ]);
  let element!: HTMLElement;
  let instance: ReturnType<typeof tabs.mount> | undefined;
  const value = () => local.value ?? undefined;
  const defaultValue = () => local.defaultValue ?? undefined;
  const orientation = () => local.orientation ?? "horizontal";
  const activationMode = () => local.activationMode ?? "automatic";

  onMount(() => {
    instance = tabs.mount(element, {
        value: value(),
        defaultValue: defaultValue(),
        orientation: orientation(),
        activationMode: activationMode(),
    });
  });

  createEffect(() => {
    instance?.update({
        value: value(),
        defaultValue: defaultValue(),
        orientation: orientation(),
        activationMode: activationMode(),
    });
  });

  onCleanup(() => {
    instance?.destroy();
  });

  return (
    <div
      {...rest}
      ref={element}
      data-bambi-tabs=""
      data-value={value()}
      data-default-value={defaultValue()}
      data-orientation={orientation()}
      data-activation-mode={activationMode()}
    />
  );
}
