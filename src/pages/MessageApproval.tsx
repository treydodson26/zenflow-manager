import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Check, X, Clock, Mail, MessageSquare, User, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface QueuedMessage {
  id: string;
  customer_id: number;
  sequence_id: number;
  message_type: string;
  recipient_email: string | null;
  recipient_phone: string | null;
  subject: string | null;
  content: string;
  scheduled_for: string;
  status: string;
  approval_status: string;
  approved_by: string | null;
  approved_at: string | null;
  review_notes: string | null;
  created_at: string;
  // Join data
  customer_name?: string;
  sequence_day?: number;
}

const MessageApproval = () => {
  const [messages, setMessages] = useState<QueuedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<QueuedMessage | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Message Approval | Talo Yoga";
    fetchQueuedMessages();
  }, []);

  const fetchQueuedMessages = async () => {
    try {
      // First get the message queue data
      const { data: messagesData, error: messagesError } = await supabase
        .from('message_queue')
        .select('*')
        .in('approval_status', ['pending_review', 'approved', 'rejected'])
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;

      if (!messagesData || messagesData.length === 0) {
        setMessages([]);
        return;
      }

      // Get customer data separately
      const customerIds = messagesData.map(msg => msg.customer_id);
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, first_name, last_name')
        .in('id', customerIds);

      if (customersError) throw customersError;

      // Get sequence data separately
      const sequenceIds = messagesData.map(msg => msg.sequence_id);
      const { data: sequencesData, error: sequencesError } = await supabase
        .from('message_sequences')
        .select('id, day')
        .in('id', sequenceIds);

      if (sequencesError) throw sequencesError;

      // Create lookup maps
      const customersMap = new Map();
      customersData?.forEach(customer => {
        customersMap.set(customer.id, customer);
      });

      const sequencesMap = new Map();
      sequencesData?.forEach(sequence => {
        sequencesMap.set(sequence.id, sequence);
      });

      // Transform the data to include customer names and sequence day
      const transformedData = messagesData.map(msg => {
        const customer = customersMap.get(msg.customer_id);
        const sequence = sequencesMap.get(msg.sequence_id);
        
        return {
          ...msg,
          customer_name: customer ? `${customer.first_name} ${customer.last_name}` : 'Unknown Customer',
          sequence_day: sequence ? sequence.day : 0
        };
      });

      setMessages(transformedData);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load queued messages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const approveMessage = async (messageId: string, notes: string = "") => {
    setProcessing(messageId);
    try {
      // Get current user (you'll need auth for this in production)
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.rpc('approve_queued_message', {
        message_id_param: messageId,
        approver_id_param: user?.id || '00000000-0000-0000-0000-000000000000',
        notes_param: notes || null
      });

      if (error) throw error;

      toast({
        title: "Message Approved",
        description: "Message has been approved and will be sent",
      });

      await fetchQueuedMessages();
      setSelectedMessage(null);
      setReviewNotes("");
    } catch (error) {
      console.error('Error approving message:', error);
      toast({
        title: "Approval Failed",
        description: "Failed to approve message",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const rejectMessage = async (messageId: string, reason: string) => {
    if (!reason.trim()) {
      toast({
        title: "Rejection Reason Required",
        description: "Please provide a reason for rejecting this message",
        variant: "destructive",
      });
      return;
    }

    setProcessing(messageId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.rpc('reject_queued_message', {
        message_id_param: messageId,
        reviewer_id_param: user?.id || '00000000-0000-0000-0000-000000000000',
        rejection_reason_param: reason
      });

      if (error) throw error;

      toast({
        title: "Message Rejected",
        description: "Message has been rejected and will not be sent",
      });

      await fetchQueuedMessages();
      setSelectedMessage(null);
      setReviewNotes("");
    } catch (error) {
      console.error('Error rejecting message:', error);
      toast({
        title: "Rejection Failed",
        description: "Failed to reject message",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (approval_status: string) => {
    switch (approval_status) {
      case 'pending_review':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending Review</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-600"><Check className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{approval_status}</Badge>;
    }
  };

  const getMessageIcon = (messageType: string) => {
    switch (messageType) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'whatsapp':
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const pendingCount = messages.filter(m => m.approval_status === 'pending_review').length;
  const approvedCount = messages.filter(m => m.approval_status === 'approved').length;
  const rejectedCount = messages.filter(m => m.approval_status === 'rejected').length;

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Message Approval</h1>
        <p className="text-muted-foreground">
          Review and approve automated sequence messages before they're sent to customers
        </p>
      </div>

      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">
              messages awaiting approval
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <Check className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
            <p className="text-xs text-muted-foreground">
              ready to send
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <X className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
            <p className="text-xs text-muted-foreground">
              will not be sent
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Messages List */}
      <div className="space-y-4">
        {messages.map((message) => (
          <Card key={message.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getMessageIcon(message.message_type)}
                    <CardTitle className="text-lg">
                      Day {message.sequence_day} • {message.message_type.toUpperCase()}
                    </CardTitle>
                    {getStatusBadge(message.approval_status)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {message.customer_name}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(message.scheduled_for).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {message.approval_status === 'pending_review' && (
                    <>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedMessage(message);
                              setReviewNotes("");
                            }}
                          >
                            Review
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Review Message</DialogTitle>
                            <DialogDescription>
                              Review this message before approving or rejecting it for delivery.
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium">Customer: {message.customer_name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {message.message_type === 'email' ? message.recipient_email : message.recipient_phone}
                              </p>
                            </div>
                            
                            {message.subject && (
                              <div>
                                <Label className="text-sm font-medium">Subject</Label>
                                <div className="text-sm p-2 bg-muted rounded mt-1">
                                  {message.subject}
                                </div>
                              </div>
                            )}
                            
                            <div>
                              <Label className="text-sm font-medium">Message Content</Label>
                              <div className="text-sm p-3 bg-muted rounded mt-1 whitespace-pre-wrap max-h-48 overflow-y-auto">
                                {message.content}
                              </div>
                            </div>
                            
                            <div>
                              <Label htmlFor="review-notes">Review Notes (Optional)</Label>
                              <Textarea
                                id="review-notes"
                                value={reviewNotes}
                                onChange={(e) => setReviewNotes(e.target.value)}
                                placeholder="Add any notes about this message..."
                                rows={3}
                              />
                            </div>
                          </div>
                          
                          <DialogFooter className="gap-2">
                            <Button
                              variant="destructive"
                              onClick={() => rejectMessage(message.id, reviewNotes)}
                              disabled={processing === message.id}
                            >
                              <X className="h-4 w-4 mr-1" />
                              {processing === message.id ? 'Rejecting...' : 'Reject'}
                            </Button>
                            <Button
                              onClick={() => approveMessage(message.id, reviewNotes)}
                              disabled={processing === message.id}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              {processing === message.id ? 'Approving...' : 'Approve'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                {message.subject && (
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">SUBJECT</Label>
                    <p className="text-sm">{message.subject}</p>
                  </div>
                )}
                
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">MESSAGE PREVIEW</Label>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {message.content}
                  </p>
                </div>
                
                {(message.approval_status !== 'pending_review' && message.review_notes) && (
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">
                      {message.approval_status === 'approved' ? 'APPROVAL NOTES' : 'REJECTION REASON'}
                    </Label>
                    <p className="text-sm text-muted-foreground">{message.review_notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {messages.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No Messages to Review</h3>
              <p className="text-muted-foreground">
                Automated sequence messages will appear here for review before being sent.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MessageApproval;