import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set in Supabase Edge Function secrets");
    }

    const body = await req.json().catch(() => ({}));
    const {
      prompt,
      size = "1024x1024",
      output_format = "png", // png | jpeg | webp
      background = "auto",   // transparent | opaque | auto (gpt-image-1)
      quality = "auto",      // high | medium | low | auto (gpt-image-1)
    } = body || {};

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return new Response(
        JSON.stringify({ error: "Missing required field: prompt" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        size,
        background,
        quality,
        response_format: "b64_json",
        output_format,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI error response:", data);
      const message = data?.error?.message || "OpenAI API request failed";
      return new Response(
        JSON.stringify({ error: message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) {
      return new Response(
        JSON.stringify({ error: "No image returned from provider" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mime = output_format === "jpeg" ? "jpeg" : output_format; // png | webp | jpeg
    const image = `data:image/${mime};base64,${b64}`;

    return new Response(
      JSON.stringify({ image }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-image function:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
