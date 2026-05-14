<script setup lang="ts">
defineProps<{ class?: string }>();
</script>

<template>
  <div role="tablist" data-bambi-tabs-list :class="$props.class">
    <slot />
  </div>
</template>
