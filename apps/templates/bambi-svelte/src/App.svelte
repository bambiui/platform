<script lang="ts">
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
</script>

<div>
  bambiui-svelte
  <Tabs defaultValue="account">
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
