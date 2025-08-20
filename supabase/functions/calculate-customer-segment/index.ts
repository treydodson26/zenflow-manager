import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CustomerAnalytics {
  totalBookings: number;
  attendedClasses: number;
  noShows: number;
  cancellations: number;
  daysSinceLastVisit: number;
  daysSinceFirstVisit: number;
  averageMonthlyVisits: number;
  totalSpent: number;
  isIntroActive: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl!, serviceRole!);

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

    console.log(`🔍 Analyzing customer ${customer_id} for segmentation...`);

    // Get comprehensive customer data
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customer_id)
      .single();

    if (customerError || !customer) {
      console.error('❌ Error fetching customer:', customerError);
      return new Response(
        JSON.stringify({ error: 'Customer not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get detailed analytics about the customer
    const analytics = await getCustomerAnalytics(supabase, customer_id, customer);
    console.log(`📊 Customer analytics:`, analytics);

    // Determine segment based on comprehensive analysis
    const segmentType = determineCustomerSegment(customer, analytics, pricing_plan_name);
    console.log(`🎯 Assigned segment: ${segmentType}`);

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

    console.log(`✅ Customer ${customer_id} assigned to segment: ${segmentType}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        customer_id,
        segment_type: segmentType,
        total_spend: totalSpent,
        analytics: analytics,
        pricing_plan_used: pricing_plan_name || null
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('💥 Error in calculate-customer-segment function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Get comprehensive customer analytics
async function getCustomerAnalytics(supabase: any, customerId: number, customer: any): Promise<CustomerAnalytics> {
  // Get booking data
  const { data: bookings } = await supabase
    .from('bookings')
    .select('booking_status, checked_in_at, cancelled_at, booking_date')
    .eq('customer_id', customerId);

  const totalBookings = bookings?.length || 0;
  const attendedClasses = bookings?.filter((b: any) => b.checked_in_at).length || 0;
  const noShows = bookings?.filter((b: any) => 
    b.booking_status === 'confirmed' && !b.checked_in_at && !b.cancelled_at
  ).length || 0;
  const cancellations = bookings?.filter((b: any) => b.cancelled_at).length || 0;

  // Calculate time-based metrics
  const now = new Date();
  const lastVisit = customer.last_seen ? new Date(customer.last_seen) : null;
  const firstVisit = customer.first_seen ? new Date(customer.first_seen) : new Date(customer.created_at);
  
  const daysSinceLastVisit = lastVisit ? 
    Math.floor((now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24)) : 999;
  const daysSinceFirstVisit = Math.floor((now.getTime() - firstVisit.getTime()) / (1000 * 60 * 60 * 24));
  
  // Calculate average monthly visits
  const monthsSinceFirst = Math.max(daysSinceFirstVisit / 30, 1);
  const averageMonthlyVisits = attendedClasses / monthsSinceFirst;

  // Check if intro offer is active
  const isIntroActive = customer.status === 'intro_trial' || 
    (customer.intro_start_date && customer.intro_end_date && 
     new Date(customer.intro_end_date) > now);

  return {
    totalBookings,
    attendedClasses,
    noShows,
    cancellations,
    daysSinceLastVisit,
    daysSinceFirstVisit,
    averageMonthlyVisits,
    totalSpent: customer.total_lifetime_value || 0,
    isIntroActive
  };
}

// Determine customer segment based on comprehensive analysis
function determineCustomerSegment(customer: any, analytics: CustomerAnalytics, pricingPlan?: string): string {
  // Priority 1: Active intro offer customers
  if (analytics.isIntroActive) {
    return 'intro_offer';
  }

  // Priority 2: New customers (less than 30 days, limited activity)
  if (analytics.daysSinceFirstVisit <= 30 && analytics.attendedClasses <= 3) {
    return 'new';
  }

  // Priority 3: At-risk customers (haven't visited in 60+ days, had previous activity)
  if (analytics.daysSinceLastVisit >= 60 && analytics.attendedClasses > 0) {
    return 'at_risk';
  }

  // Priority 4: Churned customers (haven't visited in 90+ days)
  if (analytics.daysSinceLastVisit >= 90) {
    return 'churned';
  }

  // Priority 5: VIP customers (high spend, frequent visits)
  if (analytics.totalSpent >= 500 && analytics.averageMonthlyVisits >= 8) {
    return 'vip';
  }

  // Priority 6: Regular customers (consistent attendance)
  if (analytics.averageMonthlyVisits >= 4 && analytics.attendedClasses >= 10) {
    return 'regular';
  }

  // Priority 7: Occasional customers (some attendance but irregular)
  if (analytics.attendedClasses >= 3 && analytics.averageMonthlyVisits >= 1) {
    return 'occasional';
  }

  // Priority 8: Drop-in customers (purchased classes but low frequency)
  if (analytics.totalBookings > 0 || analytics.totalSpent > 0) {
    return 'drop_in';
  }

  // Default: Prospects (signed up but no significant activity)
  return 'prospect';
}