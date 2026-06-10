import { defineConfig } from "vite";

export default defineConfig({
  build: {
    emptyOutDir: true,
    lib: {
      entry: "src/cli/index.ts",
      formats: ["es"],
      fileName: () => "index.js",
    },
    outDir: "dist-cli",
    rollupOptions: {
      external: [/^node:/],
      output: {
        banner: "#!/usr/bin/env node",
      },
      treeshake: false,
    },
    target: "node20",
  },
});
