import type { ParsedComponent } from "../../generator/parse-component";
import type { RegistryFrameworkArtifacts } from "../types";
import {
  behaviorOptionsObject,
  behaviorUpdateObject,
  componentBehaviorExportName,
  componentFileStem,
  componentModuleImport,
  componentPropInterfaceName,
  componentStyleImport,
  generatedComponentFiles,
  propLines,
  rootComponentName,
  solidRootAttributeLines,
} from "./shared";

function createComponentSource(component: ParsedComponent): string {
  const name = rootComponentName(component);
  const propsName = componentPropInterfaceName(component);
  const behavior = componentBehaviorExportName(component);

  const behaviorOptions = behaviorOptionsObject(component).replace(
    /([a-zA-Z_$][\w$]*),/g,
    "$1: $1(),",
  );
  const behaviorUpdate = behaviorUpdateObject(component).replace(
    /([a-zA-Z_$][\w$]*),/g,
    "$1: $1(),",
  );

  return `import { createEffect, onCleanup, onMount, splitProps, type JSX } from "solid-js";
import { ${behavior} } from "${componentModuleImport(component)}";
import "${componentStyleImport(component)}";

export interface ${propsName}
  extends JSX.HTMLAttributes<HTMLElement> {
${propLines(component)}
}

export function ${name}(props: ${propsName}) {
  const [local, rest] = splitProps(props, [
    ${component.props.map((prop) => JSON.stringify(prop.name)).join(",\n    ")}
  ]);
  let element!: HTMLElement;
  let instance: ReturnType<typeof ${behavior}.mount> | undefined;
  ${component.props
    .map(
      (prop) =>
        `const ${prop.name} = () => local.${prop.name} ?? ${prop.defaultValue === undefined ? "undefined" : JSON.stringify(prop.defaultValue)};`,
    )
    .join("\n  ")}

  onMount(() => {
    instance = ${behavior}.mount(element, {
${behaviorOptions}
    });
  });

  createEffect(() => {
    instance?.update({
${behaviorUpdate}
    });
  });

  onCleanup(() => {
    instance?.destroy();
  });

  return (
    <${component.tag}
      {...rest}
      ref={element}
${solidRootAttributeLines(component)}
    />
  );
}
`;
}

export const solidFramework: RegistryFrameworkArtifacts = {
  generateFiles(context) {
    return generatedComponentFiles(context, (component) => ({
      target: `solid/${componentFileStem(component)}.tsx`,
      content: createComponentSource(component),
    }));
  },
  getImportHint({ component, outDir }) {
    return `import { ${rootComponentName(component.parsed)} } from "./${outDir}/solid/${componentFileStem(component.parsed)}";`;
  },
};
