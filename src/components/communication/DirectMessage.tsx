import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquare, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function DirectMessage() {
  const [phoneNumber, setPhoneNumber] = useState("14697046880");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!phoneNumber || !message) {
      toast.error("Please enter both phone number and message");
      return;
    }

    try {
      setSending(true);
      
      // Format phone number (ensure it starts with +1 for US numbers)
      let formattedPhone = phoneNumber.replace(/\D/g, '');
      if (formattedPhone.length === 10) {
        formattedPhone = `+1${formattedPhone}`;
      } else if (formattedPhone.length === 11 && formattedPhone.startsWith('1')) {
        formattedPhone = `+${formattedPhone}`;
      } else {
        formattedPhone = `+${formattedPhone}`;
      }

      console.log("Sending WhatsApp message to:", formattedPhone);

      // Call the Twilio WhatsApp edge function
      const { data, error } = await supabase.functions.invoke('send-twilio-whatsapp', {
        body: {
          to: formattedPhone,
          message: message,
          customer_id: null // Direct message, no customer ID
        }
      });

      if (error) throw error;

      if (data?.ok) {
        toast.success(`WhatsApp message sent successfully!`);
        setMessage(""); // Clear the message after sending
        console.log("WhatsApp message sent:", data);
      } else {
        console.error("Twilio API error:", data);
        toast.error(`Failed to send message: ${data?.data?.message || 'Unknown error'}`);
      }

    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSend();
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Send Direct WhatsApp Message
        </CardTitle>
        <CardDescription>
          Send a WhatsApp message to any phone number
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="14697046880 or +14697046880"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Enter 10-digit US number or international format with country code
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            placeholder="Type your WhatsApp message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Press Cmd/Ctrl + Enter to send quickly
          </p>
        </div>

        <Button 
          onClick={handleSend}
          disabled={sending || !phoneNumber || !message}
          className="w-full"
        >
          <Send className="w-4 h-4 mr-2" />
          {sending ? "Sending..." : "Send WhatsApp Message"}
        </Button>
      </CardContent>
    </Card>
  );
}