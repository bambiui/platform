import { Button } from "../components/ui/button";
import {
  RadioGroup,
  RadioGroupIndicator,
  RadioGroupItem,
  RadioGroupLabel,
} from "../components/ui/radio-group";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";

export default function Home() {
  return (
    <div>
      bambiui-solid
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
      <RadioGroup defaultValue="comfortable" name="density">
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
  );
}
