import { createReactArtifact } from "./react/index.js";
import { createSolidArtifact } from "./solid/index.js";
import { createSvelteArtifact } from "./svelte/index.js";
import { createVueArtifact } from "./vue/index.js";

// Returns { files: Record<string, string>, usedHelpers: string[] }
export function createArtifact(options) {
  switch (options.framework) {
    case "react":
      return createReactArtifact(options);
    case "solid":
      return createSolidArtifact(options);
    case "svelte":
      return createSvelteArtifact(options);
    case "vue":
      return createVueArtifact(options);
    default:
      throw new Error(`No generator registered for framework "${options.framework}".`);
  }
}
