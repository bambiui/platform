import {
  forwardRef,
  type AnchorHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { cardRecipe } from "./recipe";
import type { CardBaseProps } from "./types";
import "./card.css";

export type { CardBaseProps, CardDefaults, CardSize, CardVariant } from "./types";

function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(" ");
}

// ── Card root ──────────────────────────────────────────────────────────────

export interface CardProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title">,
    Omit<CardBaseProps, "title" | "description" | "header" | "footer" | "actions"> {
  title?: ReactNode;
  description?: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  actions?: ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    children,
    className,
    variant = cardRecipe.defaults.variant,
    size = cardRecipe.defaults.size,
    interactive = cardRecipe.defaults.interactive,
    title,
    description,
    header,
    footer,
    actions,
    ...props
  },
  ref,
) {
  const hasHeader = header !== undefined || title !== undefined || description !== undefined;
  const hasFooter = footer !== undefined || actions !== undefined;

  return (
    <div
      ref={ref}
      data-variant={variant}
      data-size={size}
      data-interactive={interactive || undefined}
      className={cn(cardRecipe.className, className)}
      {...props}
    >
      {hasHeader && (
        <CardHeader>
          {header ?? (
            <>
              {title !== undefined && <CardTitle>{title}</CardTitle>}
              {description !== undefined && (
                <CardDescription>{description}</CardDescription>
              )}
            </>
          )}
        </CardHeader>
      )}
      {hasHeader || hasFooter ? <CardContent>{children}</CardContent> : children}
      {hasFooter && <CardFooter>{footer ?? actions}</CardFooter>}
    </div>
  );
});

// ── CardLink – interactive card rendered as <a> ────────────────────────────

export interface CardLinkProps
  extends AnchorHTMLAttributes<HTMLAnchorElement>,
    Omit<CardBaseProps, "interactive" | "title" | "description" | "header" | "footer" | "actions"> {}

export const CardLink = forwardRef<HTMLAnchorElement, CardLinkProps>(function CardLink(
  {
    children,
    className,
    variant = cardRecipe.defaults.variant,
    size = cardRecipe.defaults.size,
    ...props
  },
  ref,
) {
  return (
    <a
      ref={ref}
      data-variant={variant}
      data-size={size}
      data-interactive
      className={cn(cardRecipe.className, className)}
      {...props}
    >
      {children}
    </a>
  );
});

// ── CardHeader ─────────────────────────────────────────────────────────────

export type CardHeaderProps = HTMLAttributes<HTMLDivElement>;

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(function CardHeader(
  { children, className, ...props },
  ref,
) {
  return (
    <div ref={ref} className={cn("bambi-card-header", className)} {...props}>
      {children}
    </div>
  );
});

// ── CardTitle ──────────────────────────────────────────────────────────────

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(function CardTitle(
  { children, className, as: Tag = "h3", ...props },
  ref,
) {
  return (
    <Tag ref={ref} className={cn("bambi-card-title", className)} {...props}>
      {children}
    </Tag>
  );
});

// ── CardDescription ────────────────────────────────────────────────────────

export type CardDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  function CardDescription({ children, className, ...props }, ref) {
    return (
      <p ref={ref} className={cn("bambi-card-description", className)} {...props}>
        {children}
      </p>
    );
  },
);

// ── CardContent ────────────────────────────────────────────────────────────

export type CardContentProps = HTMLAttributes<HTMLDivElement>;

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(function CardContent(
  { children, className, ...props },
  ref,
) {
  return (
    <div ref={ref} className={cn("bambi-card-content", className)} {...props}>
      {children}
    </div>
  );
});

// ── CardFooter ─────────────────────────────────────────────────────────────

export type CardFooterProps = HTMLAttributes<HTMLDivElement>;

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(function CardFooter(
  { children, className, ...props },
  ref,
) {
  return (
    <div ref={ref} className={cn("bambi-card-footer", className)} {...props}>
      {children}
    </div>
  );
});
