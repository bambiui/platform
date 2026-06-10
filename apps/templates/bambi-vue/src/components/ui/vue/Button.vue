<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { button } from "../components/button";
import "../styles/button.css";

interface Props {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success" | "warning";
  size?: "sm" | "md" | "lg" | "icon";
  disabled?: boolean;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(),
  {
    variant: "primary",
    size: "md",
  });
const element = ref<HTMLElement | null>(null);
let instance: ReturnType<typeof button.mount> | undefined;

function sync() {
  instance?.update({
    variant: props.variant,
    size: props.size,
    disabled: props.disabled,
    loading: props.loading,
  });
}

onMounted(() => {
  if (!element.value) return;
  instance = button.mount(element.value, {
    variant: props.variant,
    size: props.size,
    disabled: props.disabled,
    loading: props.loading,
  });
});

watch(
  () => [props.variant, props.size, props.disabled, props.loading],
  sync,
);

onBeforeUnmount(() => {
  instance?.destroy();
});
</script>

<template>
  <button
    ref="element"
    data-bambi-button=""
    :data-variant="props.variant"
    :data-size="props.size"
    :data-disabled="props.disabled ? 'true' : undefined"
    :data-loading="props.loading ? 'true' : undefined"
  >
    <slot />
  </button>
</template>
