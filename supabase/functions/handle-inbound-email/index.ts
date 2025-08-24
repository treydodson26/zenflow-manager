import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    console.log("📧 Received inbound email webhook");
    
    const payload = await req.json();
    console.log("Email webhook payload:", JSON.stringify(payload, null, 2));
    
    // Handle Resend webhook events
    const { type, data } = payload;
    
    if (type === 'email.delivered') {
      // Update delivery status
      const { error: updateError } = await supabase
        .from('communications_log')
        .update({ 
          delivery_status: 'delivered',
          delivered_at: new Date().toISOString()
        })
        .eq('email_message_id', data.email_id);
        
      if (updateError) {
        console.error("Error updating email delivery status:", updateError);
      } else {
        console.log(`✅ Updated delivery status for email ${data.email_id}`);
      }
    }
    
    if (type === 'email.bounced' || type === 'email.complaint') {
      // Update to error status
      const { error: updateError } = await supabase
        .from('communications_log')
        .update({ 
          delivery_status: 'error',
          error_message: data.reason || 'Email bounced or complaint'
        })
        .eq('email_message_id', data.email_id);
        
      if (updateError) {
        console.error("Error updating email error status:", updateError);
      } else {
        console.log(`❌ Updated error status for email ${data.email_id}: ${data.reason}`);
      }
    }
    
    // Handle inbound email replies (if using Resend inbound)
    if (type === 'email.received') {
      console.log(`📨 Inbound email from ${data.from}: ${data.subject}`);
      
      // Find customer by email
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id, first_name, last_name, client_email')
        .eq('client_email', data.from)
        .single();
        
      if (customerError && customerError.code !== 'PGRST116') {
        console.error("Error finding customer:", customerError);
      }
      
      // Log the inbound email
      const { error: logError } = await supabase
        .from('communications_log')
        .insert({
          customer_id: customer?.id || null,
          message_sequence_id: 0,
          message_type: 'email_inbound',
          recipient_email: data.from, // The sender becomes the recipient in our log
          subject: data.subject,
          content: data.html || data.text || '',
          delivery_status: 'received',
          email_message_id: data.message_id,
          created_at: new Date().toISOString(),
          delivered_at: new Date().toISOString()
        });
        
      if (logError) {
        console.error("Error logging inbound email:", logError);
      } else {
        console.log("✅ Logged inbound email");
      }
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json" 
      },
    });
    
  } catch (error) {
    console.error("Inbound email webhook error:", error);
    return new Response(JSON.stringify({ 
      error: "Webhook processing failed",
      details: error.message 
    }), {
      status: 500,
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json" 
      },
    });
  }
});