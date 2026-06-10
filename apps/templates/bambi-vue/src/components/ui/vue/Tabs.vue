<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { tabs } from "../components/tabs";
import "../styles/tabs.css";

interface Props {
  value?: string;
  defaultValue?: string;
  orientation?: "horizontal" | "vertical";
  activationMode?: "automatic" | "manual";
}

const props = withDefaults(defineProps<Props>(),
  {
    orientation: "horizontal",
    activationMode: "automatic",
  });
const element = ref<HTMLElement | null>(null);
let instance: ReturnType<typeof tabs.mount> | undefined;

function sync() {
  instance?.update({
    value: props.value,
    defaultValue: props.defaultValue,
    orientation: props.orientation,
    activationMode: props.activationMode,
  });
}

onMounted(() => {
  if (!element.value) return;
  instance = tabs.mount(element.value, {
    value: props.value,
    defaultValue: props.defaultValue,
    orientation: props.orientation,
    activationMode: props.activationMode,
  });
});

watch(
  () => [props.value, props.defaultValue, props.orientation, props.activationMode],
  sync,
);

onBeforeUnmount(() => {
  instance?.destroy();
});
</script>

<template>
  <div
    ref="element"
    data-bambi-tabs=""
    :data-value="props.value"
    :data-default-value="props.defaultValue"
    :data-orientation="props.orientation"
    :data-activation-mode="props.activationMode"
  >
    <slot />
  </div>
</template>
