import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import KPITrendCard from "@/components/dashboard/KPITrendCard";
import { Card, CardContent } from "@/components/ui/card";
import StatCard from "@/components/dashboard/StatCard";
import { DashboardSkeleton, ErrorState } from "@/components/ui/loading-skeletons";
import HomeChatHero from "@/components/chat/HomeChatHero";
import { Calendar, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

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

  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="min-h-screen bg-[#FAF8F3]">
      {/* Header */}
      <div className="flex items-center justify-between p-6 bg-white border-b border-[#E5E7EB]">
        <h1 className="text-2xl font-semibold text-[#1F2937]">Welcome back, Emily</h1>
        <div className="text-sm text-[#6B7280]">{currentDate}</div>
      </div>

      <div className="flex gap-6 p-6">
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Subtitle */}
          <p className="text-[#6B7280]">Here's what's happening in your studio today.</p>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white border border-[#E5E7EB] shadow-sm">
              <CardContent className="p-4">
                <div className="text-sm text-[#6B7280] mb-1">Active Students</div>
                <div className="text-2xl font-semibold text-[#1F2937]">{metrics ? String(metrics.active_customers ?? "—") : "—"}</div>
                <div className="text-xs text-[#10B981] mt-1">+3 this month</div>
              </CardContent>
            </Card>
            
            <Card className="bg-white border border-[#E5E7EB] shadow-sm">
              <CardContent className="p-4">
                <div className="text-sm text-[#6B7280] mb-1">Class Occupancy</div>
                <div className="text-2xl font-semibold text-[#1F2937]">{formatPct(metrics?.class_occupancy_pct)}</div>
                <div className="text-xs text-[#10B981] mt-1">last this week</div>
              </CardContent>
            </Card>
            
            <Card className="bg-white border border-[#E5E7EB] shadow-sm">
              <CardContent className="p-4">
                <div className="text-sm text-[#6B7280] mb-1">Revenue</div>
                <div className="text-2xl font-semibold text-[#1F2937]">{formatCurrency(metrics?.revenue_this_month)}</div>
                <div className="text-xs text-[#10B981] mt-1 flex items-center">
                  <span>↗</span>
                  <span className="ml-1">{formatChange(metrics?.revenue_change_pct) || "+0%"}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white border border-[#E5E7EB] shadow-sm">
              <CardContent className="p-4">
                <div className="text-sm text-[#6B7280] mb-1">Retention Rate</div>
                <div className="text-2xl font-semibold text-[#1F2937]">{formatPct(metrics?.retention_rate_pct)}</div>
                <div className="text-xs text-[#10B981] mt-1 flex items-center">
                  <span>↗</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ask Talo Anything */}
          <Card className="bg-[#2C4A42] text-white shadow-lg">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-medium">Ask Talo anything</h2>
                  <p className="text-sm text-white/80 mt-1">Get insights on attendance, instructor performance, or anything else.</p>
                </div>
                
                <div className="bg-white/10 rounded-lg p-4">
                  <p className="text-sm text-white/90 mb-3">Sure, our retention rate currently stands at 84%.</p>
                  <p className="text-sm text-white/80">You can see the figure displayed in the widget above.</p>
                </div>
                
                <div className="border-t border-white/20 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/80">What is our retention rate?</span>
                    <ChevronRight className="h-4 w-4 text-white/60" />
                  </div>
                  <div className="mt-2">
                    <input 
                      type="text" 
                      placeholder="Ask Talo anything..." 
                      className="w-full bg-transparent border-none text-white placeholder-white/60 text-sm focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 space-y-6">
          {/* Upcoming Classes */}
          <Card className="bg-white border border-[#E5E7EB] shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-[#1F2937]">Upcoming Classes</h3>
                <div className="flex items-center text-sm text-[#6B7280]">
                  August 2025
                  <ChevronRight className="h-4 w-4 ml-1" />
                </div>
              </div>
              
              {/* Mini Calendar */}
              <div className="mb-4">
                <div className="grid grid-cols-7 gap-1 text-xs text-center text-[#6B7280] mb-2">
                  <div>Su</div>
                  <div>Mo</div>
                  <div>Tu</div>
                  <div>We</div>
                  <div>Th</div>
                  <div>Fr</div>
                  <div>Sa</div>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 31 }, (_, i) => (
                    <div key={i + 1} className={`text-xs p-1 text-center ${i + 1 === 9 ? 'bg-[#10B981] text-white rounded' : 'text-[#1F2937]'}`}>
                      {i + 1}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-[#1F2937] text-sm">Upcoming Classes</h4>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-[#1F2937]">Vinyasa</div>
                      <div className="text-xs text-[#6B7280]">9:00 AM</div>
                    </div>
                    <div className="text-xs text-[#6B7280]">Alice</div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-[#1F2937]">Restorative</div>
                      <div className="text-xs text-[#6B7280]">7:30 PM</div>
                    </div>
                    <div className="text-xs text-[#6B7280]">Ethel Chen</div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-[#1F2937]">Hatha</div>
                      <div className="text-xs text-[#6B7280]">3:00 AM</div>
                    </div>
                    <div className="text-xs text-[#6B7280]">Sam Bo</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
