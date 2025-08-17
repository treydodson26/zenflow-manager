import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { customer_id, pricing_plan_name } = await req.json();

    if (!customer_id) {
      return new Response(
        JSON.stringify({ error: 'customer_id is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get customer data
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customer_id)
      .single();

    if (customerError || !customer) {
      console.error('Error fetching customer:', customerError);
      return new Response(
        JSON.stringify({ error: 'Customer not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    let segmentType = 'prospect'; // default

    // If a pricing plan name is provided, look it up in the pricing_plans table
    if (pricing_plan_name) {
      const { data: pricingPlan, error: planError } = await supabase
        .from('pricing_plans')
        .select('plan_category')
        .eq('plan_name', pricing_plan_name)
        .single();

      if (!planError && pricingPlan) {
        // Map plan categories to segment types
        switch (pricingPlan.plan_category) {
          case 'Intro':
            segmentType = 'intro_offer';
            break;
          case 'Membership':
            segmentType = 'membership';
            break;
          case 'Drop-In':
            segmentType = 'drop_in';
            break;
          default:
            segmentType = 'prospect';
        }
      } else {
        console.log(`Pricing plan "${pricing_plan_name}" not found in dictionary, using fallback logic`);
        
        // Fallback: Use hardcoded logic if plan not in dictionary
        const introKeywords = ['intro', 'trial', 'new student', 'first time'];
        const membershipKeywords = ['unlimited', 'monthly', 'membership', 'package'];
        const dropInKeywords = ['drop-in', 'single', 'class pass'];
        
        const planLower = pricing_plan_name.toLowerCase();
        
        if (introKeywords.some(keyword => planLower.includes(keyword))) {
          segmentType = 'intro_offer';
        } else if (membershipKeywords.some(keyword => planLower.includes(keyword))) {
          segmentType = 'membership';
        } else if (dropInKeywords.some(keyword => planLower.includes(keyword))) {
          segmentType = 'drop_in';
        }
      }
    } else {
      // No pricing plan provided - use existing customer data
      if (customer.status === 'intro_trial' || customer.intro_start_date) {
        segmentType = 'intro_offer';
      } else {
        // Check if customer has any bookings to determine drop-in vs prospect
        const { data: bookings } = await supabase
          .from('bookings')
          .select('id')
          .eq('customer_id', customer_id)
          .limit(1);

        if (bookings && bookings.length > 0) {
          segmentType = 'drop_in';
        }
      }
    }

    // Calculate additional metrics
    const totalSpent = customer.total_lifetime_value || 0;
    const lastVisitDate = customer.last_seen ? new Date(customer.last_seen).toISOString().split('T')[0] : null;

    // Insert or update customer segment
    const { error: segmentError } = await supabase
      .from('customer_segments')
      .upsert({
        customer_id: customer_id,
        segment_type: segmentType,
        total_spend: totalSpent,
        last_visit_date: lastVisitDate,
        manually_assigned: false,
        notes: pricing_plan_name ? `Auto-assigned from pricing plan: ${pricing_plan_name}` : 'Auto-assigned from customer data'
      }, {
        onConflict: 'customer_id,segment_type'
      });

    if (segmentError) {
      console.error('Error updating customer segment:', segmentError);
      return new Response(
        JSON.stringify({ error: 'Failed to update customer segment' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Customer ${customer_id} assigned to segment: ${segmentType}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        customer_id,
        segment_type: segmentType,
        total_spend: totalSpent,
        pricing_plan_used: pricing_plan_name || null
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in calculate-customer-segment function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})