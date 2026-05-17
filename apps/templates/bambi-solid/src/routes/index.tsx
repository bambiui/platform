import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

export default function Home() {
  return (
    <div>
      bambiui-solid
      <Button variant="secondary">Button</Button>
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
  );
}
