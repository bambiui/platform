<script setup lang="ts">
import { Button } from "./components/ui/button";

function goToBambiUI() {
  window.open("https://bambi-ui.felekoglu.dev", "_blank");
}
</script>

<template>
  <Button intent="primary">Hello world</Button>
  <Button intent="secondary" appearance="link" @click="goToBambiUI">go to bambiui</Button>
</template>

<style scoped></style>
