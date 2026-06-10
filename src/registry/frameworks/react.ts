import type {
  ParsedComponent,
  ParsedPart,
} from "../../generator/parse-component";
import type {
  RegistryFrameworkArtifactContext,
  RegistryFrameworkArtifacts,
  RegistryGeneratedFile,
} from "../types";
import {
  behaviorOptionsObject,
  behaviorUpdateObject,
  componentBehaviorExportName,
  componentFileStem,
  componentModuleImport,
  componentPropInterfaceName,
  componentStyleImport,
  partComponentName,
  partPropInterfaceName,
  propDefaultsDestructure,
  propLines,
  reactPartAttributeLines,
  reactRootAttributeLines,
  reactRootObjectAttributeLines,
  rootComponentName,
  selectedParsedComponents,
} from "./shared";

function createUseBambiSource(): string {
  return `import { useEffect, useRef, type DependencyList, type RefObject } from "react";
import { autoInit, destroyAll } from "../auto-init";

export function useBambi<T extends HTMLElement>(
  deps: DependencyList = [],
): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const root = ref.current ?? document;
    autoInit(root);

    return () => {
      destroyAll(root);
    };
  }, deps);

  return ref;
}
`;
}

function createAttrsSource(components: ParsedComponent[]): string {
  return components
    .map((component) => {
      const optionsName = `${rootComponentName(component)}AttrsOptions`;
      const functionName = `${component.name}Attrs`;
      const props = propLines(component);
      const attrLines = reactRootObjectAttributeLines(component);

      return `export interface ${optionsName} {
${props}
}

export function ${functionName}(options: ${optionsName} = {}) {
  return {
${attrLines}
  };
}
`;
    })
    .join("\n");
}

function createPartSource(
  component: ParsedComponent,
  part: ParsedPart,
): string {
  const name = partComponentName(component, part);
  const propsName = partPropInterfaceName(component, part);

  return `
export interface ${propsName} extends HTMLAttributes<HTMLElement> {}

export const ${name} = forwardRef<HTMLElement, ${propsName}>(
  function ${name}(props, forwardedRef) {
    return (
      <${part.tag}
        {...props}
        ref={forwardedRef as never}
${reactPartAttributeLines(part)}
      />
    );
  },
);
`;
}

function createComponentSource(component: ParsedComponent): string {
  const name = rootComponentName(component);
  const propsName = componentPropInterfaceName(component);
  const behavior = componentBehaviorExportName(component);
  const defaults = propDefaultsDestructure(component);
  const behaviorOptions = behaviorOptionsObject(component);
  const behaviorUpdate = behaviorUpdateObject(component);
  const parts = component.parts
    .filter((part) => part.name !== "root")
    .map((part) => createPartSource(component, part))
    .join("\n");

  return `import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { ${behavior} } from "${componentModuleImport(component)}";
import "${componentStyleImport(component)}";

export interface ${propsName} extends HTMLAttributes<HTMLElement> {
${propLines(component)}
  children?: ReactNode;
}

export const ${name} = forwardRef<HTMLElement, ${propsName}>(
  function ${name}(
    {
      ${defaults}${defaults ? "," : ""}
      children,
      ...props
    },
    forwardedRef,
  ) {
    const localRef = useRef<HTMLElement | null>(null);
    const instanceRef = useRef<ReturnType<typeof ${behavior}.mount> | null>(null);

    useImperativeHandle(
      forwardedRef,
      () => localRef.current as HTMLElement,
      [],
    );

    useEffect(() => {
      const element = localRef.current;
      if (!element) return;

      const instance = ${behavior}.mount(element, {
${behaviorOptions}
      });
      instanceRef.current = instance;

      return () => {
        instance.destroy();
        instanceRef.current = null;
      };
    }, []);

    useEffect(() => {
      instanceRef.current?.update({
${behaviorUpdate}
      });
    }, [${component.props.map((prop) => prop.name).join(", ")}]);

    return (
      <${component.tag}
        {...props}
        ref={localRef as never}
${reactRootAttributeLines(component)}
      >
        {children}
      </${component.tag}>
    );
  },
);
${parts}`;
}

export const reactFramework: RegistryFrameworkArtifacts = {
  generateFiles(context: RegistryFrameworkArtifactContext) {
    const components = selectedParsedComponents(context);

    return [
      {
        target: "react/use-bambi.ts",
        content: createUseBambiSource(),
        managed: true,
      },
      {
        target: "react/attrs.ts",
        content: createAttrsSource(components),
        managed: true,
      },
      ...components.map(
        (component): RegistryGeneratedFile => ({
          target: `react/${componentFileStem(component)}.tsx`,
          content: createComponentSource(component),
        }),
      ),
    ];
  },
  getImportHint({ component, outDir }) {
    const rootName = rootComponentName(component.parsed);
    const partNames = component.parsed.parts
      .filter((part) => part.name !== "root")
      .map((part) => partComponentName(component.parsed, part));
    const imports = [rootName, ...partNames].join(", ");

    return `import { ${imports} } from "./${outDir}/react/${componentFileStem(component.parsed)}";`;
  },
};
