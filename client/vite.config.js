import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: "automatic",
      include: /\.jsx?$/, // include .js and .jsx files for JSX transformation
    }),
  ],
});
