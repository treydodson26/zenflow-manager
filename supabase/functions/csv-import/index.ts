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
  console.error("Missing Supabase env vars");
}

const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!);

function toISODate(input?: string | null): string | null {
  if (!input) return null;
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function toBool(value: any): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (["true", "yes", "1"].includes(v)) return true;
    if (["false", "no", "0"].includes(v)) return false;
  }
  if (typeof value === "number") return value !== 0;
  return null;
}

function cleanPhone(input?: string | null): string | null {
  if (!input) return null;
  const digits = String(input).replace(/\D/g, "");
  if (digits.length === 10) return "+1" + digits; // US fallback
  if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
  if (digits.length >= 8) return "+" + digits; // generic fallback
  return null;
}

function isValidEmail(email?: string | null): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function statusFromData(row: any): string {
  const tags = (row.tags || "").toLowerCase();
  const firstSeen = row.first_seen ? new Date(row.first_seen) : null;
  const lastSeen = row.last_seen ? new Date(row.last_seen) : null;
  const now = new Date();

  if (tags.includes("member")) return "active_member";
  if (tags.includes("intro")) return "intro_offer";
  if (lastSeen && (now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24) > 30) return "inactive";
  if (firstSeen && lastSeen && firstSeen.getTime() === lastSeen.getTime()) return "prospect";
  return "general";
}

function augmentTags(tags?: string | null): string | null {
  if (!tags) return null;
  const parts = tags.split(",").map((t) => t.trim());
  const lower = tags.toLowerCase();
  const add: string[] = [];
  if (/(prenatal)/.test(lower)) add.push("prenatal");
  if (/(senior|60\+)/.test(lower)) add.push("senior");
  const result = Array.from(new Set([...parts, ...add])).filter(Boolean).join(", ");
  return result || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    if (req.method === "GET" && url.searchParams.get("action") === "lastImport") {
      const { data, error } = await supabase
        .from("csv_imports")
        .select("id, completed_at, created_at, filename, status")
        .order("completed_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return new Response(JSON.stringify({ lastImport: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const records: any[] = Array.isArray(body?.records) ? body.records : [];
    const options = body?.options || {};
    const filename: string | null = body?.filename ?? null;

    // Allow action-based requests (e.g., lastImport) via POST as well
    if (body?.action === "lastImport") {
      const { data, error } = await supabase
        .from("csv_imports")
        .select("id, completed_at, created_at, filename, status")
        .order("completed_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return new Response(JSON.stringify({ lastImport: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!records.length) {
      return new Response(JSON.stringify({ error: "No records provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const start = Date.now();

    // Create import log row (processing)
    const { data: logRow, error: logErr } = await supabase
      .from("csv_imports")
      .insert({ filename, total_records: records.length, status: "processing" })
      .select("id")
      .single();
    if (logErr) console.error("Failed to create csv_imports log", logErr);

    // Normalize and validate server-side as well
    const normalized = records.map((r) => {
      const first_name = (r.first_name ?? r.FirstName ?? r["First Name"] ?? "").toString().trim();
      const last_name = (r.last_name ?? r.LastName ?? r["Last Name"] ?? "").toString().trim();
      const client_email = (r.client_email ?? r.email ?? r["Client Email"] ?? "").toString().trim();
      const phone_number = cleanPhone(r.phone_number ?? r.phone ?? r["Phone Number"]) ;
      const birthday = toISODate(r.birthday ?? r.Birthday);
      const address = (r.address ?? r.Address ?? "").toString().trim() || null;
      const marketing_email_opt_in = toBool(r.marketing_email_opt_in ?? r["Marketing Email Opt-in"]);
      const marketing_text_opt_in = toBool(r.marketing_text_opt_in ?? r["Marketing Text Opt In"]);
      const agree_to_liability_waiver = toBool(r.agree_to_liability_waiver ?? r["Agree to Liability Waiver"]);
      const pre_arketa_milestone_count = Number(r.pre_arketa_milestone_count ?? r["Pre-Arketa Milestone Count"] ?? 0) || 0;
      const transactional_text_opt_in = toBool(r.transactional_text_opt_in ?? r["Transactional Text Opt In"]);
      const first_seen = toISODate(r.first_seen ?? r["First Seen"]);
      const last_seen = toISODate(r.last_seen ?? r["Last Seen"]);
      const tags = augmentTags((r.tags ?? r.Tags ?? "").toString());
      const client_name = `${first_name} ${last_name}`.trim();

      let intro_start_date = null as string | null;
      if (first_seen) intro_start_date = first_seen;

      const row = {
        first_name,
        last_name,
        client_email,
        phone_number,
        birthday,
        address,
        marketing_email_opt_in,
        marketing_text_opt_in,
        agree_to_liability_waiver,
        pre_arketa_milestone_count,
        transactional_text_opt_in,
        first_seen,
        last_seen,
        tags,
        client_name,
        intro_start_date,
      } as any;

      row.status = statusFromData(row);
      return row;
    });

    // Filter invalid emails and optionally skip duplicates later
    const valid = normalized.filter((r) => isValidEmail(r.client_email));

    // Build email -> record map and fetch existing matches
    const emails = Array.from(new Set(valid.map((r) => r.client_email)));

    const existingMap = new Map<string, any>();
    if (emails.length) {
      const { data: existing, error: exErr } = await supabase
        .from("customers")
        .select("id, client_email")
        .in("client_email", emails);
      if (exErr) console.error("Fetch existing customers error", exErr);
      existing?.forEach((row) => existingMap.set(row.client_email, row));
    }

    const updateExisting = options?.updateExisting !== false;
    const addNew = options?.addNew !== false;
    const duplicateHandling = (options?.handleDuplicates as string) || "update"; // 'update' | 'skip' | 'create'
    const skipDuplicateEmails = !!options?.skipDuplicateEmails;

    const toInsert: any[] = [];
    const toUpdate: Array<{ id: any; values: any }> = [];
    const skipped: any[] = [];

    for (const row of valid) {
      const existing = existingMap.get(row.client_email);
      if (existing) {
        if (skipDuplicateEmails) { skipped.push({ reason: "duplicate", row }); continue; }
        if (duplicateHandling === "skip") { skipped.push({ reason: "duplicate", row }); continue; }
        if (duplicateHandling === "create") {
          if (addNew) toInsert.push(row); else skipped.push({ reason: "no-add", row });
        } else {
          if (updateExisting) toUpdate.push({ id: existing.id, values: row }); else skipped.push({ reason: "no-update", row });
        }
      } else {
        if (addNew) toInsert.push(row); else skipped.push({ reason: "no-add", row });
      }
    }

    let inserted = 0, updated = 0, failed = 0;

    // Insert in bulk (if any)
    if (toInsert.length) {
      const { error } = await supabase.from("customers").insert(toInsert);
      if (error) { console.error("Insert error", error); failed += toInsert.length; } else { inserted = toInsert.length; }
    }

    // Update in chunks
    const chunk = 50;
    for (let i = 0; i < toUpdate.length; i += chunk) {
      const slice = toUpdate.slice(i, i + chunk);
      // Supabase doesn't support multi-row update with different values; do sequential within chunk
      for (const rec of slice) {
        const { error } = await supabase.from("customers").update(rec.values).eq("id", rec.id);
        if (error) { console.error("Update error", error); failed += 1; } else { updated += 1; }
      }
    }

    const totalProcessed = inserted + updated + skipped.length + failed;
    const durationMs = Date.now() - start;

    if (logRow?.id) {
      await supabase.from("csv_imports").update({
        completed_at: new Date().toISOString(),
        processing_time_ms: durationMs,
        new_records: inserted,
        updated_records: updated,
        failed_records: failed,
        total_records: records.length,
        status: "completed",
      }).eq("id", logRow.id);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        total: totalProcessed,
        added: inserted,
        updated,
        skipped: skipped.length,
        errors: failed,
        seconds: Math.round(durationMs / 1000),
        newIntroOffers: valid.filter((r) => r.status === "intro_offer").slice(0, 20).map((r) => r.client_name || `${r.first_name} ${r.last_name}`),
        updatedProspects: valid.filter((r) => r.status === "prospect").slice(0, 20).map((r) => r.client_name || `${r.first_name} ${r.last_name}`),
        failed: failed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("csv-import error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
