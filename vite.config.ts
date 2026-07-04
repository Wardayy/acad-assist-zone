import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

export default defineConfig({
  vite: {
    plugins: [
      // Only override the preset when actually building on Vercel.
      // Otherwise Lovable's own preview build (which expects Cloudflare) breaks.
      ...(process.env.VERCEL
        ? [
            nitro({
              preset: "vercel",
            }),
          ]
        : []),
    ],
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
