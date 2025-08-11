import { useEffect, useMemo } from "react";
import KPITrendCard from "@/components/dashboard/KPITrendCard";
import StudioCalendar from "@/components/calendar/StudioCalendar";
import { Card, CardContent } from "@/components/ui/card";

const Dashboard = () => {
  useEffect(() => {
    document.title = "Dashboard | Talo Yoga";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", "Studio KPIs, trends, and interactive schedule.");

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Talo Yoga Studio",
      url: "/dashboard",
    });
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  const trends = useMemo(() => ({
    customers: Array.from({ length: 12 }, (_, i) => ({ x: i, y: 80 + Math.round(Math.random() * 20) })),
    occupancy: Array.from({ length: 12 }, (_, i) => ({ x: i, y: 60 + Math.round(Math.random() * 30) })),
    revenue: Array.from({ length: 12 }, (_, i) => ({ x: i, y: 7000 + Math.round(Math.random() * 2000) })),
    retention: Array.from({ length: 12 }, (_, i) => ({ x: i, y: 75 + Math.round(Math.random() * 15) })),
  }), []);

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="animate-fade-in">
        <h1 className="text-3xl font-semibold tracking-tight">Studio Dashboard</h1>
        <p className="text-muted-foreground mt-1">Pulse of your studio today.</p>
      </section>

      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <KPITrendCard title="Active Customers" value="123" change="+4%" trend={trends.customers} actionLabel="View Churned Customers" onAction={() => (window.location.href = "/customers")} />
        <KPITrendCard title="Class Occupancy" value="72%" change="+5%" trend={trends.occupancy} actionLabel="Promote Underfilled Classes" onAction={() => (window.location.href = "/leads")} />
        <KPITrendCard title="Revenue" value="$8,250" change="+8%" trend={trends.revenue} actionLabel="Send Offer" onAction={() => (window.location.href = "/marketing")} />
        <KPITrendCard title="Retention Rate" value="84%" change="-1%" trend={trends.retention} actionLabel="Nurture Drop‑offs" onAction={() => (window.location.href = "/segments")} />
      </section>

      <section>
        <StudioCalendar />
      </section>

      <Card className="border-dashed">
        <CardContent className="py-3 text-sm flex items-center justify-between">
          <span className="text-muted-foreground">Your occupancy is up 5% from last week! Keep momentum by promoting midday classes.</span>
          <a href="/marketing" className="story-link text-primary">Open Marketing Hub</a>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
