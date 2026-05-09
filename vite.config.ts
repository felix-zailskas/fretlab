import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // App is served at the root of fretlab.studio. The legacy
  // felix-zailskas.github.io/fretlab/ URL is handled by a meta-refresh
  // redirect in public/fretlab/index.html so existing bookmarks still
  // land on the right page after GitHub Pages forwards the host.
});
