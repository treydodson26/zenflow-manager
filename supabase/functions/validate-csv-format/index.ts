import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { parse } from "https://deno.land/std@0.168.0/encoding/csv.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  client_list_data?: any[];
  client_attendance_data?: any[];
}

// Required columns for each CSV type
const REQUIRED_CLIENT_LIST_COLUMNS = [
  'first_name',
  'last_name', 
  'client_email',
  'status'
];

const REQUIRED_CLIENT_ATTENDANCE_COLUMNS = [
  'client_email',
  'first_class_date',
  'last_class_date'
];

// Optional but expected columns
const OPTIONAL_CLIENT_LIST_COLUMNS = [
  'client_name',
  'phone_number',
  'source',
  'first_seen',
  'last_seen',
  'total_lifetime_value',
  'intro_start_date',
  'intro_end_date',
  'conversion_date',
  'marketing_email_opt_in',
  'marketing_text_opt_in',
  'agree_to_liability_waiver'
];

const OPTIONAL_CLIENT_ATTENDANCE_COLUMNS = [
  'last_pricing_option_used',
  'total_classes_attended',
  'total_bookings',
  'no_shows',
  'cancellations'
];

function parseCSV(csvContent: string): any[] {
  try {
    console.log('🔍 Parsing CSV content...');
    console.log('CSV content preview:', csvContent.substring(0, 200));
    
    // Use Deno's built-in CSV parser which handles quotes, commas, and multi-line fields properly
    const parsed = parse(csvContent, {
      skipFirstRow: false, // We'll handle the header manually
      strip: true // Remove surrounding whitespace
    });
    
    if (parsed.length < 2) {
      console.log('❌ CSV has insufficient rows:', parsed.length);
      return []; // Need at least header + 1 data row
    }
    
    // First row is headers
    const headers = parsed[0] as string[];
    console.log('📋 CSV headers:', headers);
    
    // Convert remaining rows to objects
    const data = [];
    for (let i = 1; i < parsed.length; i++) {
      const values = parsed[i] as string[];
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      data.push(row);
    }
    
    console.log(`✅ Successfully parsed ${data.length} data rows`);
    return data;
  } catch (error) {
    console.error('❌ Error parsing CSV:', error);
    throw new Error(`CSV parsing failed: ${error.message}`);
  }
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateDate(dateString: string): boolean {
  if (!dateString) return true; // Allow empty dates
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && dateString.length >= 8; // Basic date validation
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { client_list_content, client_attendance_content } = await req.json();
    
    console.log('📥 Received validation request');
    console.log('Client list content length:', client_list_content?.length || 0);
    console.log('Client attendance content length:', client_attendance_content?.length || 0);
    
    const result: ValidationResult = {
      valid: true,
      errors: []
    };

    if (!client_list_content || !client_attendance_content) {
      result.valid = false;
      result.errors.push('Both client_list_content and client_attendance_content are required');
      console.log('❌ Missing CSV content - client_list:', !!client_list_content, 'client_attendance:', !!client_attendance_content);
      
      return new Response(
        JSON.stringify(result),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('🔍 Validating CSV format and content...');

    // Parse CSV files
    try {
      result.client_list_data = parseCSV(client_list_content);
      result.client_attendance_data = parseCSV(client_attendance_content);
    } catch (error) {
      result.valid = false;
      result.errors.push(`CSV parsing error: ${error.message}`);
      
      return new Response(
        JSON.stringify(result),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate client list structure
    if (result.client_list_data.length === 0) {
      result.valid = false;
      result.errors.push('Client list CSV is empty or has no data rows');
    } else {
      const clientHeaders = Object.keys(result.client_list_data[0]);
      
      // Check required columns
      for (const requiredCol of REQUIRED_CLIENT_LIST_COLUMNS) {
        if (!clientHeaders.includes(requiredCol)) {
          result.valid = false;
          result.errors.push(`Client list missing required column: ${requiredCol}`);
        }
      }

      // Validate data quality for client list
      for (let i = 0; i < Math.min(result.client_list_data.length, 100); i++) { // Sample first 100 rows
        const row = result.client_list_data[i];
        const rowNum = i + 2; // Account for header row
        
        // Required field validation
        if (!row.first_name?.trim()) {
          result.errors.push(`Row ${rowNum}: first_name is required`);
        }
        if (!row.last_name?.trim()) {
          result.errors.push(`Row ${rowNum}: last_name is required`);
        }
        if (!row.client_email?.trim()) {
          result.errors.push(`Row ${rowNum}: client_email is required`);
        } else if (!validateEmail(row.client_email)) {
          result.errors.push(`Row ${rowNum}: invalid email format: ${row.client_email}`);
        }
        
        // Date validation
        if (row.first_seen && !validateDate(row.first_seen)) {
          result.errors.push(`Row ${rowNum}: invalid first_seen date: ${row.first_seen}`);
        }
        if (row.last_seen && !validateDate(row.last_seen)) {
          result.errors.push(`Row ${rowNum}: invalid last_seen date: ${row.last_seen}`);
        }
        if (row.intro_start_date && !validateDate(row.intro_start_date)) {
          result.errors.push(`Row ${rowNum}: invalid intro_start_date: ${row.intro_start_date}`);
        }
        if (row.intro_end_date && !validateDate(row.intro_end_date)) {
          result.errors.push(`Row ${rowNum}: invalid intro_end_date: ${row.intro_end_date}`);
        }
        
        // Numeric validation
        if (row.total_lifetime_value && isNaN(parseFloat(row.total_lifetime_value))) {
          result.errors.push(`Row ${rowNum}: total_lifetime_value must be numeric: ${row.total_lifetime_value}`);
        }
      }
    }

    // Validate client attendance structure
    if (result.client_attendance_data.length === 0) {
      result.valid = false;
      result.errors.push('Client attendance CSV is empty or has no data rows');
    } else {
      const attendanceHeaders = Object.keys(result.client_attendance_data[0]);
      
      // Check required columns
      for (const requiredCol of REQUIRED_CLIENT_ATTENDANCE_COLUMNS) {
        if (!attendanceHeaders.includes(requiredCol)) {
          result.valid = false;
          result.errors.push(`Client attendance missing required column: ${requiredCol}`);
        }
      }

      // Validate data quality for attendance
      for (let i = 0; i < Math.min(result.client_attendance_data.length, 100); i++) { // Sample first 100 rows
        const row = result.client_attendance_data[i];
        const rowNum = i + 2; // Account for header row
        
        if (!row.client_email?.trim()) {
          result.errors.push(`Attendance row ${rowNum}: client_email is required`);
        } else if (!validateEmail(row.client_email)) {
          result.errors.push(`Attendance row ${rowNum}: invalid email format: ${row.client_email}`);
        }
        
        if (row.first_class_date && !validateDate(row.first_class_date)) {
          result.errors.push(`Attendance row ${rowNum}: invalid first_class_date: ${row.first_class_date}`);
        }
        if (row.last_class_date && !validateDate(row.last_class_date)) {
          result.errors.push(`Attendance row ${rowNum}: invalid last_class_date: ${row.last_class_date}`);
        }
        
        // Numeric validation for attendance metrics
        if (row.total_classes_attended && isNaN(parseInt(row.total_classes_attended))) {
          result.errors.push(`Attendance row ${rowNum}: total_classes_attended must be numeric`);
        }
        if (row.total_bookings && isNaN(parseInt(row.total_bookings))) {
          result.errors.push(`Attendance row ${rowNum}: total_bookings must be numeric`);
        }
      }
    }

    // Cross-validation: ensure client emails match between files
    if (result.client_list_data && result.client_attendance_data) {
      const clientEmails = new Set(result.client_list_data.map(c => c.client_email?.toLowerCase().trim()));
      const attendanceEmails = new Set(result.client_attendance_data.map(a => a.client_email?.toLowerCase().trim()));
      
      const missingInAttendance = Array.from(clientEmails).filter(email => !attendanceEmails.has(email));
      const extraInAttendance = Array.from(attendanceEmails).filter(email => !clientEmails.has(email));
      
      if (missingInAttendance.length > 0 && missingInAttendance.length < 10) {
        result.errors.push(`Some clients missing attendance data: ${missingInAttendance.join(', ')}`);
      }
      if (extraInAttendance.length > 0 && extraInAttendance.length < 10) {
        result.errors.push(`Attendance data for unknown clients: ${extraInAttendance.join(', ')}`);
      }
    }

    // Stop validation if we have too many errors
    if (result.errors.length > 50) {
      result.valid = false;
      result.errors = result.errors.slice(0, 50);
      result.errors.push('... and more errors. Please fix the above issues first.');
    }

    if (result.errors.length > 0) {
      result.valid = false;
      console.log(`❌ Validation failed with ${result.errors.length} errors`);
    } else {
      console.log(`✅ Validation passed: ${result.client_list_data.length} clients, ${result.client_attendance_data.length} attendance records`);
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in CSV validation:', error);
    
    return new Response(
      JSON.stringify({
        valid: false,
        errors: [`Validation system error: ${error.message}`]
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})