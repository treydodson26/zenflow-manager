import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  : null as any;

async function callOpenAI(body: any) {
  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  return { ok: resp.ok, data };
}

async function continueOpenAI(responseId: string, tool_outputs: any[]) {
  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ response_id: responseId, tool_outputs }),
  });
  const data = await resp.json();
  return { ok: resp.ok, data };
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
  async stats_overview() {
    // Fetch statuses and compute counts client-side to avoid raw SQL aggregates
    const { data, error } = await supabase
      .from("customers")
      .select("status")
      .limit(1000);
    if (error) throw error;
    const counts: Record<string, number> = {};
    for (const row of data || []) {
      const s = (row.status || "unknown").toString();
      counts[s] = (counts[s] || 0) + 1;
    }
    return counts;
  },
};

type ToolName = keyof typeof tools;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing OPENAI_API_KEY" }),
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
- You can answer questions about customers by calling tools.
- Keep answers concise and actionable. Include counts and short bullet lists.
- If data is insufficient, say so and suggest the next step.`;

    const toolDefs = [
      {
        type: "function",
        name: "get_inactive_customers",
        description: "List customers who have not attended in N days (or never).",
        parameters: {
          type: "object",
          properties: {
            days: { type: "number", description: "Days since last class" },
            limit: { type: "number", description: "Max records" },
          },
        },
      },
      {
        type: "function",
        name: "get_customers_by_status",
        description: "List customers filtered by status (e.g., prospect, intro_trial, drop_in).",
        parameters: {
          type: "object",
          properties: {
            status: { type: "string" },
            limit: { type: "number" },
          },
          required: ["status"],
        },
      },
      {
        type: "function",
        name: "get_top_customers_by_ltv",
        description: "Top customers by lifetime value.",
        parameters: {
          type: "object",
          properties: { limit: { type: "number" } },
        },
      },
      {
        type: "function",
        name: "search_customers",
        description: "Search customers by name or email.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string" },
            limit: { type: "number" },
          },
          required: ["query"],
        },
      },
      {
        type: "function",
        name: "stats_overview",
        description: "Return counts by status for customers.",
        parameters: { type: "object", properties: {} },
      },
    ];

    // Initial request
    let { ok, data } = await callOpenAI({
      model: "gpt-4o-mini",
      instructions,
      input: userQuestion,
      temperature: 0.2,
      tools: toolDefs,
      tool_choice: "auto",
    });

    if (!ok) {
      console.error("ask-fred initial call error", data);
      return new Response(JSON.stringify({ error: data?.error?.message || "OpenAI error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle tool loop up to 3 iterations
    let iterations = 0;
    while (iterations < 3 && data?.required_action?.type === "submit_tool_outputs") {
      iterations++;
      const calls = data.required_action.submit_tool_outputs.tool_calls || [];
      const outputs: any[] = [];

      for (const call of calls) {
        const name: ToolName = call.function.name as ToolName;
        const args = (() => { try { return JSON.parse(call.function.arguments || "{}"); } catch { return {}; } })();
        try {
          if (!tools[name]) throw new Error(`Unknown tool: ${name}`);
          const result = await (tools[name] as any)(args);
          outputs.push({ tool_call_id: call.id, output: JSON.stringify(result) });
        } catch (e) {
          outputs.push({ tool_call_id: call.id, output: JSON.stringify({ error: String(e) }) });
        }
      }

      const cont = await continueOpenAI(data.id, outputs);
      if (!cont.ok) {
        console.error("ask-fred continuation error", cont.data);
        return new Response(JSON.stringify({ error: cont.data?.error?.message || "OpenAI error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      data = cont.data;
    }

    const text: string = data?.output_text
      || (() => {
        try {
          const output = data?.output || [];
          for (const item of output) {
            const contents = item?.content || [];
            for (const c of contents) {
              if (c?.type === "output_text" && typeof c?.text === "string") return c.text;
              if (c?.type === "text" && typeof c?.text === "string") return c.text;
            }
          }
        } catch {}
        return "";
      })();

    return new Response(JSON.stringify({ text }), {
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
