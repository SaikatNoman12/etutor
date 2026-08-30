import path from "path"
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: {
    // Bind the pipeline-assigned port (PORT env), on ALL interfaces. `host: true`
    // is essential: without it vite binds only localhost → IPv6 [::1], and the
    // pipeline's 127.0.0.1 (IPv4) health checks get connection-refused (frontend=000).
    port: Number(process.env.PORT) || 5173,
    host: true,
    strictPort: false,
  },
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./app"),
    },
  },
});
