<script setup lang="ts">
defineOptions({ inheritAttrs: false });




</script>
<template>
  <span
    v-bind="$attrs"
    data-bambi-radio-group-indicator=""
  >

    <slot />
  </span>
</template>
