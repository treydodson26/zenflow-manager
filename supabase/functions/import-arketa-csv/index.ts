import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function safeDateParse(dateString: string): Date | null {
  if (!dateString || typeof dateString !== 'string') return null;
  const date = new Date(dateString.trim());
  return isNaN(date.getTime()) ? null : date;
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

    // Validate file sizes (max 10MB each)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (clientListFile.size > MAX_FILE_SIZE) {
      result.errors.push(`Client list file too large: ${Math.round(clientListFile.size / 1024 / 1024)}MB (max 10MB)`);
    }
    if (clientAttendanceFile.size > MAX_FILE_SIZE) {
      result.errors.push(`Client attendance file too large: ${Math.round(clientAttendanceFile.size / 1024 / 1024)}MB (max 10MB)`);
    }

    if (result.errors.length > 0) {
      return new Response(JSON.stringify(result), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
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

    console.log('🔍 Validation response:', JSON.stringify(validationResponse, null, 2));

    if (validationResponse.error) {
      result.errors.push(`CSV validation failed: ${validationResponse.error.message}`);
      return new Response(
        JSON.stringify(result),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!validationResponse.data?.valid) {
      const errors = validationResponse.data?.errors || ['Unknown validation error'];
      result.errors.push(`CSV validation failed: ${errors.join(', ')}`);
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

    // Validate required fields
    if (!client_list_data || client_list_data.length === 0) {
      result.errors.push('Client list data is empty');
      return new Response(JSON.stringify(result), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!client_attendance_data || client_attendance_data.length === 0) {
      result.errors.push('Client attendance data is empty');
      return new Response(JSON.stringify(result), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

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

    // Step 3: Process customer data in batches
    console.log('👥 Step 3: Processing customer data in batches...');
    const BATCH_SIZE = 100;
    const totalBatches = Math.ceil(client_list_data.length / BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * BATCH_SIZE;
      const endIndex = Math.min(startIndex + BATCH_SIZE, client_list_data.length);
      const batch = client_list_data.slice(startIndex, endIndex);
      
      console.log(`Processing batch ${batchIndex + 1}/${totalBatches} (${batch.length} customers)`);
      
      const customerPayloads = [];
      const updatePayloads = [];
      
      for (const customerData of batch) {
        try {
          // Find matching attendance data
          const attendanceRecord = client_attendance_data.find(
            attendance => attendance.client_email === customerData.client_email
          );
          
          // Check if customer exists
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
            phone_number: customerData.phone_number || null,
            status: customerData.status || 'prospect',
            source: customerData.source || 'arketa_import',
            first_seen: customerData.first_seen ? safeDateParse(customerData.first_seen)?.toISOString() : null,
            last_seen: customerData.last_seen ? safeDateParse(customerData.last_seen)?.toISOString() : null,
            first_class_date: attendanceRecord?.first_class_date ? safeDateParse(attendanceRecord.first_class_date)?.toISOString().split('T')[0] : null,
            last_class_date: attendanceRecord?.last_class_date ? safeDateParse(attendanceRecord.last_class_date)?.toISOString().split('T')[0] : null,
            total_lifetime_value: parseFloat(customerData.total_lifetime_value || '0') || 0,
            intro_start_date: customerData.intro_start_date ? safeDateParse(customerData.intro_start_date)?.toISOString().split('T')[0] : null,
            intro_end_date: customerData.intro_end_date ? safeDateParse(customerData.intro_end_date)?.toISOString().split('T')[0] : null,
            conversion_date: customerData.conversion_date ? safeDateParse(customerData.conversion_date)?.toISOString().split('T')[0] : null,
            marketing_email_opt_in: customerData.marketing_email_opt_in === 'true' || customerData.marketing_email_opt_in === true,
            marketing_text_opt_in: customerData.marketing_text_opt_in === 'true' || customerData.marketing_text_opt_in === true,
            agree_to_liability_waiver: customerData.agree_to_liability_waiver === 'true' || customerData.agree_to_liability_waiver === true,
            updated_at: new Date().toISOString()
          };
          
          if (existingCustomer) {
            updatePayloads.push({ id: existingCustomer.id, ...customerPayload });
            result.updated_customers++;
          } else {
            customerPayloads.push({
              ...customerPayload,
              created_at: new Date().toISOString()
            });
            result.new_customers++;
          }
          
          result.total_customers++;
          
        } catch (error) {
          console.error(`Error processing customer ${customerData.client_email}:`, error);
          result.errors.push(`Failed to process customer ${customerData.client_email}: ${error.message}`);
        }
      }
      
      // Batch insert new customers
      if (customerPayloads.length > 0) {
        const { error: insertError } = await supabase
          .from('customers')
          .insert(customerPayloads);
        
        if (insertError) {
          console.error('Batch insert error:', insertError);
          result.errors.push(`Batch insert failed: ${insertError.message}`);
        }
      }
      
      // Batch update existing customers
      for (const updatePayload of updatePayloads) {
        const { id, ...payload } = updatePayload;
        const { error: updateError } = await supabase
          .from('customers')
          .update(payload)
          .eq('id', id);
        
        if (updateError) {
          console.error('Update error:', updateError);
          result.errors.push(`Update failed for customer ID ${id}: ${updateError.message}`);
        }
      }
    }

    console.log(`✅ Processed ${result.total_customers} customers (${result.new_customers} new, ${result.updated_customers} updated)`);

    // Step 4: Calculate customer segments in batches
    console.log('🧮 Step 4: Calculating customer segments...');
    const { data: processedCustomers } = await supabase
      .from('customers')
      .select('id, client_email')
      .in('client_email', client_list_data.map(c => c.client_email));

    if (processedCustomers) {
      for (const customer of processedCustomers) {
        try {
          const attendanceRecord = client_attendance_data.find(
            attendance => attendance.client_email === customer.client_email
          );
          const pricingPlan = attendanceRecord?.last_pricing_option_used || null;
          
          await supabase.functions.invoke('calculate-customer-segment', {
            body: {
              customer_id: customer.id,
              pricing_plan_name: pricingPlan
            }
          });
        } catch (error) {
          console.error(`Segment calculation failed for ${customer.client_email}:`, error);
          result.errors.push(`Segment calculation failed for ${customer.client_email}: ${error.message}`);
        }
      }
    }

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
    const { error: logError } = await supabase.from('csv_imports').insert({
      filename: `${clientListFile.name}, ${clientAttendanceFile.name}`,
      status: result.errors.length > 0 ? 'completed_with_errors' : 'completed',
      total_records: result.total_customers,
      new_records: result.new_customers,
      updated_records: result.updated_customers,
      failed_records: result.errors.length,
      processing_time_ms: Date.now() - startTime,
      completed_at: new Date().toISOString(),
      snapshot_id: result.snapshot_id,
      error_details: result.errors.length > 0 ? { 
        errors: result.errors.slice(0, 100), // Limit to first 100 errors
        total_errors: result.errors.length 
      } : null
    });

    if (logError) {
      console.error('Failed to log import:', logError);
    }

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