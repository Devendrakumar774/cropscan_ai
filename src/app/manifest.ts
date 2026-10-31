import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CropScan AI - किसान फसल डॉक्टर",
    short_name: "CropScan AI",
    description: "पत्ते की फोटो लो, बीमारी पहचानो और सही सस्ता इलाज जानो",
    start_url: "/",
    display: "standalone",
    background_color: "#F6F1E7",
    theme_color: "#2F5D3A",
    orientation: "portrait",
    categories: ["agriculture", "productivity", "utilities"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}

