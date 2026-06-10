import type { ParsedComponent } from "../../generator/parse-component";
import type { RegistryFrameworkArtifacts } from "../types";
import {
  behaviorOptionsObject,
  behaviorUpdateObject,
  componentBehaviorExportName,
  componentModuleImport,
  componentStyleImport,
  generatedComponentFiles,
  propDefaultsDestructure,
  sfcFileStem,
  sveltePropInterface,
} from "./shared";

function svelteAttributeLines(component: ParsedComponent): string {
  const lines = [`  ${component.rootAttr}=""`];

  for (const prop of component.props) {
    if (!prop.attr) continue;
    if (prop.type === "boolean") {
      lines.push(`  ${prop.attr}={${prop.name} ? "true" : undefined}`);
    } else {
      lines.push(`  ${prop.attr}={${prop.name}}`);
    }
  }

  return lines.join("\n");
}

function createComponentSource(component: ParsedComponent): string {
  const behavior = componentBehaviorExportName(component);
  const defaults = propDefaultsDestructure(component);
  const behaviorOptions = behaviorOptionsObject(component).replace(
    /^ {8}/gm,
    "    ",
  );
  const behaviorUpdate = behaviorUpdateObject(component).replace(
    /^ {8}/gm,
    "    ",
  );

  return `<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { ${behavior} } from "${componentModuleImport(component)}";
  import "${componentStyleImport(component)}";

  ${sveltePropInterface(component)}

  let {
    ${defaults}${defaults ? "," : ""}
    children,
    ...rest
  }: Props = $props();

  let element: HTMLElement;
  let instance: ReturnType<typeof ${behavior}.mount> | undefined;

  $effect(() => {
    instance?.update({
${behaviorUpdate}
    });
  });

  onMount(() => {
    instance = ${behavior}.mount(element, {
${behaviorOptions}
    });
  });

  onDestroy(() => {
    instance?.destroy();
  });
</script>

<${component.tag}
  {...rest}
  bind:this={element}
${svelteAttributeLines(component)}
>
  {@render children?.()}
</${component.tag}>
`;
}

export const svelteFramework: RegistryFrameworkArtifacts = {
  generateFiles(context) {
    return generatedComponentFiles(context, (component) => ({
      target: `svelte/${sfcFileStem(component)}.svelte`,
      content: createComponentSource(component),
    }));
  },
  getImportHint({ component, outDir }) {
    return `import ${sfcFileStem(component.parsed)} from "./${outDir}/svelte/${sfcFileStem(component.parsed)}.svelte";`;
  },
};
