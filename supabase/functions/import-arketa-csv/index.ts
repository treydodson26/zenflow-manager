import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ImportResult {
  success: boolean;
  total_customers: number;
  new_customers: number;
  updated_customers: number;
  segment_changes: Array<{
    customer_id: number;
    customer_name: string;
    old_segment: string;
    new_segment: string;
    change_type: string;
  }>;
  processing_time_ms: number;
  snapshot_id: string;
  errors: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const result: ImportResult = {
    success: false,
    total_customers: 0,
    new_customers: 0,
    updated_customers: 0,
    segment_changes: [],
    processing_time_ms: 0,
    snapshot_id: '',
    errors: []
  };

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const formData = await req.formData();
    const clientListFile = formData.get('client_list') as File;
    const clientAttendanceFile = formData.get('client_attendance') as File;

    if (!clientListFile || !clientAttendanceFile) {
      result.errors.push('Both client_list and client_attendance CSV files are required');
      return new Response(
        JSON.stringify(result),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`🚀 Starting CSV import pipeline: ${clientListFile.name}, ${clientAttendanceFile.name}`);

    // Step 1: Validate CSV format
    console.log('📋 Step 1: Validating CSV format...');
    const validationResponse = await supabase.functions.invoke('validate-csv-format', {
      body: {
        client_list_content: await clientListFile.text(),
        client_attendance_content: await clientAttendanceFile.text()
      }
    });

    if (validationResponse.error || !validationResponse.data?.valid) {
      result.errors.push(`CSV validation failed: ${validationResponse.data?.errors?.join(', ') || 'Unknown validation error'}`);
      return new Response(
        JSON.stringify(result),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { client_list_data, client_attendance_data } = validationResponse.data;
    console.log(`✅ Validation passed: ${client_list_data.length} customers, ${client_attendance_data.length} attendance records`);

    // Step 2: Create daily snapshot
    console.log('📸 Step 2: Creating daily snapshot...');
    const snapshotResponse = await supabase.functions.invoke('create-daily-snapshot', {
      body: { source: 'arketa_csv_import' }
    });

    if (snapshotResponse.error) {
      result.errors.push(`Snapshot creation failed: ${snapshotResponse.error.message}`);
      return new Response(
        JSON.stringify(result),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    result.snapshot_id = snapshotResponse.data.snapshot_id;
    console.log(`✅ Snapshot created: ${result.snapshot_id}`);

    // Step 3: Process customer list and update/insert customers
    console.log('👥 Step 3: Processing customer data...');
    
    for (const customerData of client_list_data) {
      try {
        // Find matching attendance data for this customer
        const attendanceRecord = client_attendance_data.find(
          (attendance: any) => attendance.client_email === customerData.client_email
        );

        // Upsert customer record
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('client_email', customerData.client_email)
          .single();

        const customerPayload = {
          client_name: customerData.client_name || `${customerData.first_name} ${customerData.last_name}`,
          first_name: customerData.first_name,
          last_name: customerData.last_name,
          client_email: customerData.client_email,
          phone_number: customerData.phone_number,
          status: customerData.status || 'prospect',
          source: customerData.source || 'arketa_import',
          first_seen: customerData.first_seen ? new Date(customerData.first_seen).toISOString() : null,
          last_seen: customerData.last_seen ? new Date(customerData.last_seen).toISOString() : null,
          first_class_date: attendanceRecord?.first_class_date ? new Date(attendanceRecord.first_class_date).toISOString().split('T')[0] : null,
          last_class_date: attendanceRecord?.last_class_date ? new Date(attendanceRecord.last_class_date).toISOString().split('T')[0] : null,
          total_lifetime_value: parseFloat(customerData.total_lifetime_value || '0'),
          intro_start_date: customerData.intro_start_date ? new Date(customerData.intro_start_date).toISOString().split('T')[0] : null,
          intro_end_date: customerData.intro_end_date ? new Date(customerData.intro_end_date).toISOString().split('T')[0] : null,
          conversion_date: customerData.conversion_date ? new Date(customerData.conversion_date).toISOString().split('T')[0] : null,
          marketing_email_opt_in: customerData.marketing_email_opt_in === 'true' || customerData.marketing_email_opt_in === true,
          marketing_text_opt_in: customerData.marketing_text_opt_in === 'true' || customerData.marketing_text_opt_in === true,
          agree_to_liability_waiver: customerData.agree_to_liability_waiver === 'true' || customerData.agree_to_liability_waiver === true,
          updated_at: new Date().toISOString()
        };

        if (existingCustomer) {
          await supabase
            .from('customers')
            .update(customerPayload)
            .eq('id', existingCustomer.id);
          result.updated_customers++;
        } else {
          await supabase
            .from('customers')
            .insert({
              ...customerPayload,
              created_at: new Date().toISOString()
            });
          result.new_customers++;
        }

        result.total_customers++;

        // Step 4: Calculate customer segment for each customer
        const pricingPlan = attendanceRecord?.last_pricing_option_used || null;
        const customerId = existingCustomer?.id || (await supabase
          .from('customers')
          .select('id')
          .eq('client_email', customerData.client_email)
          .single()).data?.id;

        if (customerId) {
          await supabase.functions.invoke('calculate-customer-segment', {
            body: {
              customer_id: customerId,
              pricing_plan_name: pricingPlan
            }
          });
        }

      } catch (error) {
        console.error(`Error processing customer ${customerData.client_email}:`, error);
        result.errors.push(`Failed to process customer ${customerData.client_email}: ${error.message}`);
      }
    }

    console.log(`✅ Processed ${result.total_customers} customers (${result.new_customers} new, ${result.updated_customers} updated)`);

    // Step 5: Detect segment changes
    console.log('🔍 Step 5: Detecting segment changes...');
    const changesResponse = await supabase.functions.invoke('detect-segment-changes', {
      body: { snapshot_id: result.snapshot_id }
    });

    if (changesResponse.error) {
      result.errors.push(`Segment change detection failed: ${changesResponse.error.message}`);
    } else {
      result.segment_changes = changesResponse.data.changes || [];
      console.log(`✅ Detected ${result.segment_changes.length} segment changes`);
    }

    // Log the import to csv_imports table
    await supabase.from('csv_imports').insert({
      filename: `${clientListFile.name}, ${clientAttendanceFile.name}`,
      status: 'completed',
      total_records: result.total_customers,
      new_records: result.new_customers,
      updated_records: result.updated_customers,
      failed_records: result.errors.length,
      processing_time_ms: Date.now() - startTime,
      completed_at: new Date().toISOString(),
      error_details: result.errors.length > 0 ? { errors: result.errors } : null
    });

    result.processing_time_ms = Date.now() - startTime;
    result.success = true;

    console.log(`🎉 CSV import pipeline completed successfully in ${result.processing_time_ms}ms`);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Critical error in CSV import pipeline:', error);
    result.errors.push(`Critical pipeline error: ${error.message}`);
    result.processing_time_ms = Date.now() - startTime;

    // Log failed import
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      await supabase.from('csv_imports').insert({
        filename: 'failed_import',
        status: 'failed',
        total_records: 0,
        new_records: 0,
        updated_records: 0,
        failed_records: 1,
        processing_time_ms: result.processing_time_ms,
        error_details: { errors: result.errors }
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify(result),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})