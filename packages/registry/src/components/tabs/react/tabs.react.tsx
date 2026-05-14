import { useEffect, useRef, type ReactNode } from "react";
import { TabsController } from "../core/tabs.controller";
import type { TabsOptions } from "../core/tabs.controller";

export type { BambiController, TabsOptions, TabsOrientation } from "../core/tabs.controller";
export type { TabsValueChangeDetail } from "../core/tabs.contract";

export interface TabsProps extends TabsOptions {
  children?: ReactNode;
  className?: string;
}

export function Tabs({
  children,
  className,
  value,
  defaultValue,
  controlled,
  orientation = "horizontal",
  disabled,
  onValueChange,
}: TabsProps) {
  if (value !== undefined && defaultValue !== undefined) {
    console.warn(
      "[bambiui/tabs] Tabs received both `value` and `defaultValue`. " +
        "Use `value` for controlled mode or `defaultValue` for uncontrolled mode, not both.",
    );
  }

  const rootRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<TabsController | null>(null);
  const isControlled = controlled ?? value !== undefined;

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const controller = new TabsController(el, {
      value,
      defaultValue,
      controlled: isControlled,
      orientation,
      disabled,
      onValueChange,
    });
    controller.sync();
    controllerRef.current = controller;
    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    controllerRef.current?.update({ value, disabled, orientation, onValueChange });
  }, [value, disabled, orientation, onValueChange]);

  return (
    <div
      ref={rootRef}
      data-bambi-tabs=""
      data-orientation={orientation}
      data-controlled={isControlled ? "true" : "false"}
      className={className}
    >
      {children}
    </div>
  );
}

export interface TabsListProps {
  children?: ReactNode;
  className?: string;
}

export function TabsList({ children, className }: TabsListProps) {
  return (
    <div role="tablist" data-bambi-tabs-list="" className={className}>
      {children}
    </div>
  );
}

export interface TabsTriggerProps {
  value: string;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function TabsTrigger({ value, children, className, disabled }: TabsTriggerProps) {
  return (
    <button
      role="tab"
      type="button"
      data-bambi-tabs-trigger=""
      data-value={value}
      data-disabled={disabled ? "true" : undefined}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  );
}

export interface TabsContentProps {
  value: string;
  children?: ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  return (
    <div
      role="tabpanel"
      data-bambi-tabs-content=""
      data-value={value}
      className={className}
      tabIndex={0}
    >
      {children}
    </div>
  );
}
