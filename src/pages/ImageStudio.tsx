import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, ImageDown, Clipboard, Wand2 } from "lucide-react";

const SIZES = [
  { value: "1024x1024", label: "Square 1024 × 1024" },
  { value: "1536x1024", label: "Landscape 1536 × 1024" },
  { value: "1024x1536", label: "Portrait 1024 × 1536" },
];

const FORMATS = [
  { value: "png", label: "PNG (transparent capable)" },
  { value: "jpeg", label: "JPEG" },
  { value: "webp", label: "WEBP" },
];

const BACKGROUNDS = [
  { value: "auto", label: "Auto" },
  { value: "transparent", label: "Transparent (PNG/WEBP)" },
  { value: "opaque", label: "Opaque" },
];

const QUALITIES = [
  { value: "auto", label: "Auto" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export default function ImageStudio() {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1024x1024");
  const [format, setFormat] = useState("png");
  const [background, setBackground] = useState("auto");
  const [quality, setQuality] = useState("auto");
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const pageTitle = useMemo(() => `AI Image Generator | Talo Yoga`, []);

  useEffect(() => {
    document.title = pageTitle;
    const desc = "Generate on-brand flyers and class visuals with AI. Fast, high quality images using OpenAI's gpt-image-1.";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", desc);

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", "/images");

    // Minimal structured data
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Talo Yoga Image Studio",
      applicationCategory: "DesignApplication",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }
    });
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [pageTitle]);

  const onGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: "Enter a prompt", description: "Describe the image you want to generate.", variant: "default" });
      return;
    }
    setIsLoading(true);
    setImageSrc(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: {
          prompt,
          size,
          output_format: format,
          background,
          quality,
        },
      });
      if (error) throw error;
      if (!data?.image) throw new Error("No image returned");
      setImageSrc(data.image as string);
      toast({ title: "Image ready", description: "You can download or copy it now." });
    } catch (e: any) {
      console.error("generate-image error", e);
      toast({ title: "Generation failed", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const onDownload = () => {
    if (!imageSrc) return;
    const a = document.createElement("a");
    a.href = imageSrc;
    a.download = `talo-image-${Date.now()}.${format === "jpeg" ? "jpg" : format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const onCopy = async () => {
    if (!imageSrc) return;
    try {
      await navigator.clipboard.writeText(imageSrc);
      toast({ title: "Copied", description: "Image data URL copied to clipboard." });
    } catch (e) {
      toast({ title: "Copy failed", description: "Your browser may block copying large data URLs.", variant: "destructive" });
    }
  };

  return (
    <main className="container mx-auto max-w-4xl py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">AI Image Generator</h1>
        <p className="text-sm text-muted-foreground">Create flyers, class visuals, and marketing images from a simple prompt.</p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Describe your image</CardTitle>
            <CardDescription>Use precise details: style, colors, layout, text to include, and mood.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea id="prompt" placeholder="E.g., A minimalist yoga class flyer for Friday 6pm, warm gradient background, bold headline 'Vinyasa Glow', instructor photo space, modern sans-serif typography" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={6} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Size</Label>
                <Select value={size} onValueChange={setSize}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {SIZES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Format</Label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMATS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Background</Label>
                <Select value={background} onValueChange={setBackground}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select background" />
                  </SelectTrigger>
                  <SelectContent>
                    {BACKGROUNDS.map((b) => (
                      <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quality</Label>
                <Select value={quality} onValueChange={setQuality}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select quality" />
                  </SelectTrigger>
                  <SelectContent>
                    {QUALITIES.map((q) => (
                      <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={onGenerate} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />} Generate
              </Button>
              <Input readOnly value={prompt.length ? `${prompt.length} chars` : ""} className="max-w-[160px]" aria-label="Prompt length" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
            <CardDescription>The generated image appears here.</CardDescription>
          </CardHeader>
          <CardContent>
            {imageSrc ? (
              <div className="space-y-4">
                <img src={imageSrc} alt={`Generated image for: ${prompt}`} loading="lazy" className="w-full h-auto rounded-md" />
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={onDownload}><ImageDown className="mr-2 h-4 w-4" />Download</Button>
                  <Button variant="outline" onClick={onCopy}><Clipboard className="mr-2 h-4 w-4" />Copy</Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No image yet. Generate to see results.</div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
