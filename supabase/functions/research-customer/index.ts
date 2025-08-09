import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing OPENAI_API_KEY. Please add it to Supabase secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { input, customer } = body || {};

    const name = [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || "";
    const email = customer?.email || "";

    const userQuery = typeof input === "string" && input.trim().length > 0
      ? input.trim()
      : `Research public web information to personalize outreach for ${name || email}.`;

    const system = `You are a precise, concise research assistant for a yoga studio CRM.
- Use real, current web results via the web_search tool.
- Focus on publicly available, consented information.
- If multiple people share the same name, disambiguate cautiously and state uncertainty.
- Never fabricate facts; include source links.
- Output sections: Summary, Key Facts, Recent Mentions, Potential Talking Points, Sources.`;

    const personContext = `Customer context:
Name: ${name || "Unknown"}
Email: ${email || "Unknown"}
Notes: ${customer?.notes || "-"}
Interests/Tags: ${(customer?.engagement_metrics?.tags || []).join(", ") || "-"}`;

    // Call OpenAI Responses API with hosted web_search tool
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-2025-04-14",
        temperature: 0.2,
        max_output_tokens: 900,
        tools: [{ type: "web_search" }],
        tool_choice: "auto",
        instructions: system,
        input: `${personContext}\n\nUser question: ${userQuery}\n\nReturn sections: Summary, Key Facts, Recent Mentions, Potential Talking Points, Sources.`,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI web_search error:", data);
      const message = data?.error?.message || "OpenAI web_search request failed";
      return new Response(
        JSON.stringify({ error: message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prefer 'output_text' if present (Responses API convenience field)
    const text = (data?.output_text as string) || (() => {
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

    return new Response(
      JSON.stringify({ text }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in research-customer function:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
