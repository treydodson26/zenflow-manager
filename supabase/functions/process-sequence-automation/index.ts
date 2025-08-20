import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!);

interface CustomerJourney {
  id: string;
  customer_id: number;
  current_day: number;
  sequence_start_date: string;
  last_message_sent_day: number | null;
  next_message_due_date: string | null;
  journey_status: string;
  segment_type: string;
}

interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  client_email: string;
  phone_number: string | null;
  marketing_email_opt_in: boolean;
  marketing_text_opt_in: boolean;
}

interface MessageSequence {
  id: number;
  day: number;
  message_type: string;
  subject: string | null;
  content: string;
  active: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    console.log("🚀 Starting sequence automation processor...");
    
    // 1. Find customers due for messages
    const { data: journeys, error: journeyError } = await supabase
      .from('customer_journey_progress')
      .select('*')
      .eq('journey_status', 'active')
      .lte('next_message_due_date', new Date().toISOString().split('T')[0]);

    if (journeyError) {
      console.error("Error fetching journeys:", journeyError);
      throw journeyError;
    }

    console.log(`Found ${journeys?.length || 0} customers due for messages`);

    if (!journeys || journeys.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        processed: 0,
        message: "No customers due for messages" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Get all active message sequences
    const { data: sequences, error: sequenceError } = await supabase
      .from('message_sequences')
      .select('*')
      .eq('active', true)
      .order('day', { ascending: true });

    if (sequenceError) {
      console.error("Error fetching sequences:", sequenceError);
      throw sequenceError;
    }

    // 3. Get customer details
    const customerIds = journeys.map(j => j.customer_id);
    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .select('id, first_name, last_name, client_email, phone_number, marketing_email_opt_in, marketing_text_opt_in')
      .in('id', customerIds);

    if (customerError) {
      console.error("Error fetching customers:", customerError);
      throw customerError;
    }

    // Create customer lookup map
    const customerMap = new Map();
    customers?.forEach(customer => {
      customerMap.set(customer.id, customer);
    });

    let processed = 0;
    let queued = 0;

    // 4. Process each customer journey
    for (const journey of journeys as CustomerJourney[]) {
      const customer = customerMap.get(journey.customer_id) as Customer;
      if (!customer) {
        console.warn(`Customer ${journey.customer_id} not found, skipping`);
        continue;
      }

      // Calculate days since sequence start
      const startDate = new Date(journey.sequence_start_date);
      const today = new Date();
      const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      console.log(`Processing customer ${customer.first_name} ${customer.last_name} - Day ${daysSinceStart}`);

      // Find the next message to send
      const nextSequence = sequences?.find(seq => 
        seq.day > (journey.last_message_sent_day || -1) && 
        seq.day <= daysSinceStart
      );

      if (!nextSequence) {
        // No more messages for this customer, or they're ahead of schedule
        if (daysSinceStart >= 28) {
          // Journey complete
          await supabase
            .from('customer_journey_progress')
            .update({ journey_status: 'completed' })
            .eq('id', journey.id);
          
          console.log(`Journey completed for customer ${customer.first_name} ${customer.last_name}`);
        }
        continue;
      }

      // Prepare message content with personalization
      const personalizedContent = personalizeMessage(nextSequence.content, customer);
      const personalizedSubject = nextSequence.subject ? 
        personalizeMessage(nextSequence.subject, customer) : null;

      // Check opt-in preferences
      const canSendEmail = customer.marketing_email_opt_in && nextSequence.message_type === 'email';
      const canSendSMS = customer.marketing_text_opt_in && ['sms', 'whatsapp'].includes(nextSequence.message_type);

      if (!canSendEmail && !canSendSMS) {
        console.log(`Customer ${customer.first_name} ${customer.last_name} not opted in for ${nextSequence.message_type}, skipping`);
        
        // Update journey progress anyway
        await updateJourneyProgress(journey, nextSequence, sequences);
        continue;
      }

      // Queue the message for sending
      const { error: queueError } = await supabase
        .from('message_queue')
        .insert({
          customer_id: customer.id,
          sequence_id: nextSequence.id,
          message_type: nextSequence.message_type,
          recipient_email: nextSequence.message_type === 'email' ? customer.client_email : null,
          recipient_phone: ['sms', 'whatsapp'].includes(nextSequence.message_type) ? customer.phone_number : null,
          subject: personalizedSubject,
          content: personalizedContent,
          scheduled_for: new Date().toISOString(), // Send immediately
          status: 'pending'
        });

      if (queueError) {
        console.error(`Error queuing message for customer ${customer.id}:`, queueError);
        continue;
      }

      // Update customer journey progress
      await updateJourneyProgress(journey, nextSequence, sequences);

      queued++;
      console.log(`Queued ${nextSequence.message_type} message for ${customer.first_name} ${customer.last_name} (Day ${nextSequence.day})`);
    }

    // 5. Process the message queue (send queued messages)
    await processMessageQueue();

    console.log(`✅ Sequence automation complete. Processed ${processed} journeys, queued ${queued} messages`);

    return new Response(JSON.stringify({ 
      success: true, 
      processed: journeys.length,
      queued: queued,
      message: `Processed ${journeys.length} customer journeys, queued ${queued} messages`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Sequence automation error:", error);
    return new Response(JSON.stringify({ 
      error: "Sequence automation failed", 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Helper function to personalize message content
function personalizeMessage(content: string, customer: Customer): string {
  return content
    .replace(/\{first_name\}/g, customer.first_name)
    .replace(/\{last_name\}/g, customer.last_name)
    .replace(/\{full_name\}/g, `${customer.first_name} ${customer.last_name}`)
    .replace(/\{email\}/g, customer.client_email);
}

// Helper function to update journey progress
async function updateJourneyProgress(
  journey: CustomerJourney, 
  sentSequence: MessageSequence, 
  allSequences: MessageSequence[]
) {
  // Find the next sequence day
  const nextSequence = allSequences.find(seq => seq.day > sentSequence.day);
  const nextDueDate = nextSequence ? 
    new Date(Date.now() + (nextSequence.day - sentSequence.day) * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : 
    null;

  await supabase
    .from('customer_journey_progress')
    .update({
      last_message_sent_day: sentSequence.day,
      next_message_due_date: nextDueDate,
      current_day: sentSequence.day
    })
    .eq('id', journey.id);
}

// Helper function to process queued messages
async function processMessageQueue() {
  console.log("📤 Processing message queue...");
  
  // Get pending messages
  const { data: queuedMessages, error } = await supabase
    .from('message_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .limit(50); // Process in batches

  if (error || !queuedMessages) {
    console.error("Error fetching queued messages:", error);
    return;
  }

  for (const message of queuedMessages) {
    try {
      let sendResult;
      
      if (message.message_type === 'email') {
        // Send email
        sendResult = await supabase.functions.invoke('send-email', {
          body: {
            to: message.recipient_email,
            subject: message.subject,
            html: message.content,
            customer_id: message.customer_id
          }
        });
      } else if (message.message_type === 'whatsapp') {
        // Send WhatsApp via Twilio
        sendResult = await supabase.functions.invoke('send-twilio-whatsapp', {
          body: {
            to: message.recipient_phone,
            message: message.content,
            customer_id: message.customer_id
          }
        });
      } else if (message.message_type === 'sms') {
        // For now, also use Twilio WhatsApp (could add SMS later)
        sendResult = await supabase.functions.invoke('send-twilio-whatsapp', {
          body: {
            to: message.recipient_phone,
            message: message.content,
            customer_id: message.customer_id
          }
        });
      }

      // Update message status
      const updateData = sendResult?.error ? {
        status: 'failed',
        attempts: message.attempts + 1,
        error_message: sendResult.error.message || 'Unknown error'
      } : {
        status: 'sent',
        sent_at: new Date().toISOString(),
        attempts: message.attempts + 1
      };

      await supabase
        .from('message_queue')
        .update(updateData)
        .eq('id', message.id);

      console.log(`${sendResult?.error ? '❌' : '✅'} ${message.message_type} to customer ${message.customer_id}`);

    } catch (sendError) {
      console.error(`Error sending message ${message.id}:`, sendError);
      
      // Mark as failed
      await supabase
        .from('message_queue')
        .update({
          status: 'failed',
          attempts: message.attempts + 1,
          error_message: sendError.message
        })
        .eq('id', message.id);
    }
  }
}