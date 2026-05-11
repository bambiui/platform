import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { drawerRecipe } from "./recipe";
import type { DrawerBaseProps, DrawerSide, DrawerSize } from "./types";
import "./drawer.css";

export type {
  DrawerBaseProps,
  DrawerDefaults,
  DrawerSide,
  DrawerSize,
} from "./types";

function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(" ");
}

// ── Focus trap ─────────────────────────────────────────────────────────────

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

function useFocusTrap(ref: React.RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el) return;

    const getFocusable = () => Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = getFocusable();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    const focusable = getFocusable();
    focusable[0]?.focus();
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [active, ref]);
}

// ── Scroll lock ────────────────────────────────────────────────────────────

function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const scrollY = window.scrollY;
    const style = document.body.style;
    const pad = window.innerWidth - document.documentElement.clientWidth;
    style.overflow = "hidden";
    if (pad > 0) style.paddingRight = `${pad}px`;
    return () => {
      style.overflow = "";
      style.paddingRight = "";
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}

// ── Context ────────────────────────────────────────────────────────────────

interface DrawerContextValue {
  open: boolean;
  close: () => void;
  titleId: string;
  descriptionId: string;
  side: DrawerSide;
  size: DrawerSize;
}

const DrawerContext = createContext<DrawerContextValue>({
  open: false,
  close: () => undefined,
  titleId: "",
  descriptionId: "",
  side: "right",
  size: "md",
});

export function useDrawer() {
  return useContext(DrawerContext);
}

// ── DrawerRoot ─────────────────────────────────────────────────────────────

export interface DrawerRootProps extends DrawerBaseProps {
  children: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
}

export function DrawerRoot({
  children,
  side = drawerRecipe.defaults.side,
  size = drawerRecipe.defaults.size,
  defaultOpen = drawerRecipe.defaults.defaultOpen,
  open: controlledOpen,
  closeOnOverlayClick = drawerRecipe.defaults.closeOnOverlayClick,
  onOpenChange,
}: DrawerRootProps) {
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

  const close = useCallback(() => setOpen(false), [setOpen]);

  const baseId = useId();
  const titleId = `${baseId}-title`;
  const descriptionId = `${baseId}-desc`;

  return (
    <DrawerContext.Provider
      value={{ open, close, titleId, descriptionId, side, size }}
    >
      {typeof children === "function"
        ? (children as (ctx: DrawerContextValue) => React.ReactNode)({
            open,
            close,
            titleId,
            descriptionId,
            side,
            size,
          })
        : children}
    </DrawerContext.Provider>
  );
}

// ── DrawerTrigger ──────────────────────────────────────────────────────────

export interface DrawerTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {}

export const DrawerTrigger = forwardRef<HTMLButtonElement, DrawerTriggerProps>(
  function DrawerTrigger({ children, onClick, ...props }, ref) {
    const { open, close } = useDrawer();
    const triggerRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
      if (!open) triggerRef.current?.focus();
    }, [open]);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
    };

    return (
      <button
        ref={(node) => {
          (triggerRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
        }}
        type="button"
        aria-expanded={open}
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    );
  },
);

// ── DrawerPortal ───────────────────────────────────────────────────────────

export interface DrawerPortalProps {
  children: React.ReactNode;
  container?: Element | null;
}

export function DrawerPortal({ children, container }: DrawerPortalProps) {
  const target = container ?? (typeof document !== "undefined" ? document.body : null);
  if (!target) return null;
  return createPortal(children, target);
}

// ── DrawerOverlay ──────────────────────────────────────────────────────────

export interface DrawerOverlayProps extends HTMLAttributes<HTMLDivElement> {}

export const DrawerOverlay = forwardRef<HTMLDivElement, DrawerOverlayProps>(
  function DrawerOverlay({ className, onClick, ...props }, ref) {
    const { open, close, side, size } = useDrawer();
    const state = open ? "open" : "closed";
    return (
      <div
        ref={ref}
        className={cn("bambi-drawer-overlay", className)}
        data-state={state}
        data-side={side}
        data-size={size}
        aria-hidden="true"
        onClick={(e) => {
          onClick?.(e);
          close();
        }}
        {...props}
      />
    );
  },
);

// ── DrawerContent ──────────────────────────────────────────────────────────

export interface DrawerContentProps extends HTMLAttributes<HTMLDivElement> {}

export const DrawerContent = forwardRef<HTMLDivElement, DrawerContentProps>(
  function DrawerContent({ children, className, ...props }, ref) {
    const { open, close, titleId, descriptionId, side, size } = useDrawer();
    const contentRef = useRef<HTMLDivElement>(null);
    const state = open ? "open" : "closed";

    useFocusTrap(contentRef, open);
    useScrollLock(open);

    useEffect(() => {
      if (!open) return;
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") close();
      };
      document.addEventListener("keydown", onKeyDown);
      return () => document.removeEventListener("keydown", onKeyDown);
    }, [open, close]);

    useEffect(() => {
      const el = contentRef.current;
      if (!el) return;
      const siblings = Array.from(document.body.children).filter(
        (c) => c !== el && !el.contains(c),
      );
      if (open) {
        siblings.forEach((s) => s.setAttribute("inert", ""));
      } else {
        siblings.forEach((s) => s.removeAttribute("inert"));
      }
      return () => {
        siblings.forEach((s) => s.removeAttribute("inert"));
      };
    }, [open]);

    return (
      <div
        ref={(node) => {
          (contentRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        data-state={state}
        data-side={side}
        data-size={size}
        className={cn("bambi-drawer-content", className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);

// ── DrawerHeader ───────────────────────────────────────────────────────────

export interface DrawerHeaderProps extends HTMLAttributes<HTMLDivElement> {}

export const DrawerHeader = forwardRef<HTMLDivElement, DrawerHeaderProps>(
  function DrawerHeader({ children, className, ...props }, ref) {
    return (
      <div ref={ref} className={cn("bambi-drawer-header", className)} {...props}>
        {children}
      </div>
    );
  },
);

// ── DrawerTitle ────────────────────────────────────────────────────────────

export interface DrawerTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

export const DrawerTitle = forwardRef<HTMLHeadingElement, DrawerTitleProps>(
  function DrawerTitle({ children, className, ...props }, ref) {
    const { titleId } = useDrawer();
    return (
      <h2 ref={ref} id={titleId} className={cn("bambi-drawer-title", className)} {...props}>
        {children}
      </h2>
    );
  },
);

// ── DrawerDescription ──────────────────────────────────────────────────────

export interface DrawerDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

export const DrawerDescription = forwardRef<HTMLParagraphElement, DrawerDescriptionProps>(
  function DrawerDescription({ children, className, ...props }, ref) {
    const { descriptionId } = useDrawer();
    return (
      <p
        ref={ref}
        id={descriptionId}
        className={cn("bambi-drawer-description", className)}
        {...props}
      >
        {children}
      </p>
    );
  },
);

// ── DrawerBody ─────────────────────────────────────────────────────────────

export interface DrawerBodyProps extends HTMLAttributes<HTMLDivElement> {}

export const DrawerBody = forwardRef<HTMLDivElement, DrawerBodyProps>(
  function DrawerBody({ children, className, ...props }, ref) {
    return (
      <div ref={ref} className={cn("bambi-drawer-body", className)} {...props}>
        {children}
      </div>
    );
  },
);

// ── DrawerFooter ───────────────────────────────────────────────────────────

export interface DrawerFooterProps extends HTMLAttributes<HTMLDivElement> {}

export const DrawerFooter = forwardRef<HTMLDivElement, DrawerFooterProps>(
  function DrawerFooter({ children, className, ...props }, ref) {
    return (
      <div ref={ref} className={cn("bambi-drawer-footer", className)} {...props}>
        {children}
      </div>
    );
  },
);

// ── DrawerClose ────────────────────────────────────────────────────────────

export interface DrawerCloseProps extends ButtonHTMLAttributes<HTMLButtonElement> {}

export const DrawerClose = forwardRef<HTMLButtonElement, DrawerCloseProps>(
  function DrawerClose({ children, className, onClick, ...props }, ref) {
    const { close } = useDrawer();
    return (
      <button
        ref={ref}
        type="button"
        aria-label="Close"
        className={cn("bambi-drawer-close", className)}
        onClick={(e) => {
          onClick?.(e);
          close();
        }}
        {...props}
      >
        {children ?? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M12 4L4 12M4 4l8 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>
    );
  },
);
