import { useEffect, useState } from "react";
import ImageStudio from "./ImageStudio";
import { MarketingHubSkeleton, ErrorState } from "@/components/ui/loading-skeletons";

const MarketingHub = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // SEO: title, meta description, canonical, structured data
    document.title = "Marketing Hub – AI Image Generator | Talo Yoga";

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", "Create on-brand yoga marketing images with Talo’s AI studio.");

    const canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    canonical.setAttribute("href", "/marketing");
    document.head.appendChild(canonical);

    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Marketing Hub – AI Image Generator",
      url: "/marketing",
      description: "Create on-brand yoga marketing images with Talo’s AI studio."
    });
    document.head.appendChild(ld);

    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);

    return () => {
      document.head.removeChild(canonical);
      document.head.removeChild(ld);
      clearTimeout(timer);
    };
  }, []);

  // Show loading state
  if (loading) {
    return <MarketingHubSkeleton />;
  }

  // Show error state
  if (error) {
    return <ErrorState title="Marketing Hub Error" message={error} />;
  }

  return (
    <main className="container mx-auto py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Marketing Hub – AI Image Generator</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate on-brand images for class promos, events, and social posts.
        </p>
      </header>

      <section aria-labelledby="image-studio" className="mt-4">
        <h2 id="image-studio" className="sr-only">AI Image Studio</h2>
        <ImageStudio />
      </section>
    </main>
  );
};

export default MarketingHub;
