import { Button } from "./components/ui/solid/button";
import { Tabs } from "./components/ui/solid/tabs";
import "./styles/bambi.css";

export function App() {
  return (
    <Tabs defaultValue="one">
      <Button>Button</Button>
    </Tabs>
  );
}
