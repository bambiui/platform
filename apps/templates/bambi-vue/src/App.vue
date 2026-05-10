<script setup lang="ts">
import { Button } from "./components/ui/button";

function goToBambiui() {
  window.open("https://bambiui.com", "_blank");
}
</script>

<template>
  <Button intent="primary">Hello world</Button>
  <Button intent="secondary" appearance="link" @click="goToBambiui">go to bambiui</Button>
</template>

<style scoped></style>
