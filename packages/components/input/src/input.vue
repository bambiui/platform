<script setup lang="ts">
import { computed, useAttrs } from "vue";
import { inputRecipe } from "./recipe";
import "./input.css";

defineOptions({ name: "BambiInput", inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    class?: string;
    id?: string;
    /** Marks the input as invalid; sets aria-invalid="true". */
    invalid?: boolean;
    ariaDescribedby?: string;
    ariaInvalid?: string | boolean;
  }>(),
  {
    class: undefined,
    id: undefined,
    invalid: false,
    ariaDescribedby: undefined,
    ariaInvalid: undefined,
  },
);

const attrs = useAttrs();

const cls = computed(() =>
  [inputRecipe.elementClassName, props.class].filter(Boolean).join(" "),
);

const resolvedInvalid = computed<boolean | "grammar" | "spelling" | undefined>(
  () => {
    if (props.ariaInvalid !== undefined) return Boolean(props.ariaInvalid) || undefined;
    return props.invalid ? true : undefined;
  },
);
</script>

<template>
  <input
    v-bind="attrs"
    :id="props.id"
    :class="cls"
    :aria-describedby="props.ariaDescribedby"
    :aria-invalid="resolvedInvalid"
  />
</template>
