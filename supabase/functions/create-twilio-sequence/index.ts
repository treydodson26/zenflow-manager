import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!);

interface TwilioSequenceRequest {
  name: string;
  description?: string;
  messages: {
    day: number;
    content: string;
    delay_minutes?: number;
  }[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    console.log("🔧 Creating Twilio messaging sequence...");
    
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Missing Twilio API credentials" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { name, description, messages }: TwilioSequenceRequest = await req.json();
    const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    
    // 1. Create a Messaging Service in Twilio
    console.log("📱 Creating Twilio Messaging Service...");
    
    const messagingServiceUrl = `https://messaging.twilio.com/v1/Services`;
    const serviceData = new URLSearchParams();
    serviceData.append("FriendlyName", `${name} - Talo Yoga`);
    if (description) {
      serviceData.append("InboundRequestUrl", `${SUPABASE_URL}/functions/v1/handle-inbound-whatsapp`);
      serviceData.append("StatusCallback", `${SUPABASE_URL}/functions/v1/handle-inbound-whatsapp`);
    }
    
    const serviceResp = await fetch(messagingServiceUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: serviceData.toString(),
    });
    
    const serviceResult = await serviceResp.json();
    
    if (!serviceResp.ok) {
      console.error("Twilio service creation error:", serviceResult);
      throw new Error(`Failed to create messaging service: ${serviceResult.message || 'Unknown error'}`);
    }
    
    console.log("✅ Created Twilio Messaging Service:", serviceResult.sid);
    
    // 2. Create Content Templates for each message
    const templateSids = [];
    
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      console.log(`📝 Creating template for Day ${message.day}...`);
      
      const templateUrl = `https://content.twilio.com/v1/Content`;
      const templateData = new URLSearchParams();
      templateData.append("FriendlyName", `${name} Day ${message.day}`);
      templateData.append("Language", "en");
      
      // Create the content template structure
      const contentTemplate = {
        1: { // WhatsApp template version
          body: {
            text: message.content
          }
        }
      };
      
      templateData.append("Types", JSON.stringify({ "twilio/text": contentTemplate }));
      
      const templateResp = await fetch(templateUrl, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: templateData.toString(),
      });
      
      const templateResult = await templateResp.json();
      
      if (!templateResp.ok) {
        console.error(`Template creation error for Day ${message.day}:`, templateResult);
        // Continue with other templates even if one fails
      } else {
        console.log(`✅ Created template for Day ${message.day}:`, templateResult.sid);
        templateSids.push({
          day: message.day,
          content_sid: templateResult.sid,
          content: message.content
        });
      }
    }
    
    // 3. Store the sequence configuration in our database
    console.log("💾 Storing sequence in database...");
    
    const { data: sequenceRecord, error: dbError } = await supabase
      .from('twilio_sequences')
      .insert({
        name,
        description,
        twilio_service_sid: serviceResult.sid,
        template_sids: templateSids,
        active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error(`Failed to store sequence: ${dbError.message}`);
    }
    
    // 4. Also create/update corresponding message_sequences records
    for (const template of templateSids) {
      await supabase
        .from('message_sequences')
        .upsert({
          day: template.day,
          message_type: 'whatsapp',
          subject: null,
          content: template.content,
          active: true,
          twilio_content_sid: template.content_sid
        }, {
          onConflict: 'day,message_type'
        });
    }
    
    console.log("✅ Twilio sequence created successfully");
    
    return new Response(JSON.stringify({ 
      success: true,
      messaging_service_sid: serviceResult.sid,
      sequence_id: sequenceRecord.id,
      templates_created: templateSids.length,
      templates: templateSids
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    
  } catch (error) {
    console.error("Create Twilio sequence error:", error);
    return new Response(JSON.stringify({ 
      error: "Failed to create Twilio sequence",
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});