<script>
  import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs/tabs";
</script>

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
