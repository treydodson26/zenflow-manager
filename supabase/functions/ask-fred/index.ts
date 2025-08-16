import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  : null as any;

const anthropic = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null as any;

// OpenAI helpers removed; using Anthropic Messages API below.

// Utility helpers for analytics
function toDate(d: string | Date | null | undefined): Date | null {
  if (!d) return null;
  try { return new Date(d); } catch { return null; }
}
function diffDays(a: Date, b: Date): number { return Math.floor((a.getTime() - b.getTime()) / 86400000); }
function monthKey(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
function tryParseTags(raw: any): string[] {
  if (!raw) return [];
  const s = String(raw).trim();
  if (!s) return [];
  // Try JSON array first
  if (s.startsWith('[') && s.endsWith(']')) {
    try { const arr = JSON.parse(s); if (Array.isArray(arr)) return arr.map((x: any) => String(x)); } catch {}
  }
  // Fallback: comma-separated
  return s.split(',').map((t) => t.trim()).filter(Boolean);
}
function hasClassPass(raw: any): boolean {
  const tags = tryParseTags(raw).map((t) => t.toLowerCase());
  if (tags.includes('classpass')) return true;
  const s = String(raw || '').toLowerCase();
  return s.includes('classpass');
}
function ageFromBirthday(bday: string | Date | null | undefined): number | null {
  const d = toDate(bday as any);
  if (!d || isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}
function nextBirthdayWithinDays(bday: string | Date | null | undefined, days: number): boolean {
  const d = toDate(bday as any);
  if (!d) return false;
  const today = new Date();
  const thisYear = new Date(today.getFullYear(), d.getMonth(), d.getDate());
  const next = thisYear >= today ? thisYear : new Date(today.getFullYear() + 1, d.getMonth(), d.getDate());
  return diffDays(next, today) <= days;
}

// Tool handlers
const tools = {
  async get_inactive_customers(params: { days?: number; limit?: number }) {
    const days = Math.max(1, Math.min(3650, Number(params?.days) || 30));
    const limit = Math.max(1, Math.min(200, Number(params?.limit) || 25));
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffISO = cutoff.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("customers")
      .select("id, first_name, last_name, client_email, status, last_class_date, total_lifetime_value")
      .or(`last_class_date.lt.${cutoffISO},last_class_date.is.null`)
      .order("last_class_date", { ascending: true, nullsFirst: true })
      .limit(limit);

    if (error) throw error;
    return data;
  },
  async get_customers_by_status(params: { status: string; limit?: number }) {
    const status = String(params?.status || "").toLowerCase();
    const limit = Math.max(1, Math.min(200, Number(params?.limit) || 25));
    const { data, error } = await supabase
      .from("customers")
      .select("id, first_name, last_name, client_email, status, last_class_date, total_lifetime_value")
      .ilike("status", status)
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  },
  async get_top_customers_by_ltv(params: { limit?: number }) {
    const limit = Math.max(1, Math.min(200, Number(params?.limit) || 25));
    const { data, error } = await supabase
      .from("customers")
      .select("id, first_name, last_name, client_email, total_lifetime_value, status, last_class_date")
      .order("total_lifetime_value", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  },
  async search_customers(params: { query: string; limit?: number }) {
    const q = String(params?.query || "").trim();
    const limit = Math.max(1, Math.min(200, Number(params?.limit) || 25));
    const { data, error } = await supabase
      .from("customers")
      .select("id, first_name, last_name, client_email, status, last_class_date, total_lifetime_value")
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,client_email.ilike.%${q}%`)
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  },
  async get_customers_created_in_month(params: { month: string | number; year?: number; limit?: number }) {
    const now = new Date();
    const monthInput = params?.month;
    const toMonthNumber = (m: string | number): number => {
      if (typeof m === "number") return Math.min(12, Math.max(1, m));
      const idx = [
        "january","february","march","april","may","june",
        "july","august","september","october","november","december"
      ].indexOf(m.toLowerCase());
      return idx >= 0 ? idx + 1 : now.getMonth() + 1;
    };
    const monthNum = toMonthNumber(monthInput ?? now.getMonth() + 1);
    const year = Number(params?.year) || now.getFullYear();

    const start = new Date(year, monthNum - 1, 1);
    const end = new Date(year, monthNum, 1);
    const limit = Math.max(1, Math.min(500, Number(params?.limit) || 100));

    const { data, error } = await supabase
      .from("customers")
      .select("id, first_name, last_name, client_email, status, created_at, total_lifetime_value")
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString())
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  },
  async stats_overview() {
    console.log("🔍 Fetching customer status overview via RPC...");

    // Call the new RPC function to get aggregated stats directly from the database
    const { data, error } = await supabase.rpc('get_customer_stats_overview');

    if (error) {
      console.error("❌ Error calling get_customer_stats_overview RPC:", error);
      throw error;
    }

    console.log("📈 Received stats from RPC:", data);

    // The RPC returns the data in the exact format we need.
    // Example `data` object:
    // {
    //   "total_customers": 1234,
    //   "status_breakdown": { "active": 500, "prospect": 200, "unknown": 34 }
    // }

    return {
      total_customers: data.total_customers,
      status_breakdown: data.status_breakdown,
      fetched_records: data.total_customers // The total count is now directly available
    };
  },
  async analytics(params: { metric: string; periodDays?: number; bucket?: string; limit?: number }) {
    const metric = String(params?.metric || '').toLowerCase();
    const limit = Math.max(1, Math.min(500, Number(params?.limit) || 100));
    
    console.log(`🔍 Running analytics for metric: ${metric}`);
    
    // Pull required fields - remove artificial limit for analytics
    const { data, error } = await supabase
      .from('customers')
      .select(`
        id, first_name, last_name, client_name, client_email, phone_number, address,
        birthday, tags, first_seen, last_seen, created_at, status,
        marketing_email_opt_in, marketing_text_opt_in, transactional_text_opt_in,
        agree_to_liability_waiver, pre_arketa_milestone_count, total_lifetime_value
      `);
      
    console.log(`📥 Analytics fetched ${data?.length || 0} customer records for ${metric}`);
    
    if (error) {
      console.error("❌ Analytics error:", error);
      throw error;
    }
    const now = new Date();
    const rows = (data || []).map((r: any) => ({ ...r,
      first_seen: toDate(r.first_seen),
      last_seen: toDate(r.last_seen),
      created_at: toDate(r.created_at),
      birthday: toDate(r.birthday),
      tags_arr: tryParseTags(r.tags),
    }));

    const resp: any = { metric };

    switch (metric) {
      case 'recent_active': {
        const days = Math.max(1, Math.min(365, Number(params?.periodDays) || 30));
        const cutoff = new Date(now.getTime() - days * 86400000);
        const list = rows
          .filter(r => r.last_seen && r.last_seen >= cutoff)
          .sort((a,b) => (b.last_seen?.getTime()||0) - (a.last_seen?.getTime()||0))
          .slice(0, limit)
          .map(r => ({
            name: r.client_name || `${r.first_name||''} ${r.last_name||''}`.trim(),
            email: r.client_email,
            last_seen: r.last_seen,
            days_since_last_visit: r.last_seen ? diffDays(now, r.last_seen) : null,
          }));
        resp.list = list; resp.count = list.length; break;
      }
      case 'inactive_bucket': {
        const bucket = String(params?.bucket || '30-60');
        const start = bucket === '60-90' ? 60 : (bucket === '90+' ? 90 : 30);
        const end = bucket === '30-60' ? 60 : (bucket === '60-90' ? 90 : Infinity);
        const list = rows.filter(r => {
          if (!r.last_seen) return bucket === '90+'; // never returned counts as 90+
          const d = diffDays(now, r.last_seen);
          return d >= start && d < end;
        }).sort((a,b) => (b.last_seen?.getTime()||0) - (a.last_seen?.getTime()||0))
          .slice(0, limit)
          .map(r => ({ name: r.client_name || `${r.first_name||''} ${r.last_name||''}`.trim(), email: r.client_email, last_seen: r.last_seen, days_inactive: r.last_seen ? diffDays(now, r.last_seen) : null }));
        resp.list = list; resp.count = list.length; break;
      }
      case 'avg_lifetime': {
        const lifetimes = rows.filter(r => r.first_seen && r.last_seen && r.last_seen > r.first_seen)
          .map(r => (r.last_seen!.getTime() - r.first_seen!.getTime()) / 86400000)
          .sort((a,b)=>a-b);
        const avg = lifetimes.reduce((a,b)=>a+b,0) / (lifetimes.length || 1);
        const median = lifetimes.length ? lifetimes[Math.floor(lifetimes.length/2)] : 0;
        resp.avg_days = Math.round(avg);
        resp.median_days = Math.round(median);
        resp.min_days = Math.round(lifetimes[0] || 0);
        resp.max_days = Math.round(lifetimes[lifetimes.length-1] || 0);
        break;
      }
      case 'longest_standing': {
        const list = rows
          .filter(r => r.first_seen)
          .sort((a,b) => (a.first_seen?.getTime()||0) - (b.first_seen?.getTime()||0))
          .slice(0, limit)
          .map(r => ({ name: r.client_name || `${r.first_name||''} ${r.last_name||''}`.trim(), email: r.client_email, first_seen: r.first_seen, last_seen: r.last_seen, days_since_joined: r.first_seen ? diffDays(now, r.first_seen) : null }));
        resp.list = list; resp.count = list.length; break;
      }
      case 'one_time_vs_repeat': {
        let one_time = 0, repeat = 0;
        for (const r of rows) {
          const sameDay = r.first_seen && r.last_seen && r.first_seen.toDateString() === r.last_seen.toDateString();
          if (sameDay) one_time++; else repeat++;
        }
        const total = one_time + repeat;
        resp.one_time_visitors = one_time;
        resp.repeat_customers = repeat;
        resp.total_clients = total;
        resp.one_time_pct = total ? Math.round(10000*one_time/total)/100 : 0;
        resp.repeat_pct = total ? Math.round(10000*repeat/total)/100 : 0;
        break;
      }
      case 'retention_by_cohort': {
        const cohorts: Record<string, { cohort_size: number; retained_30d: number; retained_60d: number; retained_90d: number }>= {};
        for (const r of rows) {
          if (!r.first_seen) continue;
          const key = monthKey(r.first_seen);
          cohorts[key] ||= { cohort_size: 0, retained_30d: 0, retained_60d: 0, retained_90d: 0 };
          cohorts[key].cohort_size++;
          if (r.last_seen && diffDays(r.last_seen, r.first_seen) >= 30) cohorts[key].retained_30d++;
          if (r.last_seen && diffDays(r.last_seen, r.first_seen) >= 60) cohorts[key].retained_60d++;
          if (r.last_seen && diffDays(r.last_seen, r.first_seen) >= 90) cohorts[key].retained_90d++;
        }
        const out = Object.entries(cohorts)
          .sort((a,b)=> a[0]<b[0]?1:-1)
          .slice(0, 12)
          .map(([cohort_month, v]) => ({
            cohort_month,
            cohort_size: v.cohort_size,
            retained_30d: v.retained_30d,
            retention_30d_pct: v.cohort_size? Math.round(10000*v.retained_30d/v.cohort_size)/100:0,
            retained_60d: v.retained_60d,
            retention_60d_pct: v.cohort_size? Math.round(10000*v.retained_60d/v.cohort_size)/100:0,
            retained_90d: v.retained_90d,
            retention_90d_pct: v.cohort_size? Math.round(10000*v.retained_90d/v.cohort_size)/100:0,
          }));
        resp.cohorts = out; break;
      }
      case 'early_engaged_inactive': {
        const list = rows.filter(r => r.first_seen && r.last_seen && (r.last_seen.getTime()-r.first_seen.getTime()) >= 7*86400000 && diffDays(now, r.last_seen) >= 60)
          .sort((a,b)=> ((b.last_seen?.getTime()||0)-(a.last_seen?.getTime()||0)))
          .slice(0, limit)
          .map(r => ({ name: r.client_name || `${r.first_name||''} ${r.last_name||''}`.trim(), email: r.client_email, active_period_days: Math.round((r.last_seen!.getTime()-r.first_seen!.getTime())/86400000), days_since_last_visit: diffDays(now, r.last_seen!) }));
        resp.list = list; resp.count = list.length; break;
      }
      case 'marketing_optins_summary': {
        const total = rows.length;
        const email_opt_in = rows.filter(r => r.marketing_email_opt_in === true).length;
        const sms_opt_in = rows.filter(r => r.marketing_text_opt_in === true).length;
        const both_opt_in = rows.filter(r => r.marketing_email_opt_in === true && r.marketing_text_opt_in === true).length;
        const no_marketing = rows.filter(r => !r.marketing_email_opt_in && !r.marketing_text_opt_in).length;
        resp.total_clients = total;
        resp.email_opt_in = email_opt_in;
        resp.sms_opt_in = sms_opt_in;
        resp.both_opt_in = both_opt_in;
        resp.no_marketing = no_marketing;
        resp.email_opt_in_pct = total? Math.round(10000*email_opt_in/total)/100 : 0;
        resp.sms_opt_in_pct = total? Math.round(10000*sms_opt_in/total)/100 : 0;
        break;
      }
      case 'active_no_marketing': {
        const cutoff = new Date(now.getTime() - 30*86400000);
        const list = rows.filter(r => (r.last_seen && r.last_seen >= cutoff) && (!r.marketing_email_opt_in && !r.marketing_text_opt_in))
          .sort((a,b)=> (b.last_seen?.getTime()||0) - (a.last_seen?.getTime()||0))
          .slice(0, limit)
          .map(r => ({ name: r.client_name || `${r.first_name||''} ${r.last_name||''}`.trim(), email: r.client_email, phone: r.phone_number, last_seen: r.last_seen }));
        resp.list = list; resp.count = list.length; break;
      }
      case 'phone_without_sms_optin': {
        const list = rows.filter(r => (r.phone_number && (!r.marketing_text_opt_in)))
          .sort((a,b)=> (b.last_seen?.getTime()||0) - (a.last_seen?.getTime()||0))
          .slice(0, limit)
          .map(r => ({ name: r.client_name || `${r.first_name||''} ${r.last_name||''}`.trim(), email: r.client_email, phone: r.phone_number, last_seen: r.last_seen, marketing_text_opt_in: !!r.marketing_text_opt_in, transactional_text_opt_in: !!r.transactional_text_opt_in }));
        resp.list = list; resp.count = list.length; break;
      }
      case 'marketing_retention_correlation': {
        const buckets: Record<string, { total: number; active: number; at_risk: number; churned: number }> = {};
        for (const r of rows) {
          const marketing_status = (r.marketing_email_opt_in || r.marketing_text_opt_in) ? 'Opted In' : 'Not Opted In';
          const days = r.last_seen ? diffDays(now, r.last_seen) : Infinity;
          const activity_status = days <= 30 ? 'Active' : (days <= 90 ? 'At Risk' : 'Churned');
          buckets[marketing_status] ||= { total: 0, active: 0, at_risk: 0, churned: 0 };
          buckets[marketing_status].total++;
          buckets[marketing_status][activity_status === 'Active' ? 'active' : activity_status === 'At Risk' ? 'at_risk' : 'churned']++;
        }
        resp.stats = Object.entries(buckets).map(([k,v])=> ({
          marketing_status: k,
          total_clients: v.total,
          active_clients: v.active,
          at_risk_clients: v.at_risk,
          churned_clients: v.churned,
          active_pct: v.total ? Math.round(10000*v.active/v.total)/100 : 0,
        }));
        break;
      }
      case 'transactional_not_marketing': {
        const list = rows.filter(r => r.transactional_text_opt_in === true && !r.marketing_text_opt_in && r.phone_number)
          .slice(0, limit)
          .map(r => ({ name: r.client_name || `${r.first_name||''} ${r.last_name||''}`.trim(), email: r.client_email, phone: r.phone_number, transactional_text_opt_in: true, marketing_text_opt_in: !!r.marketing_text_opt_in, last_seen: r.last_seen }));
        resp.list = list; resp.count = list.length; break;
      }
      case 'contact_info_completeness': {
        const counts: Record<string, number> = { Complete:0, 'Email + Phone':0, 'Email Only':0, Incomplete:0 };
        for (const r of rows) {
          const hasEmail = !!r.client_email;
          const hasPhone = !!r.phone_number;
          const hasAddress = !!r.address;
          const hasBirthday = !!r.birthday;
          const status = (hasEmail && hasPhone && hasAddress && hasBirthday) ? 'Complete' : (hasEmail && hasPhone) ? 'Email + Phone' : hasEmail ? 'Email Only' : 'Incomplete';
          counts[status]++;
        }
        const total = rows.length;
        resp.breakdown = Object.entries(counts).map(([k,v])=> ({ contact_status: k, client_count: v, percentage: total? Math.round(10000*v/total)/100 : 0 }));
        break;
      }
      case 'classpass_optin_summary': {
        const classpassRows = rows.filter(r => hasClassPass(r.tags));
        const total = classpassRows.length;
        const email_opt_in = classpassRows.filter(r => r.marketing_email_opt_in).length;
        const sms_opt_in = classpassRows.filter(r => r.marketing_text_opt_in).length;
        resp.total_classpass = total;
        resp.classpass_email_opt_in = email_opt_in;
        resp.classpass_sms_opt_in = sms_opt_in;
        resp.classpass_email_opt_in_pct = total? Math.round(10000*email_opt_in/total)/100 : 0;
        break;
      }
      case 'waiver_missing_recent': {
        const cutoff = new Date(now.getTime() - 30*86400000);
        const list = rows.filter(r => (!r.agree_to_liability_waiver) && r.last_seen && r.last_seen >= cutoff)
          .sort((a,b)=> (b.last_seen?.getTime()||0)-(a.last_seen?.getTime()||0))
          .slice(0, limit)
          .map(r => ({ name: r.client_name || `${r.first_name||''} ${r.last_name||''}`.trim(), email: r.client_email, phone: r.phone_number, first_seen: r.first_seen, last_seen: r.last_seen }));
        resp.list = list; resp.count = list.length; break;
      }
      case 'waiver_overall_rate': {
        const total = rows.length;
        const signed = rows.filter(r => r.agree_to_liability_waiver === true).length;
        const missing = total - signed;
        resp.total_clients = total;
        resp.waiver_signed = signed;
        resp.waiver_missing = missing;
        resp.waiver_completion_rate = total? Math.round(10000*signed/total)/100 : 0;
        break;
      }
      case 'recent_no_waiver_7d': {
        const cutoff = new Date(now.getTime() - 7*86400000);
        const list = rows.filter(r => (!r.agree_to_liability_waiver) && r.last_seen && r.last_seen >= cutoff)
          .sort((a,b)=> (b.last_seen?.getTime()||0)-(a.last_seen?.getTime()||0))
          .slice(0, limit)
          .map(r => ({ name: r.client_name || `${r.first_name||''} ${r.last_name||''}`.trim(), email: r.client_email, first_seen: r.first_seen, last_seen: r.last_seen, days_since_visit: diffDays(now, r.last_seen!) }));
        resp.list=list; resp.count=list.length; break;
      }
      case 'waiver_rate_by_tenure': {
        const buckets: Record<string, { total:number; completed:number }> = { 'New (<30d)':{total:0,completed:0}, 'Recent (30-90d)':{total:0,completed:0}, 'Existing (>90d)':{total:0,completed:0} };
        for (const r of rows) {
          const days_since_first = r.first_seen ? diffDays(now, r.first_seen) : Infinity;
          const key = days_since_first < 30 ? 'New (<30d)' : days_since_first <= 90 ? 'Recent (30-90d)' : 'Existing (>90d)';
          buckets[key].total++;
          if (r.agree_to_liability_waiver) buckets[key].completed++;
        }
        resp.breakdown = Object.entries(buckets).map(([k,v])=> ({ client_type: k, total_clients: v.total, waiver_completed: v.completed, completion_rate: v.total? Math.round(10000*v.completed/v.total)/100 : 0 }));
        break;
      }
      case 'classpass_without_waivers': {
        const list = rows.filter(r => hasClassPass(r.tags) && !r.agree_to_liability_waiver)
          .sort((a,b)=> (b.last_seen?.getTime()||0)-(a.last_seen?.getTime()||0))
          .slice(0, limit)
          .map(r => ({ name: r.client_name || `${r.first_name||''} ${r.last_name||''}`.trim(), email: r.client_email, first_seen: r.first_seen, last_seen: r.last_seen, tags: r.tags_arr }));
        resp.list=list; resp.count=list.length; break;
      }
      case 'source_split': {
        const counts: Record<string, number> = { ClassPass:0, Direct:0 };
        for (const r of rows) counts[ hasClassPass(r.tags) ? 'ClassPass':'Direct' ]++;
        const total = rows.length;
        resp.breakdown = Object.entries(counts).map(([k,v])=> ({ booking_source:k, client_count:v, percentage: total? Math.round(10000*v/total)/100 : 0 }));
        break;
      }
      case 'age_distribution': {
        const buckets: Record<string, number> = { 'Under 25':0, '25-34':0, '35-44':0, '45-54':0, '55+':0, Unknown:0 };
        for (const r of rows) {
          const age = ageFromBirthday(r.birthday);
          let key = 'Unknown';
          if (age!==null) key = age<25? 'Under 25' : age<=34? '25-34' : age<=44? '35-44' : age<=54? '45-54' : '55+';
          buckets[key]++;
        }
        const total = rows.length;
        resp.breakdown = Object.entries(buckets).map(([k,v])=> ({ age_group:k, client_count:v, percentage: total? Math.round(10000*v/total)/100 : 0 }));
        break;
      }
      case 'upcoming_birthdays_30d': {
        const list = rows.filter(r => nextBirthdayWithinDays(r.birthday, 30))
          .sort((a,b)=> ((a.birthday?.getMonth()||0)-(b.birthday?.getMonth()||0)) || ((a.birthday?.getDate()||0)-(b.birthday?.getDate()||0)))
          .slice(0, limit)
          .map(r => ({ name: r.client_name || `${r.first_name||''} ${r.last_name||''}`.trim(), email: r.client_email, birthday: r.birthday, turning_age: ageFromBirthday(r.birthday) ? (ageFromBirthday(r.birthday)! + 1) : null }));
        resp.list=list; resp.count=list.length; break;
      }
      case 'birthdays_by_month': {
        const counts: number[] = Array(12).fill(0);
        for (const r of rows) if (r.birthday) counts[r.birthday.getMonth()]++;
        resp.breakdown = counts.map((v,i)=> ({ month_number: i+1, client_count: v }));
        break;
      }
      case 'birthday_completion_rate': {
        const total = rows.length;
        const with_bday = rows.filter(r=> !!r.birthday).length;
        resp.total_clients = total;
        resp.clients_with_birthday = with_bday;
        resp.clients_without_birthday = total - with_bday;
        resp.birthday_completion_rate = total? Math.round(10000*with_bday/total)/100 : 0;
        break;
      }
      case 'city_distribution': {
        const counts = new Map<string, number>();
        for (const r of rows) {
          const addr = String(r.address||'');
          if (!addr) continue;
          const parts = addr.split(',');
          const city = parts.length >= 2 ? parts[1].trim() : '';
          if (!city) continue;
          counts.set(city, (counts.get(city)||0)+1);
        }
        resp.cities = Array.from(counts.entries()).sort((a,b)=> b[1]-a[1]).map(([city,total_clients])=> ({ city, total_clients }));
        break;
      }
      case 'tag_distribution': {
        const counts = new Map<string, number>();
        for (const r of rows) for (const t of r.tags_arr) counts.set(t, (counts.get(t)||0)+1);
        const totalClients = rows.length;
        resp.tags = Array.from(counts.entries()).sort((a,b)=> b[1]-a[1]).map(([tag, client_count])=> ({ tag, client_count, percentage_of_total: totalClients? Math.round(10000*client_count/totalClients)/100 : 0 }));
        break;
      }
      case 'missing_fields_overview': {
        const total = rows.length;
        const phone_missing = rows.filter(r=> !r.phone_number).length;
        const birthday_missing = rows.filter(r=> !r.birthday).length;
        const address_missing = rows.filter(r=> !r.address).length;
        const last_name_missing = rows.filter(r=> !r.last_name).length;
        const milestone_missing = rows.filter(r=> r.pre_arketa_milestone_count === null || r.pre_arketa_milestone_count === undefined).length;
        resp.fields = [
          { field_name: 'phone_number', null_count: phone_missing, null_percentage: total? Math.round(10000*phone_missing/total)/100 : 0 },
          { field_name: 'birthday', null_count: birthday_missing, null_percentage: total? Math.round(10000*birthday_missing/total)/100 : 0 },
          { field_name: 'address', null_count: address_missing, null_percentage: total? Math.round(10000*address_missing/total)/100 : 0 },
          { field_name: 'last_name', null_count: last_name_missing, null_percentage: total? Math.round(10000*last_name_missing/total)/100 : 0 },
          { field_name: 'pre_arketa_milestone_count', null_count: milestone_missing, null_percentage: total? Math.round(10000*milestone_missing/total)/100 : 0 },
        ].sort((a,b)=> b.null_percentage - a.null_percentage);
        break;
      }
      case 'missing_phone_counts': {
        const total = rows.length;
        const with_phone = rows.filter(r=> !!r.phone_number).length;
        const without_phone = total - with_phone;
        resp.total_clients = total; resp.with_phone = with_phone; resp.without_phone = without_phone; resp.missing_phone_pct = total? Math.round(10000*without_phone/total)/100 : 0; break;
      }
      case 'incomplete_names': {
        const list = rows.filter(r=> !r.last_name).sort((a,b)=> (b.last_seen?.getTime()||0)-(a.last_seen?.getTime()||0)).slice(0, limit)
          .map(r=> ({ client_name: r.client_name, first_name: r.first_name, last_name: r.last_name, client_email: r.client_email, last_seen: r.last_seen }));
        resp.list=list; resp.count=list.length; break;
      }
      case 'duplicate_emails': {
        const map = new Map<string, number>();
        for (const r of rows) if (r.client_email) map.set(r.client_email, (map.get(r.client_email)||0)+1);
        resp.duplicates = Array.from(map.entries()).filter(([_,c])=> c>1).map(([email, duplicate_count])=> ({ client_email: email, duplicate_count }));
        break;
      }
      case 'duplicate_phones': {
        const map = new Map<string, { count:number; names:string[] }>();
        for (const r of rows) if (r.phone_number) {
          const entry = map.get(r.phone_number) || { count: 0, names: [] };
          entry.count++; entry.names.push(r.client_name || `${r.first_name||''} ${r.last_name||''}`.trim());
          map.set(r.phone_number, entry);
        }
        resp.duplicates = Array.from(map.entries()).filter(([_,v])=> v.count>1).map(([phone_number, v])=> ({ phone_number, duplicate_count: v.count, client_names: v.names.join(', ') }));
        break;
      }
      case 'no_tags_stats': {
        const total = rows.length;
        const no_tags = rows.filter(r => r.tags_arr.length === 0).length;
        resp.total_clients = total; resp.no_tags = no_tags; resp.with_tags = total-no_tags; resp.no_tags_pct = total? Math.round(10000*no_tags/total)/100 : 0; break;
      }
      case 'profile_completeness_breakdown': {
        const counts: Record<string, number> = { Complete:0, 'Essential Complete':0, Incomplete:0 };
        for (const r of rows) {
          const complete = r.client_name && r.first_name && r.last_name && r.client_email && r.phone_number && r.birthday && r.address && r.agree_to_liability_waiver;
          const essential = r.client_name && r.first_name && r.client_email && r.phone_number && r.agree_to_liability_waiver;
          const key = complete ? 'Complete' : essential ? 'Essential Complete' : 'Incomplete';
          counts[key]++;
        }
        const total = rows.length;
        resp.breakdown = Object.entries(counts).map(([k,v])=> ({ profile_status: k, client_count: v, percentage: total? Math.round(10000*v/total)/100 : 0 }));
        break;
      }
      case 'acquisition_by_month': {
        const months = new Map<string, { new_clients:number; classpass_clients:number; direct_clients:number }>();
        for (const r of rows) if (r.first_seen) {
          const key = monthKey(r.first_seen);
          const entry = months.get(key) || { new_clients:0, classpass_clients:0, direct_clients:0 };
          entry.new_clients++;
          if (hasClassPass(r.tags)) entry.classpass_clients++; else entry.direct_clients++;
          months.set(key, entry);
        }
        resp.months = Array.from(months.entries()).sort((a,b)=> a[0]<b[0]?1:-1).map(([month, m])=> ({ month, ...m }));
        break;
      }
      case 'growth_trend': {
        const series = new Map<string, number>();
        for (const r of rows) if (r.first_seen) {
          const key = monthKey(r.first_seen);
          series.set(key, (series.get(key)||0)+1);
        }
        const ordered = Array.from(series.entries()).sort((a,b)=> a[0]<b[0]? -1 : 1);
        let cumulative = 0; let prev = 0;
        resp.trend = ordered.map(([month, new_clients])=> { cumulative += new_clients; const mom = new_clients - prev; const growth_rate_pct = prev? Math.round(10000 * mom / prev)/100 : null; prev = new_clients; return { month, new_clients, cumulative_clients: cumulative, month_over_month_change: mom, growth_rate_pct } });
        break;
      }
      case 'lifetime_stats': {
        const lifetimes = rows.filter(r => r.first_seen && r.last_seen && r.last_seen > r.first_seen)
          .map(r => (r.last_seen!.getTime() - r.first_seen!.getTime()) / 86400000)
          .sort((a,b)=>a-b);
        const len = lifetimes.length;
        const percentile = (p:number)=> len? lifetimes[Math.min(len-1, Math.max(0, Math.floor(p*len)))] : 0;
        resp.avg_lifetime = Math.round(lifetimes.reduce((a,b)=>a+b,0)/(len||1));
        resp.percentile_25 = Math.round(percentile(0.25));
        resp.median_lifetime = Math.round(percentile(0.5));
        resp.percentile_75 = Math.round(percentile(0.75));
        resp.max_lifetime = Math.round(lifetimes[len-1] || 0);
        resp.min_lifetime = Math.round(lifetimes[0] || 0);
        break;
      }
      case 'milestones_summary': {
        const total = rows.length;
        const with_m = rows.filter(r=> typeof r.pre_arketa_milestone_count === 'number').length;
        const sum = rows.reduce((acc, r)=> acc + (typeof r.pre_arketa_milestone_count === 'number'? r.pre_arketa_milestone_count : 0), 0);
        const max = rows.reduce((acc, r)=> Math.max(acc, typeof r.pre_arketa_milestone_count === 'number'? r.pre_arketa_milestone_count : 0), 0);
        resp.total_clients = total; resp.clients_with_milestones = with_m; resp.total_milestones = sum; resp.avg_milestones_per_client = total? Math.round(100*(sum/total))/100 : 0; resp.max_milestones = max; break;
      }
      case 'milestones_distribution': {
        const buckets: Record<string, number> = { 'No Milestones':0, '0 Milestones':0, '1-5 Milestones':0, '6-10 Milestones':0, '11-20 Milestones':0, '20+ Milestones':0 };
        for (const r of rows) {
          const v = typeof r.pre_arketa_milestone_count === 'number' ? r.pre_arketa_milestone_count : null;
          const key = v===null? 'No Milestones' : v===0? '0 Milestones' : v<=5? '1-5 Milestones' : v<=10? '6-10 Milestones' : v<=20? '11-20 Milestones' : '20+ Milestones';
          buckets[key]++;
        }
        resp.distribution = Object.entries(buckets).map(([milestone_range, client_count])=> ({ milestone_range, client_count }));
        break;
      }
      case 'registration_by_hour': {
        const counts: number[] = Array(24).fill(0);
        for (const r of rows) if (r.first_seen) counts[r.first_seen.getHours()]++;
        resp.by_hour = counts.map((registrations, hour_of_day)=> ({ hour_of_day, registrations }));
        break;
      }
      case 'registration_by_dow': {
        const counts: number[] = Array(7).fill(0);
        for (const r of rows) if (r.first_seen) counts[r.first_seen.getDay()]++;
        resp.by_day = counts.map((registrations, day_number)=> ({ day_number, registrations }));
        break;
      }
      case 'retention_by_source': {
        const map: Record<string, { total:number; active:number; at_risk:number; churned:number }> = {};
        for (const r of rows) {
          const key = hasClassPass(r.tags) ? 'ClassPass' : 'Direct';
          map[key] ||= { total:0, active:0, at_risk:0, churned:0 };
          map[key].total++;
          const days = r.last_seen ? diffDays(now, r.last_seen) : Infinity;
          if (days <= 30) map[key].active++; else if (days <= 90) map[key].at_risk++; else map[key].churned++;
        }
        resp.stats = Object.entries(map).map(([client_type, v])=> ({ client_type, total_clients: v.total, active: v.active, at_risk: v.at_risk, churned: v.churned, active_rate: v.total? Math.round(10000*v.active/v.total)/100:0, churn_rate: v.total? Math.round(10000*v.churned/v.total)/100:0 }));
        break;
      }
      case 'classpass_conversion_proxy': {
        const cp = rows.filter(r=> hasClassPass(r.tags));
        const total = cp.length;
        const opted = cp.filter(r=> r.marketing_email_opt_in === true).length;
        const long_term = cp.filter(r=> r.first_seen && r.last_seen && diffDays(r.last_seen, r.first_seen) > 90).length;
        resp.total_classpass_clients = total; resp.opted_into_direct_marketing = opted; resp.long_term_classpass = long_term; resp.potential_conversion_rate = total? Math.round(10000*opted/total)/100 : 0; break;
      }
      case 'optin_rates_by_source': {
        const map: Record<string, { total:number; email:number; sms:number }> = { ClassPass:{total:0,email:0,sms:0}, Direct:{total:0,email:0,sms:0} };
        for (const r of rows) {
          const key = hasClassPass(r.tags)? 'ClassPass':'Direct';
          map[key].total++;
          if (r.marketing_email_opt_in) map[key].email++;
          if (r.marketing_text_opt_in) map[key].sms++;
        }
        resp.stats = Object.entries(map).map(([client_type, v])=> ({ client_type, total_clients: v.total, email_opt_ins: v.email, sms_opt_ins: v.sms, email_opt_in_rate: v.total? Math.round(10000*v.email/v.total)/100 : 0, sms_opt_in_rate: v.total? Math.round(10000*v.sms/v.total)/100 : 0 }));
        break;
      }
      case 'waiver_by_source': {
        const map: Record<string, { total:number; completed:number }> = { ClassPass:{total:0,completed:0}, Direct:{total:0,completed:0} };
        for (const r of rows) {
          const key = hasClassPass(r.tags)? 'ClassPass':'Direct';
          map[key].total++;
          if (r.agree_to_liability_waiver) map[key].completed++;
        }
        resp.stats = Object.entries(map).map(([client_type, v])=> ({ client_type, total_clients: v.total, waiver_completed: v.completed, completion_rate: v.total? Math.round(10000*v.completed/v.total)/100 : 0 }));
        break;
      }
      case 'engagement_duration_by_source': {
        const toDays = (r:any)=> r.first_seen && r.last_seen && r.last_seen > r.first_seen ? (r.last_seen.getTime()-r.first_seen.getTime())/86400000 : null;
        const map: Record<string, number[]> = { ClassPass:[], Direct:[] };
        for (const r of rows) {
          const d = toDays(r); if (d===null) continue;
          map[hasClassPass(r.tags)? 'ClassPass':'Direct'].push(d);
        }
        const stats = (arr:number[])=> {
          arr.sort((a,b)=>a-b);
          const len = arr.length; const median = len? arr[Math.floor(len/2)] : 0;
          const avg = len? arr.reduce((a,b)=>a+b,0)/len : 0;
          const max = len? arr[len-1]:0; return { count: len, avg: Math.round(avg), median: Math.round(median), max: Math.round(max) };
        };
        resp.stats = Object.entries(map).map(([client_type, arr])=> ({ client_type, total_clients: arr.length, avg_engagement_duration: stats(arr).avg, median_duration: stats(arr).median, max_duration: stats(arr).max }));
        break;
      }
      case 'lapsed_with_optins_30_90': {
        const list = rows.filter(r=> r.last_seen && diffDays(now, r.last_seen) >= 30 && diffDays(now, r.last_seen) < 90 && (r.marketing_email_opt_in || r.marketing_text_opt_in))
          .sort((a,b)=> (b.pre_arketa_milestone_count||0)-(a.pre_arketa_milestone_count||0) || (b.last_seen?.getTime()||0)-(a.last_seen?.getTime()||0))
          .slice(0, limit)
          .map(r=> ({ name: r.client_name || `${r.first_name||''} ${r.last_name||''}`.trim(), email: r.client_email, phone: r.phone_number, last_seen: r.last_seen, days_inactive: diffDays(now, r.last_seen!), marketing_email_opt_in: !!r.marketing_email_opt_in, marketing_text_opt_in: !!r.marketing_text_opt_in, pre_arketa_milestone_count: r.pre_arketa_milestone_count || 0 }));
        resp.list=list; resp.count=list.length; break;
      }
      case 'regular_but_lapsed_60_90': {
        const list = rows.filter(r=> r.first_seen && r.last_seen && diffDays(now, r.last_seen) >= 60 && diffDays(now, r.last_seen) <= 90 && ((r.last_seen.getTime()-r.first_seen.getTime())/86400000) > 30)
          .sort((a,b)=> ((b.last_seen!.getTime()-b.first_seen!.getTime()) - (a.last_seen!.getTime()-a.first_seen!.getTime())))
          .slice(0, limit)
          .map(r=> ({ name: r.client_name || `${r.first_name||''} ${r.last_name||''}`.trim(), email: r.client_email, phone: r.phone_number, first_visit: r.first_seen, last_visit: r.last_seen, days_engaged: Math.round((r.last_seen!.getTime()-r.first_seen!.getTime())/86400000), days_inactive: diffDays(now, r.last_seen!) }));
        resp.list=list; resp.count=list.length; break;
      }
      case 'inactive_birthdays_soon': {
        const list = rows.filter(r=> (!r.last_seen || diffDays(now, r.last_seen) >= 30) && nextBirthdayWithinDays(r.birthday, 30))
          .sort((a,b)=> ((a.birthday?.getMonth()||0)-(b.birthday?.getMonth()||0)) || ((a.birthday?.getDate()||0)-(b.birthday?.getDate()||0)))
          .slice(0, limit)
          .map(r=> ({ name: r.client_name || `${r.first_name||''} ${r.last_name||''}`.trim(), email: r.client_email, phone: r.phone_number, birthday: r.birthday, last_seen: r.last_seen, days_inactive: r.last_seen? diffDays(now, r.last_seen) : null }));
        resp.list=list; resp.count=list.length; break;
      }
      case 'inactive_channel_reachability': {
        const inactive = rows.filter(r=> !r.last_seen || diffDays(now, r.last_seen) >= 30);
        const total = inactive.length;
        const email_reachable = inactive.filter(r=> r.marketing_email_opt_in).length;
        const sms_reachable = inactive.filter(r=> r.marketing_text_opt_in && r.phone_number).length;
        const any_channel_reachable = inactive.filter(r=> r.marketing_email_opt_in || (r.marketing_text_opt_in && r.phone_number)).length;
        resp.total_inactive = total; resp.email_reachable=email_reachable; resp.sms_reachable=sms_reachable; resp.any_channel_reachable=any_channel_reachable; resp.email_reach_pct= total? Math.round(10000*email_reachable/total)/100 : 0; resp.sms_reach_pct= total? Math.round(10000*sms_reachable/total)/100 : 0; break;
      }
      case 'journey_buckets': {
        const counts: Record<string, { count:number; total_days:number }> = { 'Single Visit':{count:0,total_days:0}, 'Week Trial':{count:0,total_days:0}, 'Month Trial':{count:0,total_days:0}, 'Quarter Regular':{count:0,total_days:0}, 'Long Term':{count:0,total_days:0} };
        for (const r of rows) if (r.first_seen && r.last_seen) {
          const days = (r.last_seen.getTime()-r.first_seen.getTime())/86400000;
          const key = (r.first_seen.toDateString() === r.last_seen.toDateString()) ? 'Single Visit' : days<=7? 'Week Trial' : days<=30? 'Month Trial' : days<=90? 'Quarter Regular' : 'Long Term';
          counts[key].count++; counts[key].total_days += days;
        }
        const total = Object.values(counts).reduce((a,b)=>a+b.count,0);
        resp.buckets = Object.entries(counts).map(([journey_type, v])=> ({ journey_type, client_count: v.count, percentage: total? Math.round(10000*v.count/total)/100 : 0, avg_duration: v.count? Math.round(v.total_days/v.count) : 0 }));
        break;
      }
      case 'same_day_vs_returned': {
        const total = rows.length;
        const same_day = rows.filter(r=> r.first_seen && r.last_seen && r.first_seen.toDateString() === r.last_seen.toDateString()).length;
        const returned_later = total - same_day;
        resp.total_clients = total; resp.same_day_only = same_day; resp.returned_later = returned_later; resp.same_day_only_pct = total? Math.round(10000*same_day/total)/100 : 0; break;
      }
      case 'contact_info_retention_correlation': {
        const map: Record<string, { total:number; active:number }> = { Complete:{total:0,active:0}, 'Has Phone':{total:0,active:0}, Minimal:{total:0,active:0} };
        for (const r of rows) {
          const level = (r.phone_number && r.birthday && r.address) ? 'Complete' : (r.phone_number ? 'Has Phone' : 'Minimal');
          map[level].total++;
          const active = r.last_seen ? diffDays(now, r.last_seen) <= 30 : false;
          if (active) map[level].active++;
        }
        resp.stats = Object.entries(map).map(([contact_level, v])=> ({ contact_level, total_clients: v.total, active_clients: v.active, active_rate: v.total? Math.round(10000*v.active/v.total)/100 : 0 })).sort((a,b)=> b.active_rate-a.active_rate);
        break;
      }
      case 'seasonal_registration_patterns': {
        const counts: number[] = Array(12).fill(0);
        for (const r of rows) if (r.first_seen) counts[r.first_seen.getMonth()]++;
        const total = rows.filter(r=> r.first_seen).length;
        resp.by_month = counts.map((new_registrations, month_num)=> ({ month_num: month_num+1, new_registrations, percentage: total? Math.round(10000*new_registrations/total)/100 : 0 }));
        break;
      }
      case 'first_visit_time_of_day_buckets': {
        const buckets: Record<string, number> = { 'Early Morning (0-6)':0, 'Morning (6-12)':0, 'Afternoon (12-17)':0, 'Evening (17-21)':0, 'Night (21-24)':0 };
        for (const r of rows) if (r.first_seen) {
          const h = r.first_seen.getHours();
          if (h < 6) buckets['Early Morning (0-6)']++; else if (h < 12) buckets['Morning (6-12)']++; else if (h < 17) buckets['Afternoon (12-17)']++; else if (h < 21) buckets['Evening (17-21)']++; else buckets['Night (21-24)']++;
        }
        const total = Object.values(buckets).reduce((a,b)=>a+b,0);
        resp.buckets = Object.entries(buckets).map(([time_period, visit_count])=> ({ time_period, visit_count, percentage: total? Math.round(10000*visit_count/total)/100 : 0 }));
        break;
      }
      default:
        resp.error = `Unknown metric: ${metric}`;
    }

    return resp;
  },
  async generate_image(params: { prompt: string; size?: string; quality?: string; style?: string }) {
    console.log("🎨 Generating image with prompt:", params.prompt);
    
    try {
      const response = await supabase.functions.invoke('generate-image', {
        body: {
          prompt: params.prompt,
          size: params.size || '1024x1024',
          quality: params.quality || 'high',
          output_format: 'png'
        }
      });

      if (response.error) {
        console.log(`❌ Image generation error: ${JSON.stringify(response.error, null, 2)}`);
        throw new Error(`Image generation failed: ${response.error.message || 'Unknown error'}`);
      }
      
      console.log("✅ Image generated successfully");
      
      return {
        image_url: response.data.image,
        prompt: response.data.usedPrompt || params.prompt,
        size: params.size || '1024x1024',
        quality: params.quality || 'high'
      };
    } catch (error) {
      console.log(`❌ Image generation error: ${error.message}`);
      throw error;
    }
  },
};

type ToolName = keyof typeof tools;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!anthropic) {
      return new Response(
        JSON.stringify({ error: "Missing ANTHROPIC_API_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!supabase) {
      return new Response(
        JSON.stringify({ error: "Supabase not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { question } = await req.json();
    const userQuestion = (question ?? "").toString().trim();
    if (!userQuestion) {
      return new Response(
        JSON.stringify({ error: "Question is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const instructions = `You are Fred, the Talo Yoga studio assistant.
- You can answer questions about customers by calling analytics tools.
- You can also generate images from text descriptions using the generate_image tool.
- For image requests, always use the generate_image tool to create marketing materials, posters, social media content, etc.
- Prefer the analytics tool for natural-language analytics questions.
- Format all responses using GitHub Flavored Markdown.
- Use headings, bold text, and bullet points to structure your answers clearly.
- For lists, use markdown asterisks (*). For example:
  * This is a bullet point.
  * This is another bullet point.
- Keep answers concise and actionable.
- If data is insufficient, say so and suggest the next step.

Intent mapping examples (use these to choose analytics metric and args):
- "Who hasn’t visited in 60–90 days" -> analytics(metric="inactive_bucket", bucket="60-90")
- "Who’s active last 30 days" -> analytics(metric="recent_active", periodDays=30)
- "Retention by cohort" -> analytics(metric="retention_by_cohort")
- "Upcoming birthdays" -> analytics(metric="upcoming_birthdays_30d")
- "ClassPass vs direct retention" -> analytics(metric="retention_by_source")
- "Missing phone numbers" -> analytics(metric="missing_phone_counts")
- "Duplicate emails" -> analytics(metric="duplicate_emails")
- "Age distribution" -> analytics(metric="age_distribution")
- "Waiver completion rate" -> analytics(metric="waiver_overall_rate")`;

    const toolDefs = [
      {
        name: "get_inactive_customers",
        description: "List customers who have not attended in N days (or never).",
        input_schema: {
          type: "object",
          properties: {
            days: { type: "number", description: "Days since last class" },
            limit: { type: "number", description: "Max records" },
          },
        },
      },
      {
        name: "get_customers_by_status",
        description: "List customers filtered by status (e.g., prospect, intro_trial, drop_in).",
        input_schema: {
          type: "object",
          properties: {
            status: { type: "string" },
            limit: { type: "number" },
          },
          required: ["status"],
        },
      },
      {
        name: "get_top_customers_by_ltv",
        description: "Top customers by lifetime value.",
        input_schema: {
          type: "object",
          properties: { limit: { type: "number" } },
        },
      },
      {
        name: "search_customers",
        description: "Search customers by name or email.",
        input_schema: {
          type: "object",
          properties: {
            query: { type: "string" },
            limit: { type: "number" },
          },
          required: ["query"],
        },
      },
      {
        name: "get_customers_created_in_month",
        description: "List customers created in a specific month and year (defaults to current year).",
        input_schema: {
          type: "object",
          properties: {
            month: { anyOf: [ { type: "string" }, { type: "number" } ] },
            year: { type: "number" },
            limit: { type: "number" },
          },
          required: ["month"],
        },
      },
      {
        name: "stats_overview",
        description: "Return counts by status for customers.",
        input_schema: { type: "object", properties: {} },
      },
      {
        name: "analytics",
        description: "Comprehensive analytics over customers. Metrics include: recent_active, inactive_bucket (bucket: '30-60'|'60-90'|'90+'), avg_lifetime, longest_standing, one_time_vs_repeat, retention_by_cohort, early_engaged_inactive, marketing_optins_summary, active_no_marketing, phone_without_sms_optin, marketing_retention_correlation, transactional_not_marketing, contact_info_completeness, classpass_optin_summary, waiver_missing_recent, waiver_overall_rate, recent_no_waiver_7d, waiver_rate_by_tenure, classpass_without_waivers, source_split, age_distribution, upcoming_birthdays_30d, birthdays_by_month, birthday_completion_rate, city_distribution, tag_distribution, missing_fields_overview, missing_phone_counts, incomplete_names, duplicate_emails, duplicate_phones, no_tags_stats, profile_completeness_breakdown, acquisition_by_month, growth_trend, lifetime_stats, milestones_summary, milestones_distribution, registration_by_hour, registration_by_dow, retention_by_source, classpass_conversion_proxy, optin_rates_by_source, waiver_by_source, engagement_duration_by_source, lapsed_with_optins_30_90, regular_but_lapsed_60_90, inactive_birthdays_soon, inactive_channel_reachability, journey_buckets, same_day_vs_returned, contact_info_retention_correlation, seasonal_registration_patterns, first_visit_time_of_day_buckets.",
        input_schema: {
          type: "object",
          properties: {
            metric: { type: "string" },
            periodDays: { type: "number" },
            bucket: { type: "string" },
            limit: { type: "number" }
          },
          required: ["metric"]
        }
      },
      {
        name: "generate_image",
        description: "Generate an image from a text description using AI. Perfect for creating marketing materials, social media content, studio imagery, or any visual content for the yoga business.",
        input_schema: {
          type: "object",
          properties: {
            prompt: { 
              type: "string", 
              description: "Detailed description of the image to generate" 
            },
            size: { 
              type: "string", 
              description: "Image size (1024x1024, 1536x1024, 1024x1536)", 
              enum: ["1024x1024", "1536x1024", "1024x1536"] 
            },
            quality: { 
              type: "string", 
              description: "Image quality level", 
              enum: ["high", "medium", "low"] 
            }
          },
          required: ["prompt"]
        }
      },
    ];

    // Run Anthropic Messages API with tools loop
    const toolLoopMessages: any[] = [
      { role: "user", content: [{ type: "text", text: userQuestion }] }
    ];

    let finalText = "";
    for (let i = 0; i < 3; i++) {
      const resp = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        temperature: 0.2,
        system: instructions,
        tools: toolDefs as any,
        messages: toolLoopMessages as any,
      });

      const toolUses = (resp.content || []).filter((c: any) => c.type === "tool_use");
      const textParts = (resp.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n").trim();

      if (toolUses.length === 0) {
        finalText = textParts || finalText;
        break;
      }

      // Add assistant content with tool_use calls
      toolLoopMessages.push({ role: "assistant", content: resp.content as any });

      // Execute tools
      const toolResults: any[] = [];
      for (const tu of toolUses as any[]) {
        const name = tu.name as ToolName;
        const input = tu.input || {};
        try {
          if (!tools[name]) throw new Error(`Unknown tool: ${name}`);
          const output = await (tools[name] as any)(input);
          toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(output) });
        } catch (e) {
          toolResults.push({ type: "tool_result", tool_use_id: tu.id, is_error: true, content: String(e) });
        }
      }
      // Provide results to the model
      toolLoopMessages.push({ role: "user", content: toolResults as any });
    }

    if (!finalText) {
      finalText = "I couldn’t find enough info to answer that. Try being more specific (e.g., ‘inactive for 30 days’, ‘customers created in July 2024’, or ‘prospects named Alex’).";
    }

    return new Response(JSON.stringify({ text: finalText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ask-fred error", error);
    return new Response(JSON.stringify({ error: (error as Error).message || "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
