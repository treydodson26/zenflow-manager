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
    console.log("📱 Received inbound WhatsApp webhook");
    
    const body = await req.text();
    console.log("Webhook body:", body);
    
    // Parse Twilio webhook payload
    const params = new URLSearchParams(body);
    const messageStatus = params.get('MessageStatus');
    const messageSid = params.get('MessageSid');
    const from = params.get('From')?.replace('whatsapp:', '') || '';
    const to = params.get('To')?.replace('whatsapp:', '') || '';
    const messageBody = params.get('Body') || '';
    const numMedia = parseInt(params.get('NumMedia') || '0');
    
    // If this is a status update for outbound message
    if (messageStatus && messageSid) {
      console.log(`📊 Status update for ${messageSid}: ${messageStatus}`);
      
      // Update delivery status in communications_log
      const { error: updateError } = await supabase
        .from('communications_log')
        .update({ 
          delivery_status: messageStatus,
          delivered_at: ['delivered', 'read'].includes(messageStatus) ? new Date().toISOString() : null,
          read_at: messageStatus === 'read' ? new Date().toISOString() : null
        })
        .eq('twilio_message_sid', messageSid);
        
      if (updateError) {
        console.error("Error updating delivery status:", updateError);
      }
    }
    
    // If this is an inbound message from customer
    if (messageBody && from && !messageStatus) {
      console.log(`📨 Inbound message from ${from}: ${messageBody}`);
      
      // Find customer by phone number
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id, first_name, last_name, client_email')
        .eq('phone_number', from)
        .single();
        
      if (customerError && customerError.code !== 'PGRST116') {
        console.error("Error finding customer:", customerError);
      }
      
      // Log the inbound message
      const { error: logError } = await supabase
        .from('communications_log')
        .insert({
          customer_id: customer?.id || null,
          message_sequence_id: 0,
          message_type: 'whatsapp_inbound',
          recipient_phone: from, // The sender becomes the recipient in our log
          content: messageBody,
          delivery_status: 'received',
          twilio_message_sid: messageSid,
          created_at: new Date().toISOString(),
          delivered_at: new Date().toISOString()
        });
        
      if (logError) {
        console.error("Error logging inbound message:", logError);
      } else {
        console.log("✅ Logged inbound WhatsApp message");
      }
      
      // Handle media attachments if any
      if (numMedia > 0) {
        console.log(`📎 Message contains ${numMedia} media attachments`);
        // Could download and store media files here
      }
    }
    
    // Twilio expects a TwiML response
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/xml" 
      },
    });
    
  } catch (error) {
    console.error("Inbound WhatsApp webhook error:", error);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, {
      status: 200, // Still return 200 to avoid Twilio retries
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/xml" 
      },
    });
  }
});