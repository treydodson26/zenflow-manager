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
    const { customer_id, segment_type = 'prospect' } = await req.json();

    if (!customer_id) {
      return new Response(JSON.stringify({ error: "customer_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Starting journey for customer ${customer_id} in segment ${segment_type}`);

    // Initialize customer journey using the database function
    const { data, error } = await supabase.rpc('initialize_customer_journey', {
      customer_id_param: customer_id,
      segment_type_param: segment_type
    });

    if (error) {
      console.error("Error initializing journey:", error);
      throw error;
    }

    console.log(`✅ Journey initialized for customer ${customer_id}, journey ID: ${data}`);

    return new Response(JSON.stringify({ 
      success: true, 
      journey_id: data,
      customer_id: customer_id,
      segment_type: segment_type,
      message: "Customer journey started successfully"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Start customer journey error:", error);
    return new Response(JSON.stringify({ 
      error: "Failed to start customer journey", 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});