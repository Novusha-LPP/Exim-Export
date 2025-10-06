import { defineConfig, transformWithEsbuild } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    {
      name: "treat-js-files-as-jsx",
      async transform(code, id) {
        if (!id.endsWith(".js")) return null;
        return transformWithEsbuild(code, id, {
          loader: "jsx",
          jsx: "automatic",
        });
      },
    },
    react(),
  ],
    define: {
    global: 'window',
  },
  optimizeDeps: {
    force: true,
    esbuildOptions: {
      loader: { ".js": "jsx" },
    },
  },
});
