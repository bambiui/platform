<script setup lang="ts">
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
</script>

<template>
  <div>
    bambiui-vue
    <Tabs default-value="account">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <p>Account content</p>
      </TabsContent>
      <TabsContent value="password">
        <p>Password content</p>
      </TabsContent>
    </Tabs>
  </div>
</template>
