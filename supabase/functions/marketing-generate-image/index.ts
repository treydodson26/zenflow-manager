import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

function sanitizeFilename(input: string) {
  return input
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .slice(0, 80);
}

function dayStartIso(d = new Date()) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x.toISOString();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing required Supabase/OpenAI secrets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse body
    const { prompt, title, size = "1024x1024", style = "vivid", metadata } = await req.json();

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return new Response(
        JSON.stringify({ error: "'prompt' is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authHeader.replace("Bearer ", "").trim();
    const supabaseUserClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: userData, error: userErr } = await supabaseUserClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid user" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = userData.user.id;

    // Admin client for DB/storage ops
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Rate limiting: daily cap 20
    const dayIso = dayStartIso();
    const { data: rlRows, error: rlErr } = await supabase
      .from("user_rate_limits")
      .select("request_count, window_start")
      .eq("user_id", userId)
      .gte("window_start", dayIso);
    if (rlErr) console.error("rate limit read error", rlErr);
    const usedToday = (rlRows || []).reduce((acc: number, r: any) => acc + (r.request_count || 0), 0);
    if (usedToday >= 20) {
      return new Response(JSON.stringify({ error: "Daily limit reached (20)" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Soft concurrency: if user created >=5 images in last 30s, block
    const thirtyAgo = new Date(Date.now() - 30 * 1000).toISOString();
    const { data: recentImgs } = await supabase
      .from("marketing_images")
      .select("id")
      .eq("user_id", userId)
      .gte("created_at", thirtyAgo);
    if ((recentImgs || []).length >= 5) {
      return new Response(JSON.stringify({ error: "Too many concurrent generations. Please wait a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Step 1: Enhance prompt using GPT-4.1 with Talo Yoga context
    const systemPrompt = `# Overview
You are an expert image prompt engineer. Your role is to take a simple image topic or concept and expand it into a fully detailed image prompt that can be fed into a text-to-image generation model.

## Prompt Instructions
Your detailed prompt must clearly describe the following:

Main Subject: What is the primary focus of the image?
Background/Setting: What is happening in the background or environment?
Style: Specify the visual style (e.g., hyper-realistic, digital painting, watercolor, anime, 3D render, etc.).
Mood/Lighting: Describe the emotional tone and lighting (e.g., soft warm sunset, moody storm clouds, futuristic neon lights).
Additional Details: Mention any specific objects, clothing, colors, textures, or notable features that should appear.

## Output Format

Begin with a clean, natural-sounding descriptive prompt that integrates all of the above elements seamlessly.
The description should sound like it's written specifically for an AI to generate a professional, high-quality image.
Avoid repeating the original topic verbatim — instead, reframe it into a vivid scene or visual concept.
Use rich, vivid language and imagery.

## Context for Talo Yoga
This is for Talo Yoga studio in Palo Alto. Keep imagery peaceful, inclusive, and professional. Focus on themes of wellness, community, and transformation. Avoid overly spiritual or exclusive imagery.`;

    const chatRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-2025-04-14",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: String(prompt) }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });
    const chatJson = await chatRes.json();
    if (!chatRes.ok) {
      console.error("Prompt enhancement error", chatJson);
      return new Response(JSON.stringify({ error: chatJson?.error?.message || "Prompt enhancement failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    let enhancedPrompt: string = chatJson?.choices?.[0]?.message?.content || String(prompt);
    enhancedPrompt = enhancedPrompt.replace(/\"/g, '"').replace(/"/g, "").trim();

    // Step 2: Generate image via gpt-image-1, expect base64
    const imgRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: enhancedPrompt,
        size,
        quality: "hd",
        style,
        n: 1,
      }),
    });

    const imgJson = await imgRes.json();
    if (!imgRes.ok) {
      console.error("Image API error", imgJson);
      return new Response(JSON.stringify({ error: imgJson?.error?.message || "Image generation failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const b64 = imgJson?.data?.[0]?.b64_json || imgJson?.data?.[0]?.b64Json; // be lenient
    if (!b64) {
      return new Response(JSON.stringify({ error: "No image data returned" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Decode base64 to bytes
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

    // Step 3: Store in storage and DB
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const safeTitle = sanitizeFilename(title || prompt.slice(0, 50));
    const path = `ai_artifacts/${userId}/marketing/${ts}_${safeTitle}.png`;

    const { error: uploadErr } = await supabase.storage
      .from("ai_artifacts")
      .upload(path, bytes, { contentType: "image/png", upsert: false });
    if (uploadErr) {
      console.error("Upload error", uploadErr);
      return new Response(JSON.stringify({ error: uploadErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create a 7-day signed URL
    const { data: signed, error: signErr } = await supabase.storage
      .from("ai_artifacts")
      .createSignedUrl(path, 7 * 24 * 3600);
    if (signErr || !signed?.signedUrl) {
      console.error("Signed URL error", signErr);
      return new Response(JSON.stringify({ error: signErr?.message || "Failed to create signed URL" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Insert DB record
    const record = {
      user_id: userId,
      title: title || prompt.slice(0, 50),
      original_prompt: prompt,
      enhanced_prompt: enhancedPrompt,
      image_url: signed.signedUrl,
      storage_path: path,
      size,
      style,
      campaign: metadata?.campaign ?? null,
      tags: metadata?.tags ?? null,
      metadata: metadata ?? null,
    };
    const { error: insErr } = await supabase.from("marketing_images").insert(record);
    if (insErr) {
      console.error("DB insert error", insErr);
      // continue: still return the image even if logging fails
    }

    // Increment rate limit counter for today
    const { data: existing } = await supabase
      .from("user_rate_limits")
      .select("request_count, window_start")
      .eq("user_id", userId)
      .eq("window_start", dayIso)
      .maybeSingle();
    if (existing) {
      await supabase
        .from("user_rate_limits")
        .update({ request_count: (existing.request_count || 0) + 1 })
        .eq("user_id", userId)
        .eq("window_start", existing.window_start);
    } else {
      await supabase
        .from("user_rate_limits")
        .insert({ user_id: userId, window_start: dayIso, request_count: 1 });
    }

    return new Response(
      JSON.stringify({
        success: true,
        image: {
          url: signed.signedUrl,
          title: record.title,
          originalPrompt: prompt,
          enhancedPrompt,
          metadata: record.metadata,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("marketing-generate-image error", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
