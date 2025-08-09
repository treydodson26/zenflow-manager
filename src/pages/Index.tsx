import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "@/hooks/use-toast";
import { StatCard } from "@/components/dashboard/StatCard";

const Index = () => {
  const [query, setQuery] = useState("");

  useEffect(() => {
    document.title = "Yoga Studio Dashboard | Talo";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", "Track customers, occupancy, revenue, and retention in your yoga studio dashboard.");

    // Basic JSON-LD for local business (yoga studio)
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SportsActivityLocation",
      name: "Talo Yoga Studio",
      url: "/",
      sport: "Yoga",
    });
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  const month = useMemo(() => new Date(), []);

  const handleAsk = () => {
    if (!query.trim()) return;
    toast({ title: "Talo AI", description: "Here's a sample response. Connect to Supabase/AI later." });
    setQuery("");
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Welcome back, Emily</h1>
        <p className="text-muted-foreground mt-1">Here’s what’s happening in your studio today.</p>
      </section>

      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Active Customers" value="123" subtitle={"+5 this month"} />
        <StatCard title="Class Occupancy" value="72 %" subtitle={"filled this week"} />
        <StatCard title="Revenue" value="$8,250" subtitle={"↗︎ healthy growth"} />
        <StatCard title="Retention Rate" value="84 %" />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-none bg-[--card] shadow-[var(--shadow-elegant)]">
            <CardHeader>
              <CardTitle>Ask Talo anything</CardTitle>
              <p className="text-sm text-muted-foreground">Ask about attendance, revenue, instructor performance, or scheduling.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">Sure, our retention rate currently stands at 34%. You can see the figure displayed in the widget above.</div>
              <div className="flex gap-2">
                <Input placeholder="Ask Talo anything..." value={query} onChange={(e) => setQuery(e.target.value)} />
                <Button onClick={handleAsk}>Send</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Classes</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar mode="single" selected={month} onSelect={() => {}} className="rounded-md border" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming Classes</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                <li className="flex justify-between"><span>Vinyasa</span><span className="text-muted-foreground">Alice • 6:00 PM</span></li>
                <li className="flex justify-between"><span>Restorative</span><span className="text-muted-foreground">Michael • 7:30 PM</span></li>
                <li className="flex justify-between"><span>Hatha</span><span className="text-muted-foreground">Sarah • 9:00 AM</span></li>
              </ul>
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  );
};

export default Index;
