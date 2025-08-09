import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.27.3?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing ANTHROPIC_API_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    const { prompt, model, messages, temperature, max_tokens } = await req.json();

    const selectedModel = model ?? "claude-3-5-haiku-20241022"; // see useful-context for latest models

    const result = await anthropic.messages.create({
      model: selectedModel,
      temperature: typeof temperature === "number" ? temperature : 0.5,
      max_tokens: typeof max_tokens === "number" ? max_tokens : 500,
      messages: Array.isArray(messages) && messages.length > 0
        ? messages
        : [
            {
              role: "user",
              content: typeof prompt === "string" ? prompt : "",
            },
          ],
    } as any);

    // Extract first text block
    const text = Array.isArray((result as any)?.content)
      ? ((result as any).content.find((p: any) => p?.type === "text")?.text ?? "")
      : "";

    return new Response(
      JSON.stringify({ text, result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("ai-sdk error", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
