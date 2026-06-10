import { Button } from "./components/ui/react/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/react/tabs";
import "./styles/bambi.css";

export function App() {
  return (
    <Tabs defaultValue="one">
      <TabsList>
        <TabsTrigger value="one">One</TabsTrigger>
      </TabsList>
      <TabsContent value="one">
        <Button>Button</Button>
      </TabsContent>
    </Tabs>
  );
}
