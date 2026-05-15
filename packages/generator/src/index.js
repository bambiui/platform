import { createReactArtifact } from "./react/index.js";

// Returns { content: string, usedHelpers: string[] }
export function createArtifact(options) {
  switch (options.framework) {
    case "react":
      return createReactArtifact(options);
    default:
      throw new Error(`No generator registered for framework "${options.framework}".`);
  }
}
