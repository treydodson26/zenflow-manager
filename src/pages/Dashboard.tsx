import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import KPITrendCard from "@/components/dashboard/KPITrendCard";
import StudioCalendar from "@/components/calendar/StudioCalendar";
import { Card, CardContent } from "@/components/ui/card";
import StatCard from "@/components/dashboard/StatCard";
import { DashboardSkeleton, ErrorState } from "@/components/ui/loading-skeletons";

const Dashboard = () => {
  type Metrics = {
    active_customers: number | null;
    class_occupancy_pct: number | null;
    revenue_this_month: number | null;
    revenue_change_pct: number | null; // ratio, e.g., 0.08 => +8%
    retention_rate_pct: number | null;
    trends?: {
      customers: { x: number; y: number }[];
      occupancy: { x: number; y: number }[];
      revenue: { x: number; y: number }[];
      retention: { x: number; y: number }[];
    };
    marketing_summary?: { total: number; email_opt_ins: number; text_opt_ins: number; email_opt_in_rate: number };
    source_breakdown?: { classpass: number; direct: number; avg_lifetime_days_classpass: number | null; avg_lifetime_days_direct: number | null };
    waiver_missing_active_7d?: number;
    engagement_segments?: { active_7d: number; recent_8_30: number; lapsed_31_90: number; inactive_90_plus: number };
    executive_kpis?: { mrr_estimate: number; weekly_growth_rate: number | null; churn_risk_about_to_churn: number; legal_exposure_active_no_waiver: number; data_completeness_score: number; ltv_cac_ratio: number | null };
  };

  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const formatRatioX = (r: number | null | undefined) => {
    if (r === null || r === undefined || !isFinite(r)) return "—";
    return `${Math.round(r * 10) / 10}x`;
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
        setLoading(true);
        setError(null);
        const { data, error } = await supabase.functions.invoke("get-dashboard-metrics");
        if (error) throw error;
        if (mounted) setMetrics(data as Metrics);
      } catch (e) {
        console.error("Failed to load dashboard metrics", e);
        if (mounted) setError("Failed to load dashboard metrics. Please try again.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Use real trend data from metrics, with fallback to empty arrays
  const trends = useMemo(() => metrics?.trends || {
    customers: [],
    occupancy: [],
    revenue: [],
    retention: []
  }, [metrics]);

  const retryLoadMetrics = () => {
    setError(null);
    setLoading(true);
    // Trigger the useEffect again by updating a dependency
    window.location.reload();
  };

  // Show loading state
  if (loading) {
    return <DashboardSkeleton />;
  }

  // Show error state
  if (error) {
    return <ErrorState title="Dashboard Error" message={error} onRetry={retryLoadMetrics} />;
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="animate-fade-in">
        <h1 className="text-3xl font-semibold tracking-tight">Studio Dashboard</h1>
        <p className="text-muted-foreground mt-1">Pulse of your studio today.</p>
      </section>

      {/* Quick access to Instructor Hub */}
      <Card className="border bg-muted/40">
        <CardContent className="py-3 flex items-center justify-between">
          <span className="text-sm">New: Manage instructors, payroll and coverage in the Instructor Hub.</span>
          <a href="/instructor-hub" className="story-link text-primary">Open Instructor Hub</a>
        </CardContent>
      </Card>

      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <KPITrendCard title="Active Customers" value={metrics ? String(metrics.active_customers ?? "—") : "—"} trend={trends.customers} actionLabel="View Churned Customers" onAction={() => (window.location.href = "/customers")} />
        <KPITrendCard title="Class Occupancy" value={formatPct(metrics?.class_occupancy_pct)} trend={trends.occupancy} actionLabel="Promote Underfilled Classes" onAction={() => (window.location.href = "/leads")} />
        <KPITrendCard title="Revenue" value={formatCurrency(metrics?.revenue_this_month)} change={formatChange(metrics?.revenue_change_pct)} trend={trends.revenue} actionLabel="Send Offer" onAction={() => (window.location.href = "/marketing")} />
        <KPITrendCard title="Retention Rate" value={formatPct(metrics?.retention_rate_pct)} trend={trends.retention} actionLabel="Nurture Drop‑offs" onAction={() => (window.location.href = "/segments")} />
      </section>

      {/* Executive KPIs */}
      <section aria-labelledby="exec-kpis-heading" className="space-y-4">
        <h2 id="exec-kpis-heading" className="text-xl font-semibold">Executive KPIs</h2>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-6">
          <StatCard title="MRR Estimate" value={formatCurrency(metrics?.executive_kpis?.mrr_estimate as any)} subtitle="$150 per active client" />
          <StatCard title="Weekly Growth" value={formatChange(metrics?.executive_kpis?.weekly_growth_rate as any) ?? "—"} subtitle="New signups vs last week" />
          <StatCard title="Churn Risk (30d)" value={String(metrics?.executive_kpis?.churn_risk_about_to_churn ?? '—')} subtitle="At 30–37 day mark" />
          <StatCard title="Legal Exposure" value={String(metrics?.executive_kpis?.legal_exposure_active_no_waiver ?? '—')} subtitle="Active 7d w/o waiver" />
          <StatCard title="Data Completeness" value={formatPct(metrics?.executive_kpis?.data_completeness_score as any)} subtitle="Phone, Birthday, Opt-ins" />
          <StatCard title="LTV/CAC" value={formatRatioX(metrics?.executive_kpis?.ltv_cac_ratio as any)} subtitle="Target ≥ 3.0x" />
        </div>
      </section>

      <section>
        <StudioCalendar />
      </section>

      {/* Dynamic insights based on real data */}
      {metrics?.revenue_change_pct && metrics.revenue_change_pct > 0 && (
        <Card className="border-dashed">
          <CardContent className="py-3 text-sm flex items-center justify-between">
            <span className="text-muted-foreground">
              Revenue is up {Math.round(metrics.revenue_change_pct * 100)}% from last month! Keep momentum going.
            </span>
            <a href="/marketing" className="story-link text-primary">Open Marketing Hub</a>
          </CardContent>
        </Card>
      )}
      {metrics?.executive_kpis?.churn_risk_about_to_churn && metrics.executive_kpis.churn_risk_about_to_churn > 0 && (
        <Card className="border-dashed border-orange-200">
          <CardContent className="py-3 text-sm flex items-center justify-between">
            <span className="text-muted-foreground">
              {metrics.executive_kpis.churn_risk_about_to_churn} customers haven't been seen in 30+ days. Consider reaching out.
            </span>
            <a href="/customers" className="story-link text-primary">View Customers</a>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
