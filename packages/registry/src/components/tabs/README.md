# Tabs

Tabs follows the DOM Protocol model internally. The public CLI artifact is a self-contained React implementation generated under `packages/registry/generated/tabs/react/`.

## Usage

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";

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

- `value`: controlled active tab value. Change events fire, and the host updates `value`.
- `defaultValue`: uncontrolled initial tab value. The component updates `data-value` after user interaction.
- `onValueChange`: called with the full event detail object.
- `activationMode`: `"automatic"` activates on arrow-key focus; `"manual"` waits for Enter or Space.
- `orientation`: `"horizontal"` or `"vertical"` keyboard direction and ARIA orientation.
