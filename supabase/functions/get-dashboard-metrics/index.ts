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

    // Additional customer-derived insights
    const { data: custRows, error: custErr } = await supabase
      .from("customers")
      .select("first_seen, last_seen, marketing_email_opt_in, marketing_text_opt_in, tags, agree_to_liability_waiver, phone_number, birthday")
      .limit(5000);
    if (custErr) console.error("customers insights error", custErr);

    const rows = (custRows || []).map((r: any) => ({
      first_seen: r.first_seen ? new Date(r.first_seen) : null,
      last_seen: r.last_seen ? new Date(r.last_seen) : null,
      email_opt: !!r.marketing_email_opt_in,
      sms_opt: !!r.marketing_text_opt_in,
      tags: (r.tags ?? '').toString().toLowerCase(),
      waiver_ok: r.agree_to_liability_waiver === true,
      has_phone: !!r.phone_number,
      has_birthday: !!r.birthday,
    }));

    const totalClients = rows.length;
    const email_opt_ins = rows.filter(r => r.email_opt).length;
    const text_opt_ins = rows.filter(r => r.sms_opt).length;
    const email_opt_in_rate = totalClients ? Math.round((email_opt_ins / totalClients) * 10000) / 100 : 0;

    const isClassPass = (tags: string) => tags.includes('classpass');
    let classpass = 0, direct = 0;
    const cpLifetimes: number[] = [];
    const directLifetimes: number[] = [];

    const lifetimeDays = (r: any): number | null => {
      if (!r.first_seen || !r.last_seen) return null;
      return (r.last_seen.getTime() - r.first_seen.getTime()) / 86400000;
    };

    for (const r of rows) {
      const cp = isClassPass(r.tags);
      const lt = lifetimeDays(r);
      if (cp) {
        classpass++;
        if (lt !== null && isFinite(lt)) cpLifetimes.push(lt);
      } else {
        direct++;
        if (lt !== null && isFinite(lt)) directLifetimes.push(lt);
      }
    }
    const avg = (arr: number[]) => arr.length ? Math.round((arr.reduce((a,b)=>a+b,0) / arr.length) * 10) / 10 : null;

    const now = new Date();
    const cutoff7 = new Date(now.getTime() - 7 * 86400000);
    const cutoff30 = new Date(now.getTime() - 30 * 86400000);
    const cutoff37 = new Date(now.getTime() - 37 * 86400000);

    const waiver_missing_active_7d = rows.filter(r => !r.waiver_ok && r.last_seen && r.last_seen >= cutoff7).length;

    const daysSince = (d: Date) => Math.floor((now.getTime() - d.getTime()) / 86400000);
    let active_7d = 0, recent_8_30 = 0, lapsed_31_90 = 0, inactive_90_plus = 0;
    for (const r of rows) {
      if (!r.last_seen) continue; // skip unknowns for segments
      const d = daysSince(r.last_seen);
      if (d <= 7) active_7d++;
      else if (d <= 30) recent_8_30++;
      else if (d <= 90) lapsed_31_90++;
      else inactive_90_plus++;
    }

    // Executive KPIs
    const active_30d = rows.filter(r => r.last_seen && r.last_seen >= cutoff30).length;
    const mrr_estimate = active_30d * 150; // assumed $150/month per active

    const new_this_week = rows.filter(r => r.first_seen && r.first_seen >= new Date(now.getTime() - 7*86400000)).length;
    const new_last_week = rows.filter(r => r.first_seen && r.first_seen < new Date(now.getTime() - 7*86400000) && r.first_seen >= new Date(now.getTime() - 14*86400000)).length;
    const weekly_growth_rate = new_last_week > 0 ? (new_this_week - new_last_week) / new_last_week : null;

    const about_to_churn = rows.filter(r => r.last_seen && r.last_seen < cutoff30 && r.last_seen >= cutoff37).length;
    const active_no_waiver = rows.filter(r => !r.waiver_ok && r.last_seen && r.last_seen >= cutoff7).length;

    const with_phone = rows.filter(r => r.has_phone).length;
    const with_birthday = rows.filter(r => r.has_birthday).length;
    const marketable = rows.filter(r => r.email_opt || r.sms_opt).length;
    const data_completeness_score = totalClients
      ? Math.round(((100*with_phone/totalClients + 100*with_birthday/totalClients + 100*marketable/totalClients) / 3) )
      : 0;

    const new_this_month = rows.filter(r => r.first_seen && r.first_seen >= new Date(now.getTime() - 30*86400000)).length;
    const ltv_cac_ratio = new_this_month > 0 ? (mrr_estimate) / (new_this_month * 50) : null;

    const body = {
      active_customers: typeof activeCustomers === "number" ? activeCustomers : null,
      class_occupancy_pct: avg_capacity_today, // expected 0-100
      revenue_this_month,
      revenue_change_pct, // ratio, e.g., 0.08 => +8%
      retention_rate_pct,
      // New insights
      marketing_summary: {
        total: totalClients,
        email_opt_ins,
        text_opt_ins,
        email_opt_in_rate,
      },
      source_breakdown: {
        classpass,
        direct,
        avg_lifetime_days_classpass: avg(cpLifetimes),
        avg_lifetime_days_direct: avg(directLifetimes),
      },
      waiver_missing_active_7d,
      engagement_segments: {
        active_7d,
        recent_8_30,
        lapsed_31_90,
        inactive_90_plus,
      },
      executive_kpis: {
        mrr_estimate,
        weekly_growth_rate,
        churn_risk_about_to_churn: about_to_churn,
        legal_exposure_active_no_waiver: active_no_waiver,
        data_completeness_score,
        ltv_cac_ratio,
      },
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
