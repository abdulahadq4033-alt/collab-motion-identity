import { createFileRoute, redirect } from "@tanstack/react-router";

// Some preview links open "/index" — send them to the home page.
export const Route = createFileRoute("/index")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
