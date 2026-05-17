<script lang="ts">
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
</script>

<div>
  bambiui-svelte
  <Button variant="secondary">Button</Button>
  <Tabs defaultValue="password">
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
