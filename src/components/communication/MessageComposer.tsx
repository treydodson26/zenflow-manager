import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import { Mail, MessageSquare, Send, User, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Customer {
  id: string;  // Changed to string to match clients table
  first_name: string;
  last_name: string;
  client_email: string;
  phone_number?: string;
  pipeline_segment?: string;
  is_intro_offer?: boolean;
  intro_day?: number;
  days_since_registration?: number;
  total_classes_attended?: number;
  first_seen?: string;
  last_seen?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  messageType: 'email' | 'whatsapp';
  templateType: string;
  sectionTitle: string;
  onMessagesSent: () => void;
}

// Pre-populated templates based on message type and customer segment
const getTemplate = (templateType: string, messageType: 'email' | 'whatsapp') => {
  const templates = {
    welcome: {
      email: {
        subject: "Welcome to Talo Yoga, {{first_name}}! 🌿",
        content: `Hi {{first_name}},

Welcome to Talo Yoga! We're so excited you've joined our community.

Your wellness journey starts now - here's how to make the most of your experience:

• Book your next class: [Book Now]
• Download our app: [App Link]  
• Meet our instructors: [Meet the Team]

Ready to transform your practice?

Namaste,
Emily & the Talo Team

P.S. Have questions? Just reply to this email!`
      },
      whatsapp: {
        content: `Hi {{first_name}}! 🧘‍♀️

Welcome to Talo Yoga! We're excited to have you in our community.

Your wellness journey begins now. Book your next class: [link]

Questions? Just text me back!
- Emily`
      }
    },
    checkin: {
      email: {
        subject: "How's your first week going, {{first_name}}?",
        content: `Hi {{first_name}},

How are you feeling after your first week at Talo Yoga?

We'd love to hear about your experience so far. Your feedback helps us make your practice even better.

Ready for your next class? Here are some great options for this week:
[Class Schedule]

Keep up the amazing work!

With gratitude,
Emily & the Talo Team`
      },
      whatsapp: {
        content: `Hi {{first_name}}! 

How's your first week at Talo going? 🌟

Would love to hear how you're feeling! Ready for your next class?

Book here: [link]

- Emily`
      }
    },
    conversion: {
      email: {
        subject: "{{first_name}}, ready to make yoga a regular part of your life?",
        content: `Hi {{first_name}},

It's been wonderful having you in our classes! I can see you're really connecting with your practice.

Ready to make yoga a regular part of your life? Our intro offer gives you 8 classes for just $49 - that's basically 6 free classes!

This special pricing ends soon, so don't miss out on continuing your transformation.

Book your next class: [Book Now]
Learn about memberships: [Membership Info]

Looking forward to seeing you on the mat!

Namaste,
Emily`
      },
      whatsapp: {
        content: `Hi {{first_name}}! 

Loved having you in class at Talo Yoga 🧘‍♀️

Ready to make it a regular thing? Our intro offer gets you 8 classes for just $49 (that's basically 6 free classes!)

Book your next class: [link]

Questions? Just text me back!
- Emily`
      }
    },
    reengagement: {
      email: {
        subject: "We miss you at Talo Yoga, {{first_name}}",
        content: `Hi {{first_name}},

We haven't seen you at the studio lately and wanted to check in. Life gets busy, but we're here when you're ready to return to your practice.

Sometimes all it takes is one class to get back into the flow. Would you like to try a gentle class to ease back in?

Book a class: [Book Now]
Questions? Email us back: [Contact]

We're here to support your wellness journey whenever you're ready.

With love and light,
Emily & the Talo Team`
      },
      whatsapp: {
        content: `Hi {{first_name}},

Miss seeing you at Talo! Life gets busy, but we're here when you're ready to get back on the mat 🧘‍♀️

Want to try a gentle class to ease back in?

Book here: [link]

No pressure - just know we're here for you!
- Emily`
      }
    },
    nurture: {
      email: {
        subject: "Your yoga journey at Talo, {{first_name}}",
        content: `Hi {{first_name}},

How are you finding your yoga practice so far? Every step on this journey is meaningful, and we're honored to be part of yours.

Here are some tips to deepen your practice:
• Try different class styles to find what resonates
• Don't worry about "perfect" poses - it's about how you feel
• Connect with our community - everyone is so welcoming!

Your next class awaits: [Book Now]

Keep flowing,
Emily & the Talo Team`
      },
      whatsapp: {
        content: `Hi {{first_name}}!

How's your yoga journey going? 🌟 

Remember, every practice is perfect - it's about how you feel, not how it looks!

Ready for your next class? [link]

- Emily`
      }
    }
  };

  return templates[templateType as keyof typeof templates]?.[messageType] || templates.nurture[messageType];
};

export default function MessageComposer({
  open,
  onOpenChange,
  customers,
  messageType,
  templateType,
  sectionTitle,
  onMessagesSent
}: Props) {
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewCustomer, setPreviewCustomer] = useState<Customer | null>(null);

  // Load template when dialog opens
  useEffect(() => {
    if (open) {
      const template = getTemplate(templateType, messageType);
      if (messageType === 'email') {
        setSubject((template as any).subject || "");
        setContent(template.content || "");
      } else {
        setContent(template.content || "");
      }
      setPreviewCustomer(customers[0] || null);
    }
  }, [open, templateType, messageType, customers]);

  const interpolateTemplate = (text: string, customer: Customer) => {
    return text
      .replace(/\{\{first_name\}\}/g, customer.first_name)
      .replace(/\{\{last_name\}\}/g, customer.last_name)
      .replace(/\{\{full_name\}\}/g, `${customer.first_name} ${customer.last_name}`)
      .replace(/\{\{email\}\}/g, customer.client_email)
      .replace(/\{\{days_since_registration\}\}/g, (customer.days_since_registration || 0).toString())
      .replace(/\{\{intro_day\}\}/g, customer.intro_day?.toString() || "0");
  };

  const handleSend = async () => {
    if (!content.trim() || (messageType === 'email' && !subject.trim())) {
      toast({
        title: "Missing information",
        description: messageType === 'email' 
          ? "Please enter both subject and message content"
          : "Please enter message content",
        variant: "destructive"
      });
      return;
    }

    try {
      setSending(true);
      let successCount = 0;
      let errorCount = 0;

      for (const customer of customers) {
        try {
          const personalizedSubject = messageType === 'email' ? interpolateTemplate(subject, customer) : null;
          const personalizedContent = interpolateTemplate(content, customer);

          // Log to communications_log
          const { error: logError } = await supabase
            .from('communications_log')
            .insert({
              customer_id: parseInt(customer.id),
              message_sequence_id: 1,
              message_type: messageType,
              subject: personalizedSubject,
              content: personalizedContent,
              recipient_email: messageType === 'email' ? customer.client_email : null,
              recipient_phone: messageType === 'whatsapp' ? customer.phone_number : null,
              delivery_status: 'queued'
            });

          if (logError) throw logError;

          // TODO: Integrate with actual messaging services (send-email, send-whatsapp edge functions)
          // For now, just simulate sending
          await new Promise(resolve => setTimeout(resolve, 100));
          
          successCount++;
        } catch (error) {
          console.error(`Failed to send message to ${customer.first_name}:`, error);
          errorCount++;
        }
      }

      toast({
        title: "Messages queued",
        description: `Successfully queued ${successCount} messages${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      });

      onMessagesSent();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to send messages:', error);
      toast({
        title: "Error",
        description: "Failed to send messages. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (!sending) {
      setSubject("");
      setContent("");
      setShowPreview(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {messageType === 'email' ? <Mail className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
            {messageType === 'email' ? 'Email' : 'WhatsApp'} - {sectionTitle}
          </DialogTitle>
          <DialogDescription>
            Sending to {customers.length} recipient{customers.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 h-[500px]">
          {/* Composer */}
          <div className="flex-1 space-y-4">
            {messageType === 'email' && (
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Email subject..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
            )}
            
            <div className="space-y-2 flex-1">
              <Label htmlFor="content">
                Message {messageType === 'whatsapp' && <span className="text-xs text-muted-foreground">(Keep conversational for WhatsApp)</span>}
              </Label>
              <Textarea
                id="content"
                placeholder={`Type your ${messageType} message here...`}
                className="min-h-[300px] resize-none"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>

            <div className="text-xs text-muted-foreground">
              <strong>Available variables:</strong> {`{{first_name}}, {{last_name}}, {{full_name}}, {{email}}, {{days_since_registration}}, {{intro_day}}`}
            </div>
          </div>

          {/* Preview & Recipients */}
          <div className="w-80 border-l pl-4 space-y-4">
            {/* Preview */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Preview</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className="h-6 px-2"
                >
                  <Eye className="w-3 h-3" />
                </Button>
              </div>

              {showPreview && previewCustomer && (
                <div className="p-3 border rounded-lg bg-muted/50 text-sm space-y-2">
                  <div className="font-medium">Preview for {previewCustomer.first_name}:</div>
                  {messageType === 'email' && (
                    <div>
                      <div className="text-xs text-muted-foreground">Subject:</div>
                      <div className="font-medium">{interpolateTemplate(subject, previewCustomer)}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-muted-foreground">Message:</div>
                    <div className="whitespace-pre-wrap">{interpolateTemplate(content, previewCustomer)}</div>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Recipients */}
            <div className="space-y-2">
              <Label>Recipients ({customers.length})</Label>
              <ScrollArea className="h-48">
                <div className="space-y-1">
                  {customers.map((customer) => (
                    <div 
                      key={customer.id}
                      className={`p-2 rounded text-xs cursor-pointer hover:bg-muted/50 ${
                        previewCustomer?.id === customer.id ? 'bg-muted' : ''
                      }`}
                      onClick={() => setPreviewCustomer(customer)}
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3" />
                        <span className="font-medium">{customer.first_name} {customer.last_name}</span>
                      </div>
                      <div className="text-muted-foreground truncate">
                        {messageType === 'email' ? customer.client_email : customer.phone_number || 'No phone'}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            <Send className="w-4 h-4 mr-2" />
            {sending ? "Sending..." : `Send ${messageType === 'email' ? 'Emails' : 'Messages'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}