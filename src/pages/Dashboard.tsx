import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import KPITrendCard from "@/components/dashboard/KPITrendCard";
import StudioCalendar from "@/components/calendar/StudioCalendar";
import { Card, CardContent } from "@/components/ui/card";
import StatCard from "@/components/dashboard/StatCard";

const Dashboard = () => {
  type Metrics = {
    active_customers: number | null;
    class_occupancy_pct: number | null;
    revenue_this_month: number | null;
    revenue_change_pct: number | null; // ratio, e.g., 0.08 => +8%
    retention_rate_pct: number | null;
    marketing_summary?: { total: number; email_opt_ins: number; text_opt_ins: number; email_opt_in_rate: number };
    source_breakdown?: { classpass: number; direct: number; avg_lifetime_days_classpass: number | null; avg_lifetime_days_direct: number | null };
    waiver_missing_active_7d?: number;
    engagement_segments?: { active_7d: number; recent_8_30: number; lapsed_31_90: number; inactive_90_plus: number };
  };

  const [metrics, setMetrics] = useState<Metrics | null>(null);

  const formatPct = (n: number | null | undefined) => {
    if (n === null || n === undefined || Number.isNaN(n)) return "—";
    const val = n <= 1 ? n * 100 : n;
    return `${Math.round(val)}%`;
  };

  const formatCurrency = (n: number | null | undefined) => {
    if (n === null || n === undefined || Number.isNaN(n)) return "—";
    try { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n); } catch { return `$${n}`; }
  };

  const formatChange = (ratio: number | null | undefined) => {
    if (ratio === null || ratio === undefined || !isFinite(ratio)) return undefined;
    const pct = Math.round(ratio * 100);
    const sign = pct >= 0 ? "+" : "";
    return `${sign}${pct}%`;
  };

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

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-dashboard-metrics");
        if (error) throw error;
        if (mounted) setMetrics(data as Metrics);
      } catch (e) {
        console.error("Failed to load dashboard metrics", e);
      }
    })();
    return () => { mounted = false; };
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
        <KPITrendCard title="Active Customers" value={metrics ? String(metrics.active_customers ?? "—") : "—"} trend={trends.customers} actionLabel="View Churned Customers" onAction={() => (window.location.href = "/customers")} />
        <KPITrendCard title="Class Occupancy" value={formatPct(metrics?.class_occupancy_pct)} trend={trends.occupancy} actionLabel="Promote Underfilled Classes" onAction={() => (window.location.href = "/leads")} />
        <KPITrendCard title="Revenue" value={formatCurrency(metrics?.revenue_this_month)} change={formatChange(metrics?.revenue_change_pct)} trend={trends.revenue} actionLabel="Send Offer" onAction={() => (window.location.href = "/marketing")} />
        <KPITrendCard title="Retention Rate" value={formatPct(metrics?.retention_rate_pct)} trend={trends.retention} actionLabel="Nurture Drop‑offs" onAction={() => (window.location.href = "/segments")} />
      </section>

      <section aria-labelledby="insights-heading" className="space-y-4">
        <h2 id="insights-heading" className="text-xl font-semibold">Client Insights</h2>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Email Opt-in Rate" value={formatPct((metrics?.marketing_summary?.email_opt_in_rate as number) ?? null)} subtitle={`${metrics?.marketing_summary?.email_opt_ins ?? 0}/${metrics?.marketing_summary?.total ?? 0} opted in`} />
          <StatCard title="Text Opt-ins" value={String(metrics?.marketing_summary?.text_opt_ins ?? '—')} subtitle="SMS marketing consent" />
          <StatCard title="ClassPass Clients" value={String(metrics?.source_breakdown?.classpass ?? '—')} subtitle={`Direct: ${metrics?.source_breakdown?.direct ?? 0}`} />
          <StatCard title="Active Last 7 Days" value={String(metrics?.engagement_segments?.active_7d ?? '—')} subtitle={`Lapsed 31–90: ${metrics?.engagement_segments?.lapsed_31_90 ?? 0}`} />
        </div>
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
