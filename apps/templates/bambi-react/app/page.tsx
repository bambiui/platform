"use client";
import { Button } from "@/src/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/src/components/ui/tabs";
export default function Home() {
  return (
    <div>
      bambiui-next
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
