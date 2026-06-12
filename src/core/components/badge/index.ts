import { defineComponent } from "../../define-component";
import { enumProp } from "../../shared";

export const badgeVariants = [
  "default",
  "secondary",
  "outline",
  "danger",
  "success",
  "warning",
] as const;

export const badgeSizes = ["sm", "md", "lg"] as const;

export type BadgeVariant = (typeof badgeVariants)[number];
export type BadgeSize = (typeof badgeSizes)[number];

export const badge = defineComponent({
  name: "badge",
  tag: "span",
  root: "data-bambi-badge",
  props: {
    variant: enumProp(badgeVariants, {
      attr: "data-variant",
      default: "default",
    }),
    size: enumProp(badgeSizes, {
      attr: "data-size",
      default: "sm",
    }),
  },
  a11y: {
    description:
      "Native inline text semantics; consumers can opt into status or live-region semantics when needed.",
  },
  sync(el, props) {
    el.setAttribute("data-variant", props.variant ?? "default");
    el.setAttribute("data-size", props.size ?? "sm");
  },
});

export const Badge = badge;
export const badgeContract = badge.contract;
