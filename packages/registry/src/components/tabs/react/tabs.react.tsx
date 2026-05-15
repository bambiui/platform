import type { ComponentProps, ReactNode } from "react";
import { createReactAdapter } from "@bambiui/adapters/react";
import { TabsController, tabsContract } from "@bambiui/core/components/tabs";
import type { TabsOptions } from "@bambiui/core/components/tabs";
import "./tabs.css";

export type { BambiController, TabsOptions, TabsOrientation } from "@bambiui/core/components/tabs";
export type { TabsValueChangeDetail } from "@bambiui/core/components/tabs";

export interface TabsProps extends TabsOptions {
  children?: ReactNode;
  className?: string;
}

const tabsAdapter = createReactAdapter<TabsOptions>(tabsContract, {
  controller: TabsController,
});
const TabsRoot = tabsAdapter.Root;

export function Tabs(props: TabsProps) {
  const { value, defaultValue } = props;

  if (value !== undefined && defaultValue !== undefined) {
    console.warn(
      "[bambiui/tabs] Tabs received both `value` and `defaultValue`. " +
        "Use `value` for controlled mode or `defaultValue` for uncontrolled mode, not both.",
    );
  }

  return <TabsRoot {...props} />;
}

export type TabsListProps = ComponentProps<typeof tabsAdapter.List>;

export const TabsList = tabsAdapter.List;

export interface TabsTriggerProps extends ComponentProps<typeof tabsAdapter.Trigger> {
  value: string;
}

export const TabsTrigger = tabsAdapter.Trigger;

export interface TabsContentProps extends ComponentProps<typeof tabsAdapter.Content> {
  value: string;
}

export const TabsContent = tabsAdapter.Content;
