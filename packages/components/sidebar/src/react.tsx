import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useId,
  useState,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type LiHTMLAttributes,
  type ReactNode,
} from "react";
import { sidebarRecipe } from "./recipe";
import type {
  SidebarBaseProps,
  SidebarCollapsible,
  SidebarGroup as SidebarGroupConfig,
  SidebarItem as SidebarItemConfig,
  SidebarSide,
} from "./types";
import "./sidebar.css";

export type {
  SidebarBaseProps,
  SidebarCollapsible,
  SidebarDefaults,
  SidebarGroup as SidebarGroupConfig,
  SidebarItem as SidebarItemConfig,
  SidebarSide,
} from "./types";

function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(" ");
}

// ── Context ────────────────────────────────────────────────────────────────

interface SidebarContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  side: SidebarSide;
  collapsible: SidebarCollapsible;
  overlayId: string;
}

const SidebarContext = createContext<SidebarContextValue>({
  open: true,
  setOpen: () => undefined,
  toggleOpen: () => undefined,
  side: "left",
  collapsible: "offcanvas",
  overlayId: "",
});

export function useSidebar() {
  return useContext(SidebarContext);
}

// ── Sidebar root ───────────────────────────────────────────────────────────

export interface SidebarProps
  extends Omit<HTMLAttributes<HTMLElement>, "children">,
    SidebarBaseProps {
  children?: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  groups?: SidebarGroupConfig[];
  items?: SidebarItemConfig[];
  onOpenChange?: (open: boolean) => void;
}

export const Sidebar = forwardRef<HTMLElement, SidebarProps>(function Sidebar(
  {
    children,
    className,
    side = sidebarRecipe.defaults.side,
    collapsible = sidebarRecipe.defaults.collapsible,
    defaultOpen = sidebarRecipe.defaults.defaultOpen,
    open: controlledOpen,
    onOpenChange,
    header,
    footer,
    groups,
    items,
    ...props
  },
  ref,
) {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  const toggleOpen = useCallback(() => setOpen(!open), [open, setOpen]);
  const overlayId = useId();

  const state = open ? "open" : "closed";
  const hasConvenienceContent =
    children === undefined &&
    (header !== undefined || footer !== undefined || groups !== undefined || items !== undefined);
  const normalizedGroups =
    groups ?? (items ? [{ items }] satisfies SidebarGroupConfig[] : []);

  return (
    <SidebarContext.Provider value={{ open, setOpen, toggleOpen, side, collapsible, overlayId }}>
      {collapsible === "offcanvas" && (
        <div
          id={overlayId}
          className="bambi-sidebar-overlay"
          data-state={state}
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}
      <nav
        ref={ref}
        aria-label="Sidebar navigation"
        data-state={state}
        data-side={side}
        data-collapsible={collapsible}
        className={cn(sidebarRecipe.className, className)}
        {...props}
      >
        {hasConvenienceContent ? (
          <>
            {header !== undefined && <SidebarHeader>{header}</SidebarHeader>}
            <SidebarContent>
              {normalizedGroups.map((group, groupIndex) => (
                <SidebarGroup key={`${group.label ?? "group"}-${groupIndex}`}>
                  {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
                  <SidebarMenu>
                    {group.items.map((item, itemIndex) => (
                      <SidebarMenuItem key={`${item.label}-${itemIndex}`}>
                        <SidebarConfigItem item={item} />
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroup>
              ))}
            </SidebarContent>
            {footer !== undefined && <SidebarFooter>{footer}</SidebarFooter>}
            <SidebarRail />
          </>
        ) : (
          children
        )}
      </nav>
    </SidebarContext.Provider>
  );
});

function SidebarConfigItem({ item }: { item: SidebarItemConfig }) {
  const content = (
    <>
      {item.icon !== undefined && <span aria-hidden="true">{item.icon as ReactNode}</span>}
      <span>{item.label}</span>
    </>
  );

  if (item.href && !item.disabled) {
    return (
      <SidebarMenuLink href={item.href} active={item.active}>
        {content}
      </SidebarMenuLink>
    );
  }

  return (
    <SidebarMenuButton
      active={item.active}
      disabled={item.disabled}
      onClick={item.onClick as ButtonHTMLAttributes<HTMLButtonElement>["onClick"]}
    >
      {content}
    </SidebarMenuButton>
  );
}

// ── SidebarHeader ──────────────────────────────────────────────────────────

export type SidebarHeaderProps = HTMLAttributes<HTMLDivElement>;

export const SidebarHeader = forwardRef<HTMLDivElement, SidebarHeaderProps>(
  function SidebarHeader({ children, className, ...props }, ref) {
    return (
      <div ref={ref} className={cn("bambi-sidebar-header", className)} {...props}>
        {children}
      </div>
    );
  },
);

// ── SidebarContent ─────────────────────────────────────────────────────────

export type SidebarContentProps = HTMLAttributes<HTMLDivElement>;

export const SidebarContent = forwardRef<HTMLDivElement, SidebarContentProps>(
  function SidebarContent({ children, className, ...props }, ref) {
    return (
      <div ref={ref} className={cn("bambi-sidebar-content", className)} {...props}>
        {children}
      </div>
    );
  },
);

// ── SidebarFooter ──────────────────────────────────────────────────────────

export type SidebarFooterProps = HTMLAttributes<HTMLDivElement>;

export const SidebarFooter = forwardRef<HTMLDivElement, SidebarFooterProps>(
  function SidebarFooter({ children, className, ...props }, ref) {
    return (
      <div ref={ref} className={cn("bambi-sidebar-footer", className)} {...props}>
        {children}
      </div>
    );
  },
);

// ── SidebarGroup ───────────────────────────────────────────────────────────

export type SidebarGroupProps = HTMLAttributes<HTMLDivElement>;

export const SidebarGroup = forwardRef<HTMLDivElement, SidebarGroupProps>(
  function SidebarGroup({ children, className, ...props }, ref) {
    return (
      <div ref={ref} className={cn("bambi-sidebar-group", className)} {...props}>
        {children}
      </div>
    );
  },
);

// ── SidebarGroupLabel ──────────────────────────────────────────────────────

export type SidebarGroupLabelProps = HTMLAttributes<HTMLSpanElement>;

export const SidebarGroupLabel = forwardRef<HTMLSpanElement, SidebarGroupLabelProps>(
  function SidebarGroupLabel({ children, className, ...props }, ref) {
    return (
      <span ref={ref} className={cn("bambi-sidebar-group-label", className)} {...props}>
        {children}
      </span>
    );
  },
);

// ── SidebarMenu ────────────────────────────────────────────────────────────

export type SidebarMenuProps = HTMLAttributes<HTMLUListElement>;

export const SidebarMenu = forwardRef<HTMLUListElement, SidebarMenuProps>(
  function SidebarMenu({ children, className, ...props }, ref) {
    return (
      <ul ref={ref} className={cn("bambi-sidebar-menu", className)} {...props}>
        {children}
      </ul>
    );
  },
);

// ── SidebarMenuItem ────────────────────────────────────────────────────────

export type SidebarMenuItemProps = LiHTMLAttributes<HTMLLIElement>;

export const SidebarMenuItem = forwardRef<HTMLLIElement, SidebarMenuItemProps>(
  function SidebarMenuItem({ children, className, ...props }, ref) {
    return (
      <li ref={ref} className={cn("bambi-sidebar-menu-item", className)} {...props}>
        {children}
      </li>
    );
  },
);

// ── SidebarMenuButton ──────────────────────────────────────────────────────

export interface SidebarMenuButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  disabled?: boolean;
}

export const SidebarMenuButton = forwardRef<HTMLButtonElement, SidebarMenuButtonProps>(
  function SidebarMenuButton({ children, className, active, disabled, ...props }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        data-active={active || undefined}
        data-disabled={disabled || undefined}
        aria-disabled={disabled || undefined}
        aria-current={active ? "page" : undefined}
        tabIndex={disabled ? -1 : undefined}
        className={cn("bambi-sidebar-menu-button", className)}
        {...props}
      >
        {children}
      </button>
    );
  },
);

// ── SidebarMenuLink ────────────────────────────────────────────────────────

export interface SidebarMenuLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  active?: boolean;
}

export const SidebarMenuLink = forwardRef<HTMLAnchorElement, SidebarMenuLinkProps>(
  function SidebarMenuLink({ children, className, active, ...props }, ref) {
    return (
      <a
        ref={ref}
        data-active={active || undefined}
        aria-current={active ? "page" : undefined}
        className={cn("bambi-sidebar-menu-button", className)}
        {...props}
      >
        {children}
      </a>
    );
  },
);

// ── SidebarRail ────────────────────────────────────────────────────────────

export type SidebarRailProps = HTMLAttributes<HTMLDivElement>;

export const SidebarRail = forwardRef<HTMLDivElement, SidebarRailProps>(
  function SidebarRail({ className, ...props }, ref) {
    const { open, toggleOpen, overlayId } = useSidebar();
    return (
      <div ref={ref} className={cn("bambi-sidebar-rail", className)} {...props}>
        <button
          type="button"
          aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={open}
          aria-controls={overlayId || undefined}
          className="bambi-sidebar-rail-trigger"
          onClick={toggleOpen}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            aria-hidden="true"
          >
            <path
              d={open ? "M7 2L4 5l3 3" : "M3 2l3 3-3 3"}
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    );
  },
);
