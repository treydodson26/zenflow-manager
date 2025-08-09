import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
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
    const { input, customer } = await req.json();

    let customerData: any = null;
    if (customer?.id) {
      const { data } = await supabase
        .from("customers")
        .select(
          "id, first_name, last_name, client_email, status, first_class_date, last_class_date, total_lifetime_value, source, customer_segment, tags"
        )
        .eq("id", customer.id)
        .maybeSingle();
      customerData = data;
    } else if (customer?.email) {
      const { data } = await supabase
        .from("customers")
        .select(
          "id, first_name, last_name, client_email, status, first_class_date, last_class_date, total_lifetime_value, source, customer_segment, tags"
        )
        .eq("client_email", customer.email)
        .maybeSingle();
      customerData = data;
    }

    const systemPrompt = `You are a helpful studio operations assistant for a yoga studio.
Use the provided structured JSON context to answer questions precisely about the customer.
If data is missing, say what is unknown and suggest one actionable next step.
Respond concisely with clear bullet points when helpful.`;

    const context = {
      question: input,
      customer: customerData ?? customer ?? null,
    };

    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing ANTHROPIC_API_KEY", text: "AI not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 800,
        temperature: 0.2,
        system: systemPrompt,
        messages: [
          { role: "user", content: [{ type: "text", text: `Context: ${JSON.stringify(context)}\n\nQuestion: ${input}` }] },
        ],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Anthropic error", errText);
      return new Response(JSON.stringify({ error: "Anthropic API error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const text: string = data?.content?.[0]?.text ?? "No response.";

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-ask error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});