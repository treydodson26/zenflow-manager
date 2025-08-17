import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Configuration
const CONFIG = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_ROWS: 10000,
  EMAIL_VALIDATION_SAMPLE_SIZE: 50
};

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
  client_list_data?: any[];
  client_attendance_data?: any[];
  stats?: {
    client_list_rows: number;
    client_attendance_rows: number;
  };
}

/**
 * Robust CSV parser that handles quoted fields, escaped quotes, and various line endings
 */
function parseCSV(content: string): any[] {
  try {
    // Normalize line endings
    const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalizedContent.trim().split('\n');
    
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row');
    }

    // Parse header row
    const headers = parseCSVLine(lines[0]);
    if (headers.length === 0) {
      throw new Error('CSV header row is empty');
    }

    const data: any[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines
      
      try {
        const values = parseCSVLine(line);
        const row: any = {};
        
        // Map values to headers, handling cases where row has more/fewer columns
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        
        data.push(row);
      } catch (error) {
        throw new Error(`Error parsing line ${i + 1}: ${error.message}`);
      }
    }

    return data;
  } catch (error) {
    throw new Error(`CSV parsing failed: ${error.message}`);
  }
}

/**
 * Parse a single CSV line handling quoted fields properly
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote inside quoted field
        current += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator outside quotes
      result.push(current.trim());
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }

  // Add the last field
  result.push(current.trim());
  
  return result;
}

/**
 * Validate client list CSV format
 */
function validateClientListFormat(data: any[]): { errors: string[], warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const requiredFields = ['client_email', 'first_name', 'last_name'];

  if (data.length === 0) {
    errors.push('Client list is empty');
    return { errors, warnings };
  }

  // Check required fields exist in headers
  const headers = Object.keys(data[0]);
  const missingFields = requiredFields.filter(field => !headers.includes(field));
  
  if (missingFields.length > 0) {
    errors.push(`Missing required fields in client list: ${missingFields.join(', ')}`);
  }

  // Validate email format and check for duplicates
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const seenEmails = new Set<string>();
  const sampleSize = Math.min(CONFIG.EMAIL_VALIDATION_SAMPLE_SIZE, data.length);
  
  for (let i = 0; i < sampleSize; i++) {
    const row = data[i];
    const email = row.client_email?.toString().trim().toLowerCase();
    
    if (!email) {
      errors.push(`Empty email in client list row ${i + 2}`);
      continue;
    }
    
    if (!emailRegex.test(email)) {
      errors.push(`Invalid email format in client list row ${i + 2}: ${row.client_email}`);
    }
    
    if (seenEmails.has(email)) {
      warnings.push(`Duplicate email in client list: ${email}`);
    } else {
      seenEmails.add(email);
    }
    
    // Check for empty required fields
    if (!row.first_name?.toString().trim()) {
      errors.push(`Empty first_name in client list row ${i + 2}`);
    }
    if (!row.last_name?.toString().trim()) {
      errors.push(`Empty last_name in client list row ${i + 2}`);
    }
  }

  if (data.length > sampleSize) {
    warnings.push(`Only validated first ${sampleSize} rows for performance. Please review full dataset.`);
  }

  return { errors, warnings };
}

/**
 * Validate client attendance CSV format
 */
function validateClientAttendanceFormat(data: any[]): { errors: string[], warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const requiredFields = ['client_email'];

  if (data.length === 0) {
    errors.push('Client attendance is empty');
    return { errors, warnings };
  }

  // Check required fields exist in headers
  const headers = Object.keys(data[0]);
  const missingFields = requiredFields.filter(field => !headers.includes(field));
  
  if (missingFields.length > 0) {
    errors.push(`Missing required fields in client attendance: ${missingFields.join(', ')}`);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const sampleSize = Math.min(CONFIG.EMAIL_VALIDATION_SAMPLE_SIZE, data.length);
  
  for (let i = 0; i < sampleSize; i++) {
    const row = data[i];
    const email = row.client_email?.toString().trim();
    
    if (!email) {
      errors.push(`Empty email in attendance row ${i + 2}`);
      continue;
    }
    
    if (!emailRegex.test(email)) {
      errors.push(`Invalid email format in attendance row ${i + 2}: ${row.client_email}`);
    }
  }

  if (data.length > sampleSize) {
    warnings.push(`Only validated first ${sampleSize} attendance rows for performance.`);
  }

  return { errors, warnings };
}

/**
 * Validate input size and format
 */
function validateInput(clientListContent: any, clientAttendanceContent: any): string[] {
  const errors: string[] = [];

  if (typeof clientListContent !== 'string') {
    errors.push('client_list_content must be a string');
  } else if (clientListContent.length > CONFIG.MAX_FILE_SIZE) {
    errors.push(`Client list too large (${clientListContent.length} bytes). Maximum ${CONFIG.MAX_FILE_SIZE} bytes allowed.`);
  }

  if (typeof clientAttendanceContent !== 'string') {
    errors.push('client_attendance_content must be a string');
  } else if (clientAttendanceContent.length > CONFIG.MAX_FILE_SIZE) {
    errors.push(`Client attendance file too large (${clientAttendanceContent.length} bytes). Maximum ${CONFIG.MAX_FILE_SIZE} bytes allowed.`);
  }

  return errors;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Starting CSV validation...');
    
    // Parse request body with error handling
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (error) {
      console.error('Failed to parse request JSON:', error);
      return new Response(JSON.stringify({
        valid: false,
        errors: ['Invalid JSON in request body']
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { client_list_content, client_attendance_content } = requestBody;

    // Validate required fields
    if (!client_list_content || !client_attendance_content) {
      return new Response(JSON.stringify({
        valid: false,
        errors: ['Both client_list_content and client_attendance_content are required']
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate input size and type
    const inputErrors = validateInput(client_list_content, client_attendance_content);
    if (inputErrors.length > 0) {
      return new Response(JSON.stringify({
        valid: false,
        errors: inputErrors
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Parse CSV content
    let clientListData: any[] = [];
    let clientAttendanceData: any[] = [];

    try {
      clientListData = parseCSV(client_list_content);
      console.log(`📊 Parsed client list: ${clientListData.length} rows`);
      
      if (clientListData.length > CONFIG.MAX_ROWS) {
        result.errors.push(`Client list has too many rows (${clientListData.length}). Maximum ${CONFIG.MAX_ROWS} rows allowed.`);
      }
    } catch (error) {
      result.errors.push(`Failed to parse client list CSV: ${error.message}`);
      console.error('Client list parsing error:', error);
    }

    try {
      clientAttendanceData = parseCSV(client_attendance_content);
      console.log(`📊 Parsed client attendance: ${clientAttendanceData.length} rows`);
      
      if (clientAttendanceData.length > CONFIG.MAX_ROWS) {
        result.errors.push(`Client attendance has too many rows (${clientAttendanceData.length}). Maximum ${CONFIG.MAX_ROWS} rows allowed.`);
      }
    } catch (error) {
      result.errors.push(`Failed to parse client attendance CSV: ${error.message}`);
      console.error('Client attendance parsing error:', error);
    }

    // Validate formats only if parsing succeeded
    if (clientListData.length > 0) {
      const { errors, warnings } = validateClientListFormat(clientListData);
      result.errors.push(...errors);
      result.warnings!.push(...warnings);
    }

    if (clientAttendanceData.length > 0) {
      const { errors, warnings } = validateClientAttendanceFormat(clientAttendanceData);
      result.errors.push(...errors);
      result.warnings!.push(...warnings);
    }

    // Set final validation result
    result.valid = result.errors.length === 0;
    result.client_list_data = clientListData;
    result.client_attendance_data = clientAttendanceData;
    result.stats = {
      client_list_rows: clientListData.length,
      client_attendance_rows: clientAttendanceData.length
    };

    console.log(`✅ Validation ${result.valid ? 'passed' : 'failed'}: ${result.errors.length} errors, ${result.warnings?.length || 0} warnings`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error in CSV validation service:', error);
    
    const errorResult: ValidationResult = {
      valid: false,
      errors: [`Internal server error: ${error.message}`]
    };

    return new Response(JSON.stringify(errorResult), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});