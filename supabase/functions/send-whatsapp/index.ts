import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { to, text, customer_id } = await req.json();

    if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
      return new Response(
        JSON.stringify({ error: "Missing WhatsApp API secrets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`;
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body: text },
    };

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error("WhatsApp error", data);
    }

    // Log communication
    await supabase.from("communications_log").insert({
      customer_id: customer_id ?? null,
      message_sequence_id: 0,
      message_type: "whatsapp",
      recipient_phone: to,
      content: text,
      delivery_status: resp.ok ? "sent" : "error",
      whatsapp_message_id: data?.messages?.[0]?.id ?? null,
      error_message: resp.ok ? null : (data?.error?.message ?? "send error"),
    });

    return new Response(JSON.stringify({ ok: resp.ok, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: resp.ok ? 200 : 500,
    });
  } catch (e) {
    console.error("send-whatsapp error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});