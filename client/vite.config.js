import { defineConfig, transformWithEsbuild } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

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
    tailwindcss(),  // Add Tailwind CSS Vite plugin here
  ],
  define: {
    global: "window",
  },
  optimizeDeps: {
    force: true,
    esbuildOptions: {
      loader: { ".js": "jsx" },
    },
  },
});
