import { createFileRoute } from "@tanstack/react-router";
import { Route as HomeRoute } from "./index";

// Some preview links open "/index" — show the home page there too (no redirect).
export const Route = createFileRoute("/index")({
  head: () => ({
    meta: [
      { title: "COLLAB — Build together, engineer better" },
      { name: "description", content: "COLLAB is the collaboration platform for engineering students." },
      { property: "og:title", content: "COLLAB — Build together, engineer better" },
      { property: "og:description", content: "The collaboration platform for engineering students." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => {
    const Home = HomeRoute.options.component!;
    return <Home />;
  },
});
