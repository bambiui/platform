# Tabs

Tabs follows the DOM Protocol model: React props become `data-*` attributes, and `TabsController` owns behavior and ARIA sync.

## Usage

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs/tabs";

export function Example() {
  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">Overview content</TabsContent>
      <TabsContent value="settings">Settings content</TabsContent>
    </Tabs>
  );
}
```

## Controlled State

```tsx
const [tab, setTab] = useState("overview");

<Tabs value={tab} onValueChange={(detail) => setTab(detail.value)}>
  ...
</Tabs>;
```

`onValueChange` receives `{ value, previousValue, source }`.

- `value`: next tab value.
- `previousValue`: previously active value, or `null` before selection.
- `source`: `"click"` or `"keyboard"`.

## Props

- `value`: controlled active tab value. The controller dispatches change events but does not mutate `data-value`.
- `defaultValue`: uncontrolled initial tab value. The controller updates `data-value` after user interaction.
- `onValueChange`: called with the full event detail object.
- `activationMode`: `"automatic"` activates on arrow-key focus; `"manual"` waits for Enter or Space.
- `orientation`: `"horizontal"` or `"vertical"` keyboard direction and ARIA orientation.
