import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { parse } from "https://deno.land/std@0.224.0/csv/parse.ts";

// --- CONFIGURATION ---

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Required columns for each CSV type
const REQUIRED_CLIENT_LIST_COLUMNS = ['first_name', 'last_name', 'client_email', 'status'];
const REQUIRED_CLIENT_ATTENDANCE_COLUMNS = ['client_email', 'first_class_date', 'last_class_date'];

// --- TYPE DEFINITIONS ---

interface ClientData {
  first_name: string;
  last_name: string;
  client_email: string;
  status: string;
  first_seen?: string;
  last_seen?: string;
  intro_start_date?: string;
  intro_end_date?: string;
  total_lifetime_value?: string;
  [key: string]: string | undefined;
}

interface AttendanceData {
  client_email: string;
  first_class_date: string;
  last_class_date: string;
  total_classes_attended?: string;
  total_bookings?: string;
  [key: string]: string | undefined;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  client_list_data?: ClientData[];
  client_attendance_data?: AttendanceData[];
}

// --- HELPER FUNCTIONS ---

/**
 * Parses a CSV string into an array of objects.
 */
function parseCSV<T>(csvContent: string): T[] {
  if (!csvContent || !csvContent.trim()) {
    return [];
  }
  try {
    const records = parse(csvContent, {
      skipFirstRow: true, // Uses the first row for headers implicitly
      strip: true,
    });
    return records as T[];
  } catch (error) {
    console.error('❌ Error parsing CSV:', error);
    throw new Error(`CSV parsing failed: ${error.message}`);
  }
}

/**
 * Validates that all required headers are present.
 */
function validateHeaders(actualHeaders: string[], requiredHeaders: string[], fileType: string): string[] {
  const errors: string[] = [];
  const headerSet = new Set(actualHeaders);
  for (const col of requiredHeaders) {
    if (!headerSet.has(col)) {
      errors.push(`${fileType} is missing required column: ${col}`);
    }
  }
  return errors;
}

const validateEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validateDate = (dateStr: string): boolean => dateStr ? !isNaN(new Date(dateStr).getTime()) : true;
const validateNumber = (numStr: string): boolean => numStr ? !isNaN(parseFloat(numStr)) : true;

/**
 * Validates the data quality of the client list.
 */
function validateClientListData(data: ClientData[]): string[] {
  const errors: string[] = [];
  // Sample the first 100 rows to avoid overwhelming the user
  data.slice(0, 100).forEach((row, i) => {
    const rowNum = i + 2; // CSV row number (1-based index + header)
    if (!row.first_name?.trim()) errors.push(`Client List Row ${rowNum}: first_name is required.`);
    if (!row.last_name?.trim()) errors.push(`Client List Row ${rowNum}: last_name is required.`);
    if (!row.client_email?.trim()) {
      errors.push(`Client List Row ${rowNum}: client_email is required.`);
    } else if (!validateEmail(row.client_email)) {
      errors.push(`Client List Row ${rowNum}: invalid email format: ${row.client_email}`);
    }

    // Optional fields validation
    if (!validateDate(row.first_seen!)) errors.push(`Client List Row ${rowNum}: invalid first_seen date.`);
    if (!validateDate(row.last_seen!)) errors.push(`Client List Row ${rowNum}: invalid last_seen date.`);
    if (!validateDate(row.intro_start_date!)) errors.push(`Client List Row ${rowNum}: invalid intro_start_date.`);
    if (!validateDate(row.intro_end_date!)) errors.push(`Client List Row ${rowNum}: invalid intro_end_date.`);
    if (!validateNumber(row.total_lifetime_value!)) errors.push(`Client List Row ${rowNum}: total_lifetime_value must be numeric.`);
  });
  return errors;
}

/**
 * Validates the data quality of the client attendance list.
 */
function validateAttendanceData(data: AttendanceData[]): string[] {
  const errors: string[] = [];
  data.slice(0, 100).forEach((row, i) => {
    const rowNum = i + 2;
    if (!row.client_email?.trim()) {
      errors.push(`Attendance Row ${rowNum}: client_email is required.`);
    } else if (!validateEmail(row.client_email)) {
      errors.push(`Attendance Row ${rowNum}: invalid email format: ${row.client_email}`);
    }
    
    if (!validateDate(row.first_class_date)) errors.push(`Attendance Row ${rowNum}: invalid first_class_date.`);
    if (!validateDate(row.last_class_date)) errors.push(`Attendance Row ${rowNum}: invalid last_class_date.`);
    if (!validateNumber(row.total_classes_attended!)) errors.push(`Attendance Row ${rowNum}: total_classes_attended must be numeric.`);
    if (!validateNumber(row.total_bookings!)) errors.push(`Attendance Row ${rowNum}: total_bookings must be numeric.`);
  });
  return errors;
}

/**
 * Cross-validates emails between the client list and attendance data.
 */
function crossValidateEmails(clientData: ClientData[], attendanceData: AttendanceData[]): string[] {
  const errors: string[] = [];
  const clientEmails = new Set(clientData.map(c => c.client_email?.toLowerCase().trim()).filter(Boolean));
  const attendanceEmails = new Set(attendanceData.map(a => a.client_email?.toLowerCase().trim()).filter(Boolean));

  const missingInAttendance = [...clientEmails].filter(email => !attendanceEmails.has(email));
  if (missingInAttendance.length > 0) {
    const sample = missingInAttendance.slice(0, 5).join(', ');
    errors.push(`${missingInAttendance.length} client(s) are missing from the attendance file. Sample: ${sample}`);
  }

  const extraInAttendance = [...attendanceEmails].filter(email => !clientEmails.has(email));
  if (extraInAttendance.length > 0) {
    const sample = extraInAttendance.slice(0, 5).join(', ');
    errors.push(`${extraInAttendance.length} email(s) in the attendance file are not in the client list. Sample: ${sample}`);
  }
  
  return errors;
}


// --- MAIN SERVER LOGIC ---

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { client_list_content, client_attendance_content } = await req.json();
    let allErrors: string[] = [];
    
    if (!client_list_content || !client_attendance_content) {
      allErrors.push('Both client_list_content and client_attendance_content are required.');
      return new Response(JSON.stringify({ valid: false, errors: allErrors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Parse CSV content
    const clientData = parseCSV<ClientData>(client_list_content);
    const attendanceData = parseCSV<AttendanceData>(client_attendance_content);
    
    // 2. Validate file content exists
    if (clientData.length === 0) allErrors.push('Client list CSV is empty or has no data rows.');
    if (attendanceData.length === 0) allErrors.push('Client attendance CSV is empty or has no data rows.');

    if (allErrors.length === 0) {
      // 3. Validate headers
      const clientHeaders = Object.keys(clientData[0]);
      const attendanceHeaders = Object.keys(attendanceData[0]);
      allErrors.push(...validateHeaders(clientHeaders, REQUIRED_CLIENT_LIST_COLUMNS, 'Client list'));
      allErrors.push(...validateHeaders(attendanceHeaders, REQUIRED_CLIENT_ATTENDANCE_COLUMNS, 'Client attendance'));
      
      // 4. Validate data quality (only if headers are valid)
      if (allErrors.length === 0) {
        allErrors.push(...validateClientListData(clientData));
        allErrors.push(...validateAttendanceData(attendanceData));
        allErrors.push(...crossValidateEmails(clientData, attendanceData));
      }
    }

    // 5. Finalize the result
    const MAX_ERRORS_TO_SHOW = 50;
    if (allErrors.length > MAX_ERRORS_TO_SHOW) {
      allErrors = allErrors.slice(0, MAX_ERRORS_TO_SHOW);
      allErrors.push(`... and more. Please fix the first ${MAX_ERRORS_TO_SHOW} issues.`);
    }

    const result: ValidationResult = {
      valid: allErrors.length === 0,
      errors: allErrors,
      client_list_data: allErrors.length === 0 ? clientData : undefined,
      client_attendance_data: allErrors.length === 0 ? attendanceData : undefined,
    };
    
    console.log(result.valid ? '✅ Validation successful' : `❌ Validation failed with ${allErrors.length} errors.`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Critical error in validation function:', error);
    return new Response(JSON.stringify({
      valid: false,
      errors: [`Validation system error: ${error.message}`]
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});