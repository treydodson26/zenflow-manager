import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_WHATSAPP_NUMBER = "+16505252662";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { to, message, customer_id, template_sid, template_variables } = await req.json();

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Missing Twilio API credentials" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare Twilio API request
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    
    // Format phone number for WhatsApp
    const formattedTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
    const formattedFrom = `whatsapp:${TWILIO_WHATSAPP_NUMBER}`;

    // Prepare message payload
    const formData = new URLSearchParams();
    formData.append("From", formattedFrom);
    formData.append("To", formattedTo);

    // Use template or regular message
    if (template_sid) {
      formData.append("ContentSid", template_sid);
      if (template_variables) {
        formData.append("ContentVariables", JSON.stringify(template_variables));
      }
    } else {
      formData.append("Body", message);
    }

    // Send via Twilio
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const data = await resp.json();
    
    if (!resp.ok) {
      console.error("Twilio error", data);
    }

    // Log communication to database
    await supabase.from("communications_log").insert({
      customer_id: customer_id ?? null,
      message_sequence_id: 0,
      message_type: "whatsapp_twilio",
      recipient_phone: to,
      content: template_sid ? `Template: ${template_sid}` : message,
      delivery_status: resp.ok ? "sent" : "error",
      twilio_message_sid: data?.sid ?? null,
      error_message: resp.ok ? null : (data?.message ?? "send error"),
    });

    return new Response(JSON.stringify({ 
      ok: resp.ok, 
      data,
      message_sid: data?.sid 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: resp.ok ? 200 : 500,
    });
  } catch (e) {
    console.error("send-twilio-whatsapp error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});