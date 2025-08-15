import { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { Mail, MessageSquare, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SendMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
}

export default function SendMessageDialog({ 
  open, 
  onOpenChange, 
  customer 
}: SendMessageDialogProps) {
  const [messageType, setMessageType] = useState<"email" | "whatsapp">("email");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!content.trim() || (messageType === "email" && !subject.trim())) {
      toast({
        title: "Missing information",
        description: messageType === "email" 
          ? "Please enter both subject and message content"
          : "Please enter message content",
        variant: "destructive"
      });
      return;
    }

    try {
      setSending(true);

      // Log the communication
      const { error: logError } = await supabase
        .from('communications_log')
        .insert({
          customer_id: customer.id,
          message_sequence_id: 1, // Default sequence ID - would be dynamic in real implementation
          message_type: messageType,
          subject: messageType === "email" ? subject : null,
          content: content.trim(),
          recipient_email: messageType === "email" ? customer.email : null,
          recipient_phone: messageType === "whatsapp" ? customer.phone : null,
          delivery_status: 'pending'
        });

      if (logError) throw logError;

      // TODO: Integrate with actual messaging services
      // For now, just simulate sending
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: "Message sent",
        description: `${messageType === "email" ? "Email" : "WhatsApp message"} queued for delivery to ${customer.name}`,
      });

      // Reset form and close dialog
      setSubject("");
      setContent("");
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
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
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Send Message to {customer.name}</DialogTitle>
          <DialogDescription>
            Choose how you'd like to reach out to this customer
          </DialogDescription>
        </DialogHeader>

        <Tabs value={messageType} onValueChange={(value) => setMessageType(value as "email" | "whatsapp")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex items-center gap-2" disabled={!customer.phone}>
              <MessageSquare className="w-4 h-4" />
              WhatsApp
              {!customer.phone && <Badge variant="outline" className="ml-2 text-xs">No phone</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-to">To</Label>
              <Input 
                id="email-to"
                value={customer.email} 
                disabled 
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                placeholder="Enter email subject..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-content">Message</Label>
              <Textarea
                id="email-content"
                placeholder="Type your email message here..."
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp-to">To</Label>
              <Input 
                id="whatsapp-to"
                value={customer.phone || "No phone number"} 
                disabled 
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp-content">Message</Label>
              <Textarea
                id="whatsapp-content"
                placeholder="Type your WhatsApp message here..."
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Keep messages personal and conversational for WhatsApp
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            <Send className="w-4 h-4 mr-2" />
            {sending ? "Sending..." : `Send ${messageType === "email" ? "Email" : "WhatsApp"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}