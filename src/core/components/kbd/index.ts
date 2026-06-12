import { defineComponent } from "../../define-component";
import { enumProp } from "../../shared";

export const kbdSizes = ["sm", "md", "lg"] as const;

export type KbdSize = (typeof kbdSizes)[number];

export const kbd = defineComponent({
  name: "kbd",
  tag: "kbd",
  root: "data-bambi-kbd",
  props: {
    size: enumProp(kbdSizes, {
      attr: "data-size",
      default: "sm",
    }),
  },
  a11y: {
    description: "Native kbd semantics for keyboard input text.",
  },
  sync(el, props) {
    el.setAttribute("data-size", props.size ?? "sm");
  },
});

export const Kbd = kbd;
export const kbdContract = kbd.contract;
