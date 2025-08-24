import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Mail, 
  MessageSquare, 
  Phone, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Reply,
  Forward,
  Archive,
  Star,
  Filter,
  RefreshCw,
  Users
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "@/hooks/use-toast";

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
  twilio_message_sid?: string;
  customers?: {
    first_name: string;
    last_name: string;
    client_email: string;
    phone_number?: string;
  };
}

interface ConversationThread {
  customer_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  latest_message: CommunicationLog;
  message_count: number;
  messages: CommunicationLog[];
  has_unread: boolean;
  has_inbound: boolean;
  last_inbound_at?: string;
}

export default function EnhancedUnifiedInbox() {
  const [conversations, setConversations] = useState<ConversationThread[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationThread | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchCommunications = useCallback(async () => {
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
            client_email,
            phone_number
          )
        `)
        .order('created_at', { ascending: false })
        .limit(1000); // Limit for performance

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
        
        const inboundMessages = messages.filter(m => m.message_type.includes('inbound'));
        const hasInbound = inboundMessages.length > 0;
        const lastInbound = hasInbound ? inboundMessages[0].created_at : undefined;

        return {
          customer_id: customerId,
          customer_name: `${customer?.first_name} ${customer?.last_name}`.trim(),
          customer_email: customer?.client_email || '',
          customer_phone: customer?.phone_number,
          latest_message: latestMessage,
          message_count: messages.length,
          messages: sortedMessages,
          has_unread: messages.some(m => 
            m.delivery_status === 'delivered' && !m.read_at && m.message_type.includes('inbound')
          ),
          has_inbound: hasInbound,
          last_inbound_at: lastInbound
        };
      });

      // Sort threads by latest message time (prioritize inbound messages)
      threads.sort((a, b) => {
        // Prioritize conversations with unread inbound messages
        if (a.has_unread && !b.has_unread) return -1;
        if (!a.has_unread && b.has_unread) return 1;
        
        // Then by latest message time
        return new Date(b.latest_message.created_at).getTime() - new Date(a.latest_message.created_at).getTime();
      });

      setConversations(threads);
    } catch (err) {
      console.error('Error fetching communications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load inbox');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshInbox = useCallback(async () => {
    setIsRefreshing(true);
    await fetchCommunications();
    setIsRefreshing(false);
    toast({
      title: "Inbox Refreshed",
      description: "Latest messages loaded",
    });
  }, [fetchCommunications]);

  // Set up real-time subscription
  useEffect(() => {
    fetchCommunications();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('communications_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'communications_log'
        },
        (payload) => {
          console.log('Real-time update:', payload);
          
          // Refresh inbox when there are changes
          if (payload.eventType === 'INSERT') {
            // New message received - refresh immediately
            fetchCommunications();
            
            // Show toast for inbound messages
            if (payload.new?.message_type?.includes('inbound')) {
              toast({
                title: "New Message Received",
                description: `New ${payload.new.message_type.replace('_inbound', '')} from customer`,
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            // Status update - refresh
            fetchCommunications();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCommunications]);

  const markAsRead = async (messageId: number) => {
    try {
      const { error } = await supabase
        .from('communications_log')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId);
        
      if (error) throw error;
      
      // Refresh to update UI
      await fetchCommunications();
    } catch (error) {
      console.error('Error marking as read:', error);
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
      case 'received':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
      case 'email_inbound':
        return <Mail className={`w-4 h-4 ${type.includes('inbound') ? 'text-blue-500' : 'text-gray-600'}`} />;
      case 'whatsapp':
      case 'whatsapp_twilio':
      case 'whatsapp_inbound':
        return <MessageSquare className={`w-4 h-4 ${type.includes('inbound') ? 'text-blue-500' : 'text-green-600'}`} />;
      case 'sms':
        return <Phone className="w-4 h-4 text-purple-600" />;
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

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conv.customer_email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    switch (filterType) {
      case 'unread':
        return conv.has_unread;
      case 'inbound':
        return conv.has_inbound;
      case 'email':
        return conv.latest_message.message_type.includes('email');
      case 'whatsapp':
        return conv.latest_message.message_type.includes('whatsapp');
      default:
        return true;
    }
  });

  const getConversationStats = () => {
    return {
      total: conversations.length,
      unread: conversations.filter(c => c.has_unread).length,
      inbound: conversations.filter(c => c.has_inbound).length,
      recent: conversations.filter(c => {
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return new Date(c.latest_message.created_at) > dayAgo;
      }).length
    };
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-20 bg-muted rounded"></div>
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
        <div className="text-muted-foreground mb-4">{error}</div>
        <Button onClick={fetchCommunications} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const stats = getConversationStats();

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Enhanced Inbox</h2>
          <p className="text-muted-foreground">Unified email and WhatsApp conversations with real-time sync</p>
        </div>
        <Button onClick={refreshInbox} variant="outline" disabled={isRefreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Syncing...' : 'Refresh'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total Conversations</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-blue-500" />
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.unread}</div>
                <div className="text-xs text-muted-foreground">Unread Messages</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Reply className="w-4 h-4 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.inbound}</div>
                <div className="text-xs text-muted-foreground">With Replies</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <div>
                <div className="text-2xl font-bold text-orange-600">{stats.recent}</div>
                <div className="text-xs text-muted-foreground">Last 24 Hours</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[700px]">
        {/* Conversation List */}
        <div className="lg:col-span-1 space-y-4">
          {/* Search & Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Tabs value={filterType} onValueChange={setFilterType}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                <TabsTrigger value="unread" className="text-xs">Unread</TabsTrigger>
                <TabsTrigger value="inbound" className="text-xs">Replies</TabsTrigger>
                <TabsTrigger value="email" className="text-xs">Email</TabsTrigger>
                <TabsTrigger value="whatsapp" className="text-xs">WhatsApp</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Conversations */}
          <ScrollArea className="h-[580px]">
            <div className="space-y-2">
              {filteredConversations.map((conversation) => (
                <Card
                  key={conversation.customer_id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedConversation?.customer_id === conversation.customer_id 
                      ? 'ring-2 ring-primary bg-primary/5' 
                      : ''
                  } ${conversation.has_unread ? 'border-l-4 border-l-blue-500' : ''}`}
                  onClick={() => setSelectedConversation(conversation)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium text-sm ${conversation.has_unread ? 'font-bold' : ''}`}>
                          {conversation.customer_name}
                        </span>
                        {conversation.has_unread && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                        {conversation.has_inbound && (
                          <Badge variant="outline" className="text-xs">
                            <Reply className="w-3 h-3 mr-1" />
                            Reply
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {getMessageTypeIcon(conversation.latest_message.message_type)}
                        {getDeliveryStatusIcon(conversation.latest_message.delivery_status)}
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground mb-2">
                      {conversation.customer_email}
                      {conversation.customer_phone && (
                        <span className="ml-2">• {conversation.customer_phone}</span>
                      )}
                    </div>
                    
                    <div className={`text-sm text-muted-foreground line-clamp-2 mb-2 ${
                      conversation.has_unread ? 'text-foreground' : ''
                    }`}>
                      <strong className="text-xs uppercase text-muted-foreground">
                        {conversation.latest_message.message_type.includes('inbound') ? '← ' : '→ '}
                      </strong>
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
              
              {filteredConversations.length === 0 && (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No conversations found</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Message Thread */}
        <div className="lg:col-span-2">
          {selectedConversation ? (
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <span>{selectedConversation.customer_name}</span>
                      <Badge variant="outline">{selectedConversation.message_count} messages</Badge>
                      {selectedConversation.has_unread && (
                        <Badge variant="default" className="bg-blue-500">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Unread
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4">
                      <span>{selectedConversation.customer_email}</span>
                      {selectedConversation.customer_phone && (
                        <>
                          <Separator orientation="vertical" className="h-3" />
                          <span>{selectedConversation.customer_phone}</span>
                        </>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedConversation.has_inbound && (
                      <Button size="sm" variant="outline">
                        <Reply className="w-4 h-4 mr-2" />
                        Reply
                      </Button>
                    )}
                    <Button size="sm" variant="ghost">
                      <Archive className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0">
                <ScrollArea className="h-[500px] px-6">
                  <div className="space-y-4 pb-4">
                    {selectedConversation.messages.map((message) => (
                      <div key={message.id} className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            {getMessageTypeIcon(message.message_type)}
                            <span className="capitalize font-medium">
                              {message.message_type.includes('inbound') ? 'Inbound ' : 'Outbound '}
                              {message.message_type.replace('_inbound', '').replace('_twilio', '')}
                            </span>
                          </div>
                          <Separator orientation="vertical" className="h-3" />
                          <span>{format(new Date(message.created_at), 'MMM d, yyyy h:mm a')}</span>
                          <Separator orientation="vertical" className="h-3" />
                          <div className="flex items-center gap-1">
                            {getDeliveryStatusIcon(message.delivery_status)}
                            <span className="capitalize">{message.delivery_status}</span>
                          </div>
                          {message.message_type.includes('inbound') && !message.read_at && (
                            <>
                              <Separator orientation="vertical" className="h-3" />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-auto p-0 text-xs text-blue-600 hover:text-blue-700"
                                onClick={() => markAsRead(message.id)}
                              >
                                Mark as read
                              </Button>
                            </>
                          )}
                        </div>
                        
                        <Card className={`${
                          message.message_type.includes('inbound') 
                            ? 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800' 
                            : 'bg-muted/20'
                        }`}>
                          <CardContent className="p-4">
                            {message.subject && (
                              <div className="font-medium mb-2 text-sm">{message.subject}</div>
                            )}
                            <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                            
                            {message.error_message && (
                              <div className="mt-3 p-2 bg-destructive/10 text-destructive text-xs rounded">
                                <strong>Error:</strong> {message.error_message}
                              </div>
                            )}
                            
                            {message.twilio_message_sid && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                Twilio ID: {message.twilio_message_sid}
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
                <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Select a conversation</h3>
                <p className="text-muted-foreground mb-4">
                  Choose a conversation from the left to view the message thread
                </p>
                <p className="text-sm text-muted-foreground">
                  💡 This inbox syncs in real-time with your actual email and WhatsApp conversations
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}