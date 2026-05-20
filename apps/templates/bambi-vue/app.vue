<script setup lang="ts">
import { Button } from "./src/components/ui/button";
import {
  RadioGroup,
  RadioGroupIndicator,
  RadioGroupItem,
  RadioGroupLabel,
} from "./src/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./src/components/ui/tabs";
</script>

<template>
  <div>
    bambiui-vue
    <Button variant="secondary">Button</Button>
    <Tabs default-value="password">
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
    <RadioGroup default-value="comfortable" name="density">
      <RadioGroupItem value="compact">
        <RadioGroupIndicator />
        <RadioGroupLabel>Compact</RadioGroupLabel>
      </RadioGroupItem>
      <RadioGroupItem value="comfortable">
        <RadioGroupIndicator />
        <RadioGroupLabel>Comfortable</RadioGroupLabel>
      </RadioGroupItem>
    </RadioGroup>
  </div>
</template>
