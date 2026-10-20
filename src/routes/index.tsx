import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { LoadingScreen } from "@/components/collab/LoadingScreen";

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
  component: Index,
});

function Index() {
  const [appReady, setAppReady] = useState(false);
  const [showLoader, setShowLoader] = useState(true);

  // Real readiness: hydrated + fonts loaded. No artificial delay.
  useEffect(() => {
    let alive = true;
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    (fonts ? fonts.ready : Promise.resolve()).then(() => alive && setAppReady(true));
    return () => {
      alive = false;
    };
  }, []);

  const done = useCallback(() => setShowLoader(false), []);

  return (
    <>
      <main className="collab-app" data-visible={!showLoader || undefined}>
        <p className="collab-app__eyebrow">For engineering students</p>
        <h1 className="collab-app__title">Build together.</h1>
        <p className="collab-app__lede">Find teammates, share projects, and ship ideas with COLLAB.</p>
      </main>
      {showLoader && <LoadingScreen ready={appReady} onDone={done} />}
    </>
  );
}
