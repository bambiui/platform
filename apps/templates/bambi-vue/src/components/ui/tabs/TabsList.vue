<script setup lang="ts">
defineOptions({ inheritAttrs: false });


</script>
<template>
  <div
    data-bambi-tabs-list=""
    v-bind="$attrs"
  >
    <slot />
  </div>
</template>
