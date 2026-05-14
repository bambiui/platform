<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from "vue";
import { TabsController } from "./tabs.controller";
import type { TabsOptions } from "./tabs.controller";

interface Props extends Omit<TabsOptions, "onValueChange"> {
  class?: string;
  modelValue?: string;
}

const props = withDefaults(defineProps<Props>(), {
  orientation: "horizontal",
});

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "valueChange", value: string): void;
}>();

const rootEl = ref<HTMLDivElement | null>(null);
let controller: TabsController | null = null;

const isControlled = computed(() => props.modelValue !== undefined || props.controlled);

onMounted(() => {
  if (!rootEl.value) return;
  controller = new TabsController(rootEl.value, {
    value: props.modelValue ?? props.value,
    defaultValue: props.defaultValue,
    controlled: isControlled.value,
    orientation: props.orientation,
    disabled: props.disabled,
    onValueChange: (value) => {
      emit("update:modelValue", value);
      emit("valueChange", value);
    },
  });
  controller.sync();
});

onUnmounted(() => {
  controller?.destroy();
  controller = null;
});

watch(
  () => [props.modelValue, props.value, props.disabled, props.orientation] as const,
  ([modelValue, value, disabled, orientation]) => {
    controller?.update({ value: modelValue ?? value, disabled, orientation });
  },
);
</script>

<template>
  <div
    ref="rootEl"
    data-bambi-tabs
    :data-orientation="orientation"
    :data-controlled="isControlled ? 'true' : 'false'"
    :class="props.class"
  >
    <slot />
  </div>
</template>
