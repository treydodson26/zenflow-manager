import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SnapshotResult {
  success: boolean;
  snapshot_id: string;
  total_customers: number;
  segment_breakdown: Record<string, number>;
  created_at: string;
  source: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { source = 'manual_trigger' } = await req.json();
    const snapshotId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    console.log(`📸 Creating daily snapshot: ${snapshotId} (source: ${source})`);

    // Get current customer segments
    const { data: customerSegments, error: segmentsError } = await supabase
      .from('customer_segments')
      .select(`
        customer_id,
        segment_type,
        total_spend,
        last_visit_date,
        customers!inner (
          first_name,
          last_name,
          client_email,
          status
        )
      `);

    if (segmentsError) {
      console.error('Error fetching customer segments:', segmentsError);
      throw new Error(`Failed to fetch customer segments: ${segmentsError.message}`);
    }

    // Also get customers without segments (prospects)
    const { data: customersWithoutSegments, error: customersError } = await supabase
      .from('customers')
      .select('id, first_name, last_name, client_email, status')
      .not('id', 'in', customerSegments?.map(cs => cs.customer_id) || []);

    if (customersError) {
      console.error('Error fetching customers without segments:', customersError);
      throw new Error(`Failed to fetch customers: ${customersError.message}`);
    }

    // Combine all customer data for snapshot
    const allCustomerData = [
      ...(customerSegments || []).map(cs => ({
        customer_id: cs.customer_id,
        segment_type: cs.segment_type,
        total_spend: cs.total_spend,
        last_visit_date: cs.last_visit_date,
        first_name: cs.customers.first_name,
        last_name: cs.customers.last_name,
        client_email: cs.customers.client_email,
        status: cs.customers.status
      })),
      ...(customersWithoutSegments || []).map(c => ({
        customer_id: c.id,
        segment_type: 'prospect', // Default for customers without explicit segments
        total_spend: 0,
        last_visit_date: null,
        first_name: c.first_name,
        last_name: c.last_name,
        client_email: c.client_email,
        status: c.status
      }))
    ];

    // Calculate segment breakdown
    const segmentBreakdown: Record<string, number> = {};
    allCustomerData.forEach(customer => {
      const segment = customer.segment_type || 'prospect';
      segmentBreakdown[segment] = (segmentBreakdown[segment] || 0) + 1;
    });

    // Create snapshot record in a dedicated table
    await supabase.from('customer_segment_snapshots').insert({
      snapshot_id: snapshotId,
      created_at: timestamp,
      source: source,
      total_customers: allCustomerData.length,
      segment_breakdown: segmentBreakdown,
      snapshot_data: allCustomerData
    });

    console.log(`✅ Snapshot created successfully: ${allCustomerData.length} customers across ${Object.keys(segmentBreakdown).length} segments`);

    const result: SnapshotResult = {
      success: true,
      snapshot_id: snapshotId,
      total_customers: allCustomerData.length,
      segment_breakdown: segmentBreakdown,
      created_at: timestamp,
      source: source
    };

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error creating daily snapshot:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        snapshot_id: '',
        total_customers: 0,
        segment_breakdown: {},
        created_at: new Date().toISOString(),
        source: ''
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})