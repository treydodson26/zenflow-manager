import { useEffect } from "react";
import { lazy, Suspense } from "react";
const HomeChatHero = lazy(() => import("@/components/chat/HomeChatHero"));

const Index = () => {
  useEffect(() => {
    document.title = "Talo Yoga | AI Studio Assistant";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", "Ask the Talo AI assistant anything about customers, attendance, and outreach.");

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Talo Yoga",
      url: "/",
      potentialAction: {
        "@type": "SearchAction",
        target: "/?q={query}",
        "query-input": "required name=query"
      }
    });
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  return (
    <div className="min-h-[75vh] flex flex-col">
      {/* Optional hero copy */}
      <section className="pt-6 pb-8">
        <h1 className="sr-only">Talo Yoga Home</h1>
        <p className="text-muted-foreground">Welcome to Talo — your studio’s AI assistant.</p>
      </section>

      {/* Assistant anchored to bottom of page */}
      <section className="mt-auto">
        <Suspense fallback={<div className="text-sm text-muted-foreground">Loading assistant…</div>}>
          <HomeChatHero />
        </Suspense>
      </section>
    </div>
  );
};

export default Index;
