import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const resend = new Resend(RESEND_API_KEY);
const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!);

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  customer_id?: number;
  sequence_day?: number;
  from?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, html, customer_id, sequence_day, from }: EmailRequest = await req.json();

    if (!RESEND_API_KEY) {
      console.error("Missing RESEND_API_KEY environment variable");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, html" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log(`Sending email to: ${to}, subject: ${subject}`);

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: from || "Talo Yoga <no-reply@taloyoga.com>",
      to: [to],
      subject: subject,
      html: html,
    });

    console.log("Resend response:", emailResponse);

    // Log the communication to Supabase
    if (customer_id) {
      const { error: logError } = await supabase
        .from("communications_log")
        .insert({
          customer_id: customer_id,
          message_type: "email",
          recipient: to,
          content: html,
          subject: subject,
          delivery_status: emailResponse.error ? "failed" : "sent",
          external_message_id: emailResponse.data?.id || null,
          error_message: emailResponse.error?.message || null,
          sequence_day: sequence_day,
          sent_at: new Date().toISOString(),
        });

      if (logError) {
        console.error("Error logging communication:", logError);
        // Don't fail the entire request if logging fails
      }
    }

    if (emailResponse.error) {
      console.error("Resend error:", emailResponse.error);
      return new Response(
        JSON.stringify({ 
          error: "Failed to send email", 
          details: emailResponse.error.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message_id: emailResponse.data?.id,
        recipient: to,
        subject: subject,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error in send-email function:", error);
    
    // Log failed communication attempt if customer_id was provided
    try {
      const body = await req.clone().json();
      if (body.customer_id) {
        await supabase
          .from("communications_log")
          .insert({
            customer_id: body.customer_id,
            message_type: "email",
            recipient: body.to || "unknown",
            content: body.html || "",
            subject: body.subject || "",
            delivery_status: "failed",
            error_message: error.message,
            sequence_day: body.sequence_day,
            sent_at: new Date().toISOString(),
          });
      }
    } catch (logError) {
      console.error("Error logging failed communication:", logError);
    }

    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});