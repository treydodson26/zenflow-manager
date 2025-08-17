import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationResult {
  valid: boolean;
  errors: string[];
  client_list_data?: any[];
  client_attendance_data?: any[];
}

function parseCSV(content: string): any[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const row: any = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    data.push(row);
  }
  
  return data;
}

function validateClientListFormat(data: any[]): string[] {
  const errors: string[] = [];
  const requiredFields = ['client_email', 'first_name', 'last_name'];
  
  if (data.length === 0) {
    errors.push('Client list is empty');
    return errors;
  }
  
  // Check required fields exist in headers
  const headers = Object.keys(data[0]);
  const missingFields = requiredFields.filter(field => !headers.includes(field));
  
  if (missingFields.length > 0) {
    errors.push(`Missing required fields in client list: ${missingFields.join(', ')}`);
  }
  
  // Validate email format for first few rows
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (row.client_email && !emailRegex.test(row.client_email)) {
      errors.push(`Invalid email format in row ${i + 2}: ${row.client_email}`);
    }
  }
  
  return errors;
}

function validateClientAttendanceFormat(data: any[]): string[] {
  const errors: string[] = [];
  const requiredFields = ['client_email'];
  
  if (data.length === 0) {
    errors.push('Client attendance is empty');
    return errors;
  }
  
  // Check required fields exist in headers
  const headers = Object.keys(data[0]);
  const missingFields = requiredFields.filter(field => !headers.includes(field));
  
  if (missingFields.length > 0) {
    errors.push(`Missing required fields in client attendance: ${missingFields.join(', ')}`);
  }
  
  // Validate email format for first few rows
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (row.client_email && !emailRegex.test(row.client_email)) {
      errors.push(`Invalid email format in attendance row ${i + 2}: ${row.client_email}`);
    }
  }
  
  return errors;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { client_list_content, client_attendance_content } = await req.json();

    const result: ValidationResult = {
      valid: true,
      errors: []
    };

    console.log('🔍 Validating CSV formats...');

    // Parse CSV content
    let clientListData: any[] = [];
    let clientAttendanceData: any[] = [];

    try {
      clientListData = parseCSV(client_list_content);
      console.log(`📊 Parsed client list: ${clientListData.length} rows`);
    } catch (error) {
      result.errors.push(`Failed to parse client list CSV: ${error.message}`);
    }

    try {
      clientAttendanceData = parseCSV(client_attendance_content);
      console.log(`📊 Parsed client attendance: ${clientAttendanceData.length} rows`);
    } catch (error) {
      result.errors.push(`Failed to parse client attendance CSV: ${error.message}`);
    }

    // Validate formats
    if (clientListData.length > 0) {
      const clientListErrors = validateClientListFormat(clientListData);
      result.errors.push(...clientListErrors);
    }

    if (clientAttendanceData.length > 0) {
      const attendanceErrors = validateClientAttendanceFormat(clientAttendanceData);
      result.errors.push(...attendanceErrors);
    }

    // Set validation result
    result.valid = result.errors.length === 0;
    result.client_list_data = clientListData;
    result.client_attendance_data = clientAttendanceData;

    console.log(`✅ Validation ${result.valid ? 'passed' : 'failed'}: ${result.errors.length} errors`);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('CSV validation error:', error);
    
    const errorResult: ValidationResult = {
      valid: false,
      errors: [`Validation service error: ${error.message}`]
    };

    return new Response(
      JSON.stringify(errorResult),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});