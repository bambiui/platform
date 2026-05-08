import { Button } from "./components/ui/button/button";

export default function App() {
  return (
    <main className="page">
      <section className="panel">
        <p className="eyebrow">CLI smoke test</p>
        <h1>Bambi UI React install</h1>
        <p className="copy">
          The button below was installed into this app from the Bambi UI CLI source registry.
        </p>
        <div className="actions">
          <Button intent="primary">Primary action</Button>
          <Button appearance="outline">Secondary action</Button>
        </div>
      </section>
    </main>
  );
}
