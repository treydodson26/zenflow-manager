import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing Supabase envs");
}

const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Fetch dashboard aggregate metrics
    const { data: dm, error: dmErr } = await supabase
      .from("dashboard_metrics")
      .select("avg_capacity_today, revenue_this_month, revenue_last_month")
      .maybeSingle();

    if (dmErr) console.error("dashboard_metrics error", dmErr);

    // Count active customers (non-prospects)
    const { count: activeCustomers, error: activeErr } = await supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .neq("status", "prospect");

    if (activeErr) console.error("active customers error", activeErr);

    // Average attendance rate from engagement stats (approx. retention)
    const { data: ces, error: cesErr } = await supabase
      .from("customer_engagement_stats")
      .select("attendance_rate")
      .limit(10000);

    if (cesErr) console.error("customer_engagement_stats error", cesErr);

    let retention_rate_pct: number | null = null;
    if (ces && ces.length > 0) {
      const vals = ces
        .map((r: any) => (r.attendance_rate !== null ? Number(r.attendance_rate) : null))
        .filter((n: number | null) => n !== null) as number[];
      if (vals.length > 0) {
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        // Normalize to percentage (handle 0-1 or 0-100 inputs)
        retention_rate_pct = avg <= 1 ? avg * 100 : avg;
      }
    }

    const avg_capacity_today = dm?.avg_capacity_today != null ? Number(dm.avg_capacity_today) : null;
    const revenue_this_month = dm?.revenue_this_month != null ? Number(dm.revenue_this_month) : null;
    const revenue_last_month = dm?.revenue_last_month != null ? Number(dm.revenue_last_month) : null;

    const revenue_change_pct = revenue_last_month && revenue_last_month !== 0
      ? (Number(revenue_this_month || 0) - Number(revenue_last_month)) / Number(revenue_last_month)
      : null;

    const body = {
      active_customers: typeof activeCustomers === "number" ? activeCustomers : null,
      class_occupancy_pct: avg_capacity_today, // expected 0-100
      revenue_this_month,
      revenue_change_pct, // ratio, e.g., 0.08 => +8%
      retention_rate_pct,
    };

    return new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("get-dashboard-metrics error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
