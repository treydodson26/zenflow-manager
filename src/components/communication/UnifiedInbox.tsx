import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Search, Mail, MessageSquare, Phone, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";

interface CommunicationLog {
  id: number;
  customer_id: number;
  message_type: string;
  subject?: string;
  content: string;
  recipient_email?: string;
  recipient_phone?: string;
  delivery_status: string;
  created_at: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  error_message?: string;
  // Join with customers table
  customers?: {
    first_name: string;
    last_name: string;
    client_email: string;
  };
}

interface ConversationThread {
  customer_id: number;
  customer_name: string;
  customer_email: string;
  latest_message: CommunicationLog;
  message_count: number;
  messages: CommunicationLog[];
  has_unread: boolean;
}

export default function UnifiedInbox() {
  const [conversations, setConversations] = useState<ConversationThread[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationThread | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCommunications();
  }, []);

  const fetchCommunications = async () => {
    try {
      setLoading(true);
      
      // Fetch communications with customer data
      const { data: communications, error: commError } = await supabase
        .from('communications_log')
        .select(`
          *,
          customers!inner(
            first_name,
            last_name,
            client_email
          )
        `)
        .order('created_at', { ascending: false });

      if (commError) throw commError;

      // Group by customer to create conversation threads
      const customerGroups = new Map<number, CommunicationLog[]>();
      
      communications?.forEach(comm => {
        if (!customerGroups.has(comm.customer_id)) {
          customerGroups.set(comm.customer_id, []);
        }
        customerGroups.get(comm.customer_id)!.push(comm);
      });

      // Convert to conversation threads
      const threads: ConversationThread[] = Array.from(customerGroups.entries()).map(([customerId, messages]) => {
        const sortedMessages = messages.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const latestMessage = sortedMessages[0];
        const customer = latestMessage.customers;

        return {
          customer_id: customerId,
          customer_name: `${customer?.first_name} ${customer?.last_name}`.trim(),
          customer_email: customer?.client_email || '',
          latest_message: latestMessage,
          message_count: messages.length,
          messages: sortedMessages,
          has_unread: messages.some(m => m.delivery_status === 'delivered' && !m.read_at)
        };
      });

      // Sort threads by latest message time
      threads.sort((a, b) => 
        new Date(b.latest_message.created_at).getTime() - new Date(a.latest_message.created_at).getTime()
      );

      setConversations(threads);
    } catch (err) {
      console.error('Error fetching communications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load inbox');
    } finally {
      setLoading(false);
    }
  };

  const getDeliveryStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'sent':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
      case 'queued':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'error':
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'whatsapp':
      case 'whatsapp_twilio':
        return <MessageSquare className="w-4 h-4" />;
      case 'sms':
        return <Phone className="w-4 h-4" />;
      default:
        return <Mail className="w-4 h-4" />;
    }
  };

  const formatMessagePreview = (message: CommunicationLog) => {
    if (message.subject && message.message_type === 'email') {
      return message.subject;
    }
    return message.content.substring(0, 100) + (message.content.length > 100 ? '...' : '');
  };

  const filteredConversations = conversations.filter(conv =>
    conv.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.customer_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-destructive text-lg font-medium mb-2">Error loading inbox</div>
        <div className="text-muted-foreground">{error}</div>
        <Button onClick={fetchCommunications} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Unified Inbox</h2>
          <p className="text-muted-foreground">All email and WhatsApp conversations in one place</p>
        </div>
        <Button onClick={fetchCommunications} variant="outline">
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Conversation List */}
        <div className="lg:col-span-1 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Conversations */}
          <ScrollArea className="h-[520px]">
            <div className="space-y-2">
              {filteredConversations.map((conversation) => (
                <Card
                  key={conversation.customer_id}
                  className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedConversation?.customer_id === conversation.customer_id 
                      ? 'border-primary bg-muted/30' 
                      : ''
                  }`}
                  onClick={() => setSelectedConversation(conversation)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{conversation.customer_name}</span>
                        {conversation.has_unread && (
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {getMessageTypeIcon(conversation.latest_message.message_type)}
                        {getDeliveryStatusIcon(conversation.latest_message.delivery_status)}
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground mb-2">
                      {conversation.customer_email}
                    </div>
                    
                    <div className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {formatMessagePreview(conversation.latest_message)}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        {conversation.message_count} message{conversation.message_count !== 1 ? 's' : ''}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(conversation.latest_message.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Message Thread */}
        <div className="lg:col-span-2">
          {selectedConversation ? (
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>{selectedConversation.customer_name}</span>
                  <Badge variant="outline">{selectedConversation.message_count} messages</Badge>
                </CardTitle>
                <CardDescription>{selectedConversation.customer_email}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <ScrollArea className="h-[440px]">
                  <div className="space-y-4">
                    {selectedConversation.messages.map((message) => (
                      <div key={message.id} className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {getMessageTypeIcon(message.message_type)}
                          <span className="capitalize">{message.message_type}</span>
                          <Separator orientation="vertical" className="h-3" />
                          <span>{format(new Date(message.created_at), 'MMM d, yyyy h:mm a')}</span>
                          <Separator orientation="vertical" className="h-3" />
                          {getDeliveryStatusIcon(message.delivery_status)}
                          <span className="capitalize">{message.delivery_status}</span>
                        </div>
                        
                        <Card className="bg-muted/20">
                          <CardContent className="p-4">
                            {message.subject && (
                              <div className="font-medium mb-2">{message.subject}</div>
                            )}
                            <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                            
                            {message.error_message && (
                              <div className="mt-2 p-2 bg-destructive/10 text-destructive text-xs rounded">
                                Error: {message.error_message}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Select a conversation</h3>
                <p className="text-muted-foreground">
                  Choose a conversation from the left to view the message thread
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}