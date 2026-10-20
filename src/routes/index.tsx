import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/components/collab/HomePage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "COLLAB — Build together, engineer better" },
      { name: "description", content: "COLLAB is the collaboration platform for engineering students: find teammates, share projects, ship together." },
      { property: "og:title", content: "COLLAB — Build together, engineer better" },
      { property: "og:description", content: "The collaboration platform for engineering students." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

