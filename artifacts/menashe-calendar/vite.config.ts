import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT ?? "5000";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? "";

const apiTarget = process.env.API_URL ?? "http://localhost:8080";

export default defineConfig({
  base: basePath,
  define: {
    "import.meta.env.VITE_CLERK_PUBLISHABLE_KEY": JSON.stringify(
      process.env.VITE_CLERK_PUBLISHABLE_KEY ?? process.env.CLERK_PUBLISHABLE_KEY ?? "",
    ),
  },
  plugins: [
    react(),
    tailwindcss({ optimize: false }),
    runtimeErrorOverlay(),
    // Force full-page reload for large files where HMR corrupts React state.
    {
      name: "full-reload-large-modules",
      handleHotUpdate({ file, server }) {
        if (
          file.includes("Home.tsx") ||
          file.includes("translations.ts")
        ) {
          server.ws.send({ type: "full-reload" });
          return [];
        }
      },
    },
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
          // Strip "data-component-name" injected by cartographer from R3F/Three.js
          // scene files. R3F 9.x parses hyphenated props as nested paths — it
          // tries obj.data["component-name"] = value and throws a TypeError when
          // the Three.js object's .data field is not a plain object.
          {
            name: "strip-r3f-cartographer-data-props",
            enforce: "post" as const,
            transform(code: string, id: string) {
              if (!id.includes("/scene/") && !id.includes("MemorialValley3D")) return;
              const cleaned = code.replace(/"data-component-name":\s*"[^"]*",?\s*/g, "");
              if (cleaned === code) return;
              return { code: cleaned, map: null };
            },
          },
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Three.js ecosystem — only loaded when Memorial Sanctuary opens
          if (
            id.includes("/three/") ||
            id.includes("/@react-three/") ||
            id.includes("/postprocessing/") ||
            id.includes("/@react-spring/three")
          ) return "vendor-three";

          // Clerk auth — large but needed before first paint on auth routes
          if (id.includes("/@clerk/")) return "vendor-clerk";

          // Framer Motion — animation library
          if (id.includes("/framer-motion/")) return "vendor-motion";

          // React core + DOM — kept together so they share a single scope
          if (
            id.includes("/react-dom/") ||
            id.includes("/react/") ||
            id.includes("/scheduler/")
          ) return "vendor-react";

          // Hebrew calendar
          if (id.includes("/@hebcal/")) return "vendor-hebcal";

          // Lucide icons — large icon set
          if (id.includes("/lucide-react/")) return "vendor-lucide";

          // Radix UI primitives
          if (id.includes("/@radix-ui/")) return "vendor-radix";
        },
      },
    },
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
    fs: {
      strict: false,
    },
    proxy: {
      "/api": {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
