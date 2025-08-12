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

    const canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    canonical.setAttribute("href", window.location.origin + "/");
    document.head.appendChild(canonical);

    return () => { 
      document.head.removeChild(script); 
      document.head.removeChild(canonical);
    };
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary/10 via-background to-background">
      <h1 className="sr-only">Chat with Fred — Talo Yoga AI Studio Assistant</h1>
      <Suspense fallback={<div className="text-sm text-muted-foreground px-4 py-2">Loading assistant…</div>}>
        <HomeChatHero defaultFocus />
      </Suspense>
    </main>
  );
};

export default Index;
