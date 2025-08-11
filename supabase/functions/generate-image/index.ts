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

    // Step 1: Expand the user's prompt into a detailed image prompt using GPT-4.1
    const systemMessage = `# Overview
You are an expert image prompt engineer. Your role is to take a simple image topic or concept and expand it into a fully detailed image prompt that can be fed into a text-to-image generation model.

## Prompt Instructions
Your detailed prompt must clearly describe the following:
1) Main Subject: What is the primary focus of the image?
2) Background/Setting: What is happening in the background or environment?
3) Style: Specify the visual style (e.g., hyper-realistic, digital painting, watercolor, anime, 3D render, etc.).
4) Mood/Lighting: Describe the emotional tone and lighting (e.g., soft warm sunset, moody storm clouds, futuristic neon lights).
5) Additional Details: Mention any specific objects, clothing, colors, textures, or notable features that should appear.

## Output Format
- Begin with a clean, natural-sounding descriptive prompt that integrates all of the above elements seamlessly.
- The description should sound like it’s written specifically for an AI to generate a professional, high-quality image.
- Avoid repeating the original topic verbatim — instead, reframe it into a vivid scene or visual concept.
- Use rich, vivid language and imagery.

## Example
- Input: "A futuristic city"
- Output: "A sprawling futuristic city at night, glowing with neon lights in shades of blue and purple. Towering skyscrapers with sleek, glass facades line the horizon. Flying cars zoom between the buildings under a cloudy, electric sky. The streets below are bustling with holographic advertisements and people wearing high-tech fashion. Digital painting style, highly detailed, cinematic perspective, moody atmosphere with soft neon reflections on wet pavement."`;

    const chatRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-2025-04-14",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: String(prompt) }
        ],
        temperature: 0.7,
      }),
    });

    const chatData = await chatRes.json();
    if (!chatRes.ok) {
      console.error("Prompt expansion error:", chatData);
      const msg = chatData?.error?.message || "Prompt expansion failed";
      return new Response(
        JSON.stringify({ error: msg }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let finalPrompt = chatData?.choices?.[0]?.message?.content ?? prompt;
    // Mimic the n8n workflow behavior: remove all double quotes and trim
    finalPrompt = String(finalPrompt).replace(/\"/g, '"').replace(/"/g, "").trim();

    // Step 2: Generate the image using gpt-image-1 with the expanded prompt
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: finalPrompt,
        size,
        background,
        quality,
        output_format,
        n: 1,
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
      JSON.stringify({ image, usedPrompt: finalPrompt }),
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
