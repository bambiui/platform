import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { tabs } from "../components/tabs";
import "../styles/tabs.css";

export interface TabsProps extends HTMLAttributes<HTMLElement> {
  value?: string;
  defaultValue?: string;
  orientation?: "horizontal" | "vertical";
  activationMode?: "automatic" | "manual";
  children?: ReactNode;
}

export const Tabs = forwardRef<HTMLElement, TabsProps>(
  function Tabs(
    {
      value,
      defaultValue,
      orientation = "horizontal",
      activationMode = "automatic",
      children,
      ...props
    },
    forwardedRef,
  ) {
    const localRef = useRef<HTMLElement | null>(null);
    const instanceRef = useRef<ReturnType<typeof tabs.mount> | null>(null);

    useImperativeHandle(
      forwardedRef,
      () => localRef.current as HTMLElement,
      [],
    );

    useEffect(() => {
      const element = localRef.current;
      if (!element) return;

      const instance = tabs.mount(element, {
        value,
        defaultValue,
        orientation,
        activationMode,
      });
      instanceRef.current = instance;

      return () => {
        instance.destroy();
        instanceRef.current = null;
      };
    }, []);

    useEffect(() => {
      instanceRef.current?.update({
        value,
        defaultValue,
        orientation,
        activationMode,
      });
    }, [value, defaultValue, orientation, activationMode]);

    return (
      <div
        {...props}
        ref={localRef as never}
        data-bambi-tabs=""
        data-value={value}
        data-default-value={defaultValue}
        data-orientation={orientation}
        data-activation-mode={activationMode}
      >
        {children}
      </div>
    );
  },
);

export interface TabsListProps extends HTMLAttributes<HTMLElement> {}

export const TabsList = forwardRef<HTMLElement, TabsListProps>(
  function TabsList(props, forwardedRef) {
    return (
      <div
        {...props}
        ref={forwardedRef as never}
        data-bambi-tabs-list=""
        role="tablist"
      />
    );
  },
);


export interface TabsTriggerProps extends HTMLAttributes<HTMLElement> {}

export const TabsTrigger = forwardRef<HTMLElement, TabsTriggerProps>(
  function TabsTrigger(props, forwardedRef) {
    return (
      <button
        {...props}
        ref={forwardedRef as never}
        data-bambi-tabs-trigger=""
        role="tab"
      />
    );
  },
);


export interface TabsContentProps extends HTMLAttributes<HTMLElement> {}

export const TabsContent = forwardRef<HTMLElement, TabsContentProps>(
  function TabsContent(props, forwardedRef) {
    return (
      <div
        {...props}
        ref={forwardedRef as never}
        data-bambi-tabs-content=""
        role="tabpanel"
      />
    );
  },
);
