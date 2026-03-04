import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ChronoSync",
    short_name: "ChronoSync",
    description: "Optimización circadiana personalizada con IA. Duerme mejor, rinde más.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#6366f1",
    lang: "es",
    orientation: "portrait",
    categories: ["health", "lifestyle", "utilities"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/favicon.ico",
        sizes: "64x64 32x32 24x24 16x16",
        type: "image/x-icon",
      },
    ],
    screenshots: [],
  };
}
