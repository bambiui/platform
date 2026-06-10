import "./style.css";
import { autoInit } from "./runtime";

const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = `
<section>
  <div>
    <h1>Bambi Vanilla</h1>
    <p>Markup-first, token-based, a11y-aware UI behavior kit.</p>
  </div>

  <div id="button-demo">
    <h2>Button</h2>
      <button data-bambi-button data-variant="primary" data-size="sm">Small</button>
      <button data-bambi-button data-variant="primary" data-size="md">Medium</button>
      <button data-bambi-button data-variant="primary" data-size="lg">Large</button>
      <button data-bambi-button data-variant="secondary" data-size="icon" aria-label="Add item">+</button>
      <button data-bambi-button data-variant="outline" data-disabled="true">Disabled</button>
      <button data-bambi-button data-variant="primary" data-loading="true">Loading</button>
      <a data-bambi-button data-variant="ghost" href="https://vite.dev/" target="_blank" rel="noreferrer">Link Button</a>
  </div>

    <h2>Tabs</h2>
    <div data-bambi-tabs data-default-value="preview" id="markup-first-tabs">
      <div data-bambi-tabs-list>
        <button data-bambi-tabs-trigger data-value="preview">Preview</button>
        <button data-bambi-tabs-trigger data-value="code">Code</button>
        <button data-bambi-tabs-trigger data-value="disabled" data-disabled="true" disabled>Disabled</button>
      </div>
      <div data-bambi-tabs-content data-value="preview">Markup-first component authoring.</div>
      <div data-bambi-tabs-content data-value="code">Import CSS and call autoInit, or use the browser script.</div>
      <div data-bambi-tabs-content data-value="disabled">This tab is disabled and should not be reachable.</div>
    </div>
</section>
`;

document.addEventListener("bambi:value-change", (event) => {
  console.log("tabs value change", (event as CustomEvent).detail);
});

autoInit();
