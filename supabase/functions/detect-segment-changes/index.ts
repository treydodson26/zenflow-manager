import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SegmentChange {
  customer_id: number;
  customer_name: string;
  customer_email: string;
  old_segment: string;
  new_segment: string;
  change_type: string; // 'new_customer', 'segment_change', 'reactivation', 'upgrade', 'downgrade'
  previous_spend: number;
  current_spend: number;
  spend_change: number;
  days_since_last_visit: number | null;
}

interface ChangeDetectionResult {
  success: boolean;
  snapshot_id: string;
  total_changes: number;
  changes: SegmentChange[];
  change_summary: Record<string, number>;
  processing_time_ms: number;
}

function categorizeChange(oldSegment: string, newSegment: string): string {
  if (oldSegment === newSegment) return 'no_change';
  
  const segmentHierarchy = {
    'prospect': 1,
    'intro_offer': 2,
    'drop_in': 3,
    'membership': 4
  };

  const oldLevel = segmentHierarchy[oldSegment] || 0;
  const newLevel = segmentHierarchy[newSegment] || 0;

  if (oldLevel === 0) return 'new_customer';
  if (newLevel > oldLevel) return 'upgrade';
  if (newLevel < oldLevel) return 'downgrade';
  return 'segment_change';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { snapshot_id } = await req.json();

    if (!snapshot_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'snapshot_id is required',
          changes: []
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`🔍 Detecting segment changes since snapshot: ${snapshot_id}`);

    // Get the snapshot data
    const { data: snapshot, error: snapshotError } = await supabase
      .from('customer_segment_snapshots')
      .select('*')
      .eq('snapshot_id', snapshot_id)
      .single();

    if (snapshotError || !snapshot) {
      throw new Error(`Snapshot not found: ${snapshot_id}`);
    }

    const snapshotData = snapshot.snapshot_data as any[];
    console.log(`📊 Comparing against snapshot with ${snapshotData.length} customers`);

    // Get current customer segments
    const { data: currentSegments, error: currentError } = await supabase
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
          last_seen
        )
      `);

    if (currentError) {
      throw new Error(`Failed to fetch current segments: ${currentError.message}`);
    }

    // Get customers without segments (prospects)
    const { data: customersWithoutSegments, error: prospectsError } = await supabase
      .from('customers')
      .select('id, first_name, last_name, client_email, last_seen, total_lifetime_value')
      .not('id', 'in', currentSegments?.map(cs => cs.customer_id) || []);

    if (prospectsError) {
      throw new Error(`Failed to fetch prospect customers: ${prospectsError.message}`);
    }

    // Combine current data
    const currentCustomers = [
      ...(currentSegments || []).map(cs => ({
        customer_id: cs.customer_id,
        segment_type: cs.segment_type,
        total_spend: cs.total_spend || 0,
        last_visit_date: cs.last_visit_date,
        first_name: cs.customers.first_name,
        last_name: cs.customers.last_name,
        client_email: cs.customers.client_email,
        last_seen: cs.customers.last_seen
      })),
      ...(customersWithoutSegments || []).map(c => ({
        customer_id: c.id,
        segment_type: 'prospect',
        total_spend: c.total_lifetime_value || 0,
        last_visit_date: null,
        first_name: c.first_name,
        last_name: c.last_name,
        client_email: c.client_email,
        last_seen: c.last_seen
      }))
    ];

    // Create lookup maps
    const snapshotMap = new Map();
    snapshotData.forEach(customer => {
      snapshotMap.set(customer.customer_id, customer);
    });

    const currentMap = new Map();
    currentCustomers.forEach(customer => {
      currentMap.set(customer.customer_id, customer);
    });

    // Detect changes
    const changes: SegmentChange[] = [];
    const changeSummary: Record<string, number> = {};

    // Check all current customers against snapshot
    for (const currentCustomer of currentCustomers) {
      const customerId = currentCustomer.customer_id;
      const snapshotCustomer = snapshotMap.get(customerId);

      const oldSegment = snapshotCustomer?.segment_type || 'new_customer';
      const newSegment = currentCustomer.segment_type;
      const changeType = categorizeChange(oldSegment, newSegment);

      if (changeType !== 'no_change') {
        const previousSpend = snapshotCustomer?.total_spend || 0;
        const currentSpend = currentCustomer.total_spend;
        const spendChange = currentSpend - previousSpend;

        // Calculate days since last visit
        let daysSinceLastVisit = null;
        if (currentCustomer.last_seen) {
          const lastSeenDate = new Date(currentCustomer.last_seen);
          const now = new Date();
          daysSinceLastVisit = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60 * 60 * 24));
        }

        const change: SegmentChange = {
          customer_id: customerId,
          customer_name: `${currentCustomer.first_name} ${currentCustomer.last_name}`,
          customer_email: currentCustomer.client_email,
          old_segment: oldSegment,
          new_segment: newSegment,
          change_type: changeType,
          previous_spend: previousSpend,
          current_spend: currentSpend,
          spend_change: spendChange,
          days_since_last_visit: daysSinceLastVisit
        };

        changes.push(change);
        changeSummary[changeType] = (changeSummary[changeType] || 0) + 1;
      }
    }

    // Check for customers who disappeared (unlikely in practice)
    for (const snapshotCustomer of snapshotData) {
      if (!currentMap.has(snapshotCustomer.customer_id)) {
        const change: SegmentChange = {
          customer_id: snapshotCustomer.customer_id,
          customer_name: `${snapshotCustomer.first_name} ${snapshotCustomer.last_name}`,
          customer_email: snapshotCustomer.client_email,
          old_segment: snapshotCustomer.segment_type,
          new_segment: 'removed',
          change_type: 'customer_removed',
          previous_spend: snapshotCustomer.total_spend || 0,
          current_spend: 0,
          spend_change: -(snapshotCustomer.total_spend || 0),
          days_since_last_visit: null
        };

        changes.push(change);
        changeSummary['customer_removed'] = (changeSummary['customer_removed'] || 0) + 1;
      }
    }

    console.log(`🎯 Detected ${changes.length} changes:`, changeSummary);

    const result: ChangeDetectionResult = {
      success: true,
      snapshot_id,
      total_changes: changes.length,
      changes,
      change_summary: changeSummary,
      processing_time_ms: Date.now() - startTime
    };

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error detecting segment changes:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        snapshot_id: '',
        total_changes: 0,
        changes: [],
        change_summary: {},
        processing_time_ms: Date.now() - startTime
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})