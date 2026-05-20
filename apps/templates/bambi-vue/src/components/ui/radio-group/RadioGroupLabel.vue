<script setup lang="ts">
defineOptions({ inheritAttrs: false });




</script>
<template>
  <label
    v-bind="$attrs"
    data-bambi-radio-group-label=""
  >

    <slot />
  </label>
</template>
